/**
 * sharedUi 能力中枢单测（「设置控件-词表正典与共享化」阶段 5.1 · 02 E1 双轨期）。
 *
 * 这一层是**插件发版早于壳**的保险丝——它挂了不会红一格，而是整个设置视图全崩（链接期 SyntaxError）。
 * 故钉四组：
 *   ① 哨兵契约值不变：`__none__` / `followTheme` 跨插件字符串契约，双轨两态下都必须是这两个字面量
 *      （共享正典在取正典、不在用兜底——**值本身不许变**，否则配置值语义当场漂移）
 *   ② 兜底分支：正典里不存在的名字 ⇒ 返回调用方给的兜底值（不抛错、不返回 undefined）
 *   ③ 探测如实反映命名空间：每个能力位与其在 `@linkdesk/ui` 里的真相一一对应
 *      （现装壳 0.2.36 无这些导出 ⇒ 全 false/null ⇒ 走本地件；0.2.37+ 全 true ⇒ 收编）
 *   ④ 状态行句柄语义：字符串照收；非字符串/抛错/无桥 ⇒ null（02 E7 保现值）
 *
 * ⚠️ ③ 写成「与命名空间对账」而非硬编码期望值——这样本仓依赖升到 0.2.37 时测试不会无故翻红。
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import * as UI from "@linkdesk/ui";
import {
  HAS_POLLING_READONLY,
  SHARED_EFFECTIVE_BADGE,
  SHARED_FORMAT_EFFECTIVE_VALUE,
  SHARED_IMAGE_PICKER,
  SHARED_SOURCE_BADGE,
  runStatusCommand,
  sentinel,
} from "../../../views/SettingsView/sharedUi";

const ns = UI as unknown as Record<string, unknown>;

/** 共享 mock 的原始 window.linkdesk（SDK vitest-setup 提供）——每例结束**还原**，别把它删掉留给后续例 */
const ORIGINAL_LINKDESK = (window as unknown as { linkdesk?: unknown }).linkdesk;

afterEach(() => {
  (window as unknown as { linkdesk?: unknown }).linkdesk = ORIGINAL_LINKDESK;
});

describe("① 哨兵契约值", () => {
  it("绝对无 = __none__（双轨两态同值）", () => {
    expect(sentinel("CONFIG_NONE_SENTINEL", "__none__")).toBe("__none__");
  });

  it("混搭跟随主题 = followTheme（双轨两态同值）", () => {
    expect(sentinel("MIX_FOLLOW_THEME_SENTINEL", "followTheme")).toBe("followTheme");
  });
});

describe("② 兜底分支", () => {
  it("正典里没有的名字 ⇒ 返回兜底值", () => {
    expect(sentinel("NO_SUCH_SENTINEL" as "CONFIG_NONE_SENTINEL", "FALLBACK")).toBe("FALLBACK");
  });
});

describe("③ 能力探测与命名空间对账", () => {
  it("轮询只读行能力位 = useStatusPolling 是否可调用", () => {
    expect(HAS_POLLING_READONLY).toBe(typeof ns["useStatusPolling"] === "function");
  });

  it("四个共享件位与命名空间一一对应", () => {
    expect(SHARED_IMAGE_PICKER).toBe(ns["BackgroundImagePicker"] ?? null);
    expect(SHARED_SOURCE_BADGE).toBe(ns["SourceBadge"] ?? null);
    expect(SHARED_EFFECTIVE_BADGE).toBe(ns["EffectiveBadge"] ?? null);
    expect(SHARED_FORMAT_EFFECTIVE_VALUE).toBe(ns["formatEffectiveValue"] ?? null);
  });

  it("缺席态下取件得到 null（不是 undefined、不抛错）——适配层据此走本地件", () => {
    for (const v of [SHARED_IMAGE_PICKER, SHARED_SOURCE_BADGE, SHARED_EFFECTIVE_BADGE]) {
      expect(v === null || typeof v === "function").toBe(true);
    }
  });
});

describe("④ 状态行执行句柄", () => {
  it("字符串读数照收", async () => {
    (window as unknown as { linkdesk: unknown }).linkdesk = {
      commands: { executeCommand: async () => "127.0.0.1:9333" },
    };
    await expect(runStatusCommand("demo.statusLine")).resolves.toBe("127.0.0.1:9333");
  });

  it("非字符串 ⇒ null（不把对象/数字当读数）", async () => {
    (window as unknown as { linkdesk: unknown }).linkdesk = {
      commands: { executeCommand: async () => ({ port: 9333 }) },
    };
    await expect(runStatusCommand("demo.statusLine")).resolves.toBeNull();
  });

  it("抛错 ⇒ null（02 E7 保现值）", async () => {
    (window as unknown as { linkdesk: unknown }).linkdesk = {
      commands: {
        executeCommand: async () => {
          throw new Error("命令不在");
        },
      },
    };
    await expect(runStatusCommand("demo.missing")).resolves.toBeNull();
  });

  it("无桥 ⇒ null（插件在纯浏览器/测试环境下不炸）", async () => {
    delete (window as unknown as { linkdesk?: unknown }).linkdesk;
    await expect(runStatusCommand("demo.statusLine")).resolves.toBeNull();
  });
});
