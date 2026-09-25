/** @vitest-environment jsdom */
/**
 * useSettingRowBadges——SettingRow 行尾两个徽标的取数/组装层（E6#150 补测）。
 *
 * 为什么单独立文件：两个派生函数（`deriveSourceBadge` / `resolveEffectiveBadge`）**各自已有单测**，
 * 但它们与「读哪两个 IPC 键、传哪两个槽的覆盖值/基准值、组装成什么形状」的接线一条都没测——
 * 接线的坏法是「徽标一直不出现」或「第三方键也去订阅」（源码注释点名的「无 sourceKey 时空 key
 * 退化为 depValue 同款无订阅污染」）。本文件钉的就是这条接线，派生规则本身不重复测。
 *
 * 技法：`vi.mock` 掉 `useConfigurationValueIpc`（本插件自己那个只读 hook）⇒ 本层零 IPC、零真壳。
 */

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const h = vi.hoisted(() => ({
  /** key → 当前值（替身：真 hook 的「异步拉初值 + 订阅 onChange」在这里退化成一张只读表） */
  values: new Map<string, unknown>(),
  requested: [] as string[],
}));

vi.mock("../../../../views/hooks/useConfigurationValueIpc", () => ({
  useConfigurationValueIpc: (key: string) => {
    h.requested.push(key);
    return h.values.get(key);
  },
  useConfigurationValuesIpc: () => ({}),
}));

import { useSettingRowBadges } from "../../../../views/SettingsView/SettingRow/useSettingRowBadges";
import type { ConfigProperty } from "../../../../views/SettingsView/types";

const MODE_KEY = "app.appearanceMode";

function render(
  prop: ConfigProperty | undefined,
  opts: {
    configKey?: string;
    userOverrides?: Record<string, unknown>;
    baselineSeeds?: Record<string, unknown>;
    effectiveTokens?: Record<string, string>;
    mode?: unknown;
    sourceValue?: unknown;
  } = {},
) {
  const configKey = opts.configKey ?? "app.mixBackground";
  h.requested.length = 0; // 每例重置观测（模块级替身，不重置会跨例累积）
  h.values.clear();
  h.values.set(MODE_KEY, opts.mode);
  if (prop?.sourceKey) h.values.set(prop.sourceKey, opts.sourceValue);
  return renderHook(() =>
    useSettingRowBadges({
      configKey,
      prop,
      userOverrides: opts.userOverrides ?? {},
      baselineSeeds: opts.baselineSeeds ?? {},
      effectiveTokens: opts.effectiveTokens ?? {},
    }),
  ).result.current;
}

describe("useSettingRowBadges · 来源徽标接线", () => {
  it("无 sourceKey（第三方键）→ badge null，且**仍只订阅模式键 + 空 key**（不读别的键）", () => {
    const out = render({ type: "string" });

    expect(out.badge).toBeNull();
    expect(h.requested).toEqual([MODE_KEY, ""]);
  });

  it("有 sourceKey → 订阅模式键 + 该 sourceKey（域来源键）", () => {
    render({ sourceKey: "app.mixBackground" }, { mode: "followTheme", sourceValue: "followTheme" });

    expect(h.requested).toEqual([MODE_KEY, "app.mixBackground"]);
  });

  it("用户覆盖偏离基准 → ✏️ user", () => {
    const out = render(
      { sourceKey: "app.mixBackground" },
      {
        configKey: "app.mixBackground",
        userOverrides: { "app.mixBackground": "linkdesk-userdata://mine.png" },
        baselineSeeds: { "app.mixBackground": "linkdesk-userdata://theme.png" },
      },
    );

    expect(out.badge).toBe("user");
  });

  it("无覆盖 + 混搭生效（mode=custom 且域来源非 followTheme）→ 🔀 mix", () => {
    const out = render({ sourceKey: "app.mixBackground" }, { mode: "custom", sourceValue: "app.mixFont" });

    expect(out.badge).toBe("mix");
  });

  it("无覆盖 + 跟随主题 → 🎨 theme（徽标由 SettingRow 按 user/mix 渲染，这里只保证派生不撒谎）", () => {
    const out = render({ sourceKey: "app.mixBackground" }, { mode: "followTheme", sourceValue: "followTheme" });

    expect(out.badge).toBe("theme");
  });

  it("播种态（覆盖值 === 基准种子）算**未修改** → theme，不是 user（E5.8#88 的核心）", () => {
    const out = render(
      { sourceKey: "app.mixBackground" },
      {
        configKey: "app.mixBackground",
        userOverrides: { "app.mixBackground": 8 },
        baselineSeeds: { "app.mixBackground": 8 },
      },
    );

    expect(out.badge).toBe("theme");
  });
});

describe("useSettingRowBadges · 跟随主题生效值徽标接线", () => {
  it("无 effectiveToken → 恒 null（第三方键零侵入）", () => {
    const out = render({ sourceKey: "app.mixBackground" }, { effectiveTokens: { "x.y": "12px" } });

    expect(out.effectiveBadge).toBeNull();
  });

  it("有 effectiveToken + 跟随主题 → 取生效 token 值并组装 {tokenKey, value, label}", () => {
    const out = render(
      { effectiveToken: "radius.zone" },
      { effectiveTokens: { "radius.zone": "8px" } },
    );

    expect(out.effectiveBadge).toEqual({ tokenKey: "radius.zone", value: "8px", label: "8px" });
  });

  it("色值 → 连 color 一起给（formatEffectiveValue 的合并生效，不是只拼 label）", () => {
    const out = render({ effectiveToken: "color.zone" }, { effectiveTokens: { "color.zone": "#1a2b3c" } });

    expect(out.effectiveBadge).toEqual({ tokenKey: "color.zone", value: "#1a2b3c", label: "#1a2b3c", color: "#1a2b3c" });
  });

  it("字体栈 → label 截首族（徽标不显整条栈）", () => {
    const out = render(
      { effectiveToken: "font.ui" },
      { effectiveTokens: { "font.ui": '"Songti SC", serif' } },
    );

    expect(out.effectiveBadge?.label).toBe("Songti SC");
  });

  it("用户改过（覆盖值偏离基准）→ 生效值徽标 null（已显 ✏️，不重复）", () => {
    const out = render(
      { effectiveToken: "font.ui" },
      {
        configKey: "app.fontFamily",
        userOverrides: { "app.fontFamily": "monospace" },
        baselineSeeds: { "app.fontFamily": "" },
        effectiveTokens: { "font.ui": "system-ui" },
      },
    );

    expect(out.effectiveBadge).toBeNull();
  });

  it("token 缺 / 空串 / transparent 哨兵 → 均不显（无实际生效值可显）", () => {
    const prop: ConfigProperty = { effectiveToken: "radius.zone" };

    expect(render(prop, { effectiveTokens: {} }).effectiveBadge).toBeNull();
    expect(render(prop, { effectiveTokens: { "radius.zone": "" } }).effectiveBadge).toBeNull();
    expect(render(prop, { effectiveTokens: { "radius.zone": "transparent" } }).effectiveBadge).toBeNull();
  });

  it("两个徽标同一次调用各自独立——来源徽标显 ✏️ 时生效值徽标已 null，反之亦然", () => {
    const out = render(
      { sourceKey: "app.mixBackground", effectiveToken: "color.zone" },
      {
        configKey: "app.mixBackground",
        mode: "followTheme",
        sourceValue: "followTheme",
        effectiveTokens: { "color.zone": "rgba(0,0,0,.5)" },
      },
    );

    expect(out.badge).toBe("theme");
    expect(out.effectiveBadge).toEqual({
      tokenKey: "color.zone",
      value: "rgba(0,0,0,.5)",
      label: "rgba(0,0,0,.5)",
      color: "rgba(0,0,0,.5)",
    });
  });
});
