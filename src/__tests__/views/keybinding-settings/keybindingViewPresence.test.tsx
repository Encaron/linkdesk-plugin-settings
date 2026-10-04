/**
 * 「快捷键页在场」标志的接线测试（2026-10-05 · 件 3 同批修的「齿轮改键缩回左侧栏」）。
 *
 * ## 钉的是哪条线
 *
 * 标志模块本身是三个 byte 的真相，读一眼就知道对不对；真正会**静默坏掉**的是**接线**：
 * `KeybindingSettingsView` 挂载时忘了置真（或卸载时忘了归零）⇒
 * `settings.editKeybinding` 会一直请壳「打开设置页」⇒ 用户点齿轮里的「修改快捷键…」
 * **又被弹回左侧栏**——症状与修之前一模一样，而所有纯逻辑单测仍然全绿。
 *
 * 故这里**真渲染**那只视图（`render` / `unmount`）而不是直接调 `setKeybindingViewMounted`：
 * 只有渲染才走得到「挂载 effect 有没有写进这个模块」。
 *
 * ## 替身
 *
 * `react-i18next` 打桩成恒等 `t`（文案＝中文原文，断言不碰真字典）；`window.linkdesk` 用共享地基
 * 的最小面即可——`useKeybindingRows` / `useKeybindingEditor` 对每个面都是 `?.` 可选链，
 * 数据拉不到就是空表，不影响挂载 effect。`ContextMenu`（`@linkdesk/ui`）初始不渲染（齿轮未开）。
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import KeybindingSettingsView from "../../../views/keybinding-settings/KeybindingSettingsView";
import {
  isKeybindingViewMounted,
  setKeybindingViewMounted,
} from "../../../views/keybinding-settings/keybindingViewPresence";

afterEach(() => {
  setKeybindingViewMounted(false);
  vi.restoreAllMocks();
});

describe("keybindingViewPresence——模块语义", () => {
  it("默认「不在场」（进程起来时谁也没看着快捷键页）", () => {
    setKeybindingViewMounted(false);
    expect(isKeybindingViewMounted()).toBe(false);
  });

  it("置真 / 归零都读得回来（唯一写入口是视图的挂载 effect）", () => {
    setKeybindingViewMounted(true);
    expect(isKeybindingViewMounted()).toBe(true);
    setKeybindingViewMounted(false);
    expect(isKeybindingViewMounted()).toBe(false);
  });
});

describe("接线：视图挂载 / 卸载 ⇔ 在场标志", () => {
  it("🔴 挂载 ⇒ 在场；卸载 ⇒ 不在场（这条断的是「齿轮改键还会不会弹回左侧栏」）", () => {
    setKeybindingViewMounted(false);
    const { unmount } = render(<KeybindingSettingsView />);
    expect(isKeybindingViewMounted()).toBe(true);

    unmount();
    expect(isKeybindingViewMounted()).toBe(false);
  });

  it("重开一次仍是「在场」——标志不是一次性的（切 tab 走卸载/挂载，来回都成立）", () => {
    const first = render(<KeybindingSettingsView />);
    first.unmount();
    expect(isKeybindingViewMounted()).toBe(false);

    const second = render(<KeybindingSettingsView />);
    expect(isKeybindingViewMounted()).toBe(true);
    second.unmount();
    expect(isKeybindingViewMounted()).toBe(false);
  });
});
