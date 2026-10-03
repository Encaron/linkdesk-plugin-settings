/**
 * renderControl **伴生件**接线测试——设置行案 2.2（2026-10-04 · 伴生声明正交化）。
 *
 * 钉的是「声明字段 → 渲染出来的主/伴结构」这条接线（不是判据本身）：
 *   · 两伴生字段都不声明 ⇒ 原样单控件（**零回归**）
 *   · `uiHint`/`type` 主控件 ＋ `statusCommand`/`actionCommand` ⇒ `[主控件][伴生…]`
 *   · `renderHint:"action"`（主件就是按钮）＋ `statusCommand` ⇒ `[按钮][只读]`，⛔ 按钮只画一次
 *   · `renderHint:"readonly"`（主件就是只读）＋ `actionCommand` ⇒ `[只读][按钮]`
 *   · E1 互斥显示：`suppressValueLabel` 真 ⇒ Slider 收起自带值标签（让位行尾生效徽标）
 *
 * 技法：`t` 用恒等函数（文案＝描述原文，断言好写）；`renderControl` 是**位置参数**门面，
 * 直接调用后 `render(<>{node}</>)` 让 React 真正跑子件（只读件/滑杆的 hook 才有环境）。
 * 只读落哪一支由 `@linkdesk/ui` 版本决定（本仓依赖停在现装壳那版 ⇒ 走本地 fallback）——
 * 两条路都是同一个 `.ldk-readonly-text` 渲染体，故断言只看**伴生外套**与**按钮数**。
 */
import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import renderControl from "../../../../views/SettingsView/renderControl";
import type { ConfigProperty } from "../../../../views/SettingsView/types";

const t = (k: string) => k;
const noop = () => {};

/** 画一个配置项的控制区（位置参数与 renderControl 门面一致） */
function draw(prop: ConfigProperty, value: unknown = "", suppressValueLabel?: boolean) {
  return render(<>{renderControl(prop, value, noop, t, undefined, undefined, suppressValueLabel)}</>);
}

describe("renderControl 伴生件（设置行案 2.2）", () => {
  it("两伴生字段都不声明 ⇒ 单控件、零伴生外套（零回归）", () => {
    const { container } = draw({ type: "boolean", description: "开关" }, false);
    expect(container.querySelector(".ldk-toggle")).toBeTruthy();
    expect(container.querySelectorAll(".settings-row-companion")).toHaveLength(0);
  });

  it("主控件 ＋ statusCommand ⇒ [开关][伴生只读]（伴生外套里没有按钮）", () => {
    const { container } = draw({ type: "boolean", description: "开关", statusCommand: "x.status" }, false);
    expect(container.querySelector(".ldk-toggle")).toBeTruthy();
    expect(container.querySelectorAll(".settings-row-companion")).toHaveLength(1);
    expect(container.querySelector(".settings-row-companion button")).toBeNull();
  });

  it("主控件 ＋ actionCommand ⇒ [开关][伴生按钮]，文案 = description", () => {
    const { container } = draw({ type: "boolean", description: "打开详情", actionCommand: "x.open" }, false);
    const btns = container.querySelectorAll(".settings-row-companion button");
    expect(btns).toHaveLength(1);
    expect(btns[0].textContent).toBe("打开详情");
  });

  it("action 主件 ＋ statusCommand（缓存目录合并形态）⇒ [按钮][伴生只读]，按钮只画一次", () => {
    const { container } = draw({
      type: "string",
      description: "打开缓存目录",
      renderHint: "action",
      actionCommand: "a.open",
      statusCommand: "a.status",
    });
    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(container.querySelector(".settings-row-companion button")).toBeNull();
    expect(container.querySelectorAll(".settings-row-companion")).toHaveLength(1);
  });

  it("readonly 主件 ＋ actionCommand ⇒ [只读][伴生按钮]（反向同排，只读主件不重复）", async () => {
    // 只读件是活读数（轮询窗口），空值不占位（ReadOnlyText 行为）⇒ 桩一个命令句柄让它真出文字，
    // 才能在 DOM 里断言「只读在前、伴生按钮在后」这条顺序（本案契约 §1.2 反向形态）。
    (window as unknown as { linkdesk: unknown }).linkdesk = {
      commands: { executeCommand: async () => "C:\\linkdesk\\cache" },
    };
    try {
      const { container } = draw({
        type: "string",
        description: "打开缓存目录",
        renderHint: "readonly",
        statusCommand: "a.status",
        actionCommand: "a.open",
      });
      // 主件是只读（不是按钮）⇒ 全场只有伴生那一个按钮
      expect(container.querySelectorAll("button")).toHaveLength(1);
      const companion = container.querySelector(".settings-row-companion");
      expect(companion).toBeTruthy();
      expect(companion!.querySelector("button")).toBeTruthy();
      await waitFor(() => expect(container.querySelector(".ldk-readonly-text")).toBeTruthy());
      // DOM 序：只读主件在前、伴生按钮在后
      expect(container.firstElementChild!.className).toContain("ldk-readonly-text");
    } finally {
      delete (window as unknown as { linkdesk?: unknown }).linkdesk;
    }
  });

  it("E1：slider ＋ suppressValueLabel 真 ⇒ 收起组件值标签；缺省 ⇒ 照常显示", () => {
    const prop: ConfigProperty = { type: "number", uiHint: "slider", unit: "px", minimum: 0, maximum: 40 };
    expect(draw(prop, 10, true).container.querySelector(".ldk-slider-value")).toBeNull();
    expect(draw(prop, 10, false).container.querySelector(".ldk-slider-value")).toBeTruthy();
  });
});
