/**
 * 动作按钮置灰判据（M4 AI#38.14 实机暴露的回归）——settings 仓正典：
 * 声明里**没有** actionDisabledAll 时，按钮必须**可点**。
 */
import { describe, expect, it } from "vitest";
import { isActionDisabled } from "../../../views/SettingsView/SettingRow/actionDisabled";

describe("isActionDisabled", () => {
  it("没声明 = 永不置灰（空数组同理）", () => {
    expect(isActionDisabled(undefined, {})).toBe(false);
    expect(isActionDisabled([], { a: 1 })).toBe(false);
  });

  it("一条条件：命中才置灰，缺值不命中", () => {
    const cond = [{ key: "mix.a", value: "followTheme" }];
    expect(isActionDisabled(cond, { "mix.a": "followTheme" })).toBe(true);
    expect(isActionDisabled(cond, { "mix.a": "custom" })).toBe(false);
    expect(isActionDisabled(cond, {})).toBe(false);
  });

  it("多条条件：全命中才置灰（任一未命中即可点）", () => {
    const cond = [
      { key: "mix.a", value: "followTheme" },
      { key: "mix.b", value: "followTheme" },
    ];
    expect(isActionDisabled(cond, { "mix.a": "followTheme", "mix.b": "followTheme" })).toBe(true);
    expect(isActionDisabled(cond, { "mix.a": "followTheme", "mix.b": "custom" })).toBe(false);
  });

  it("严格相等：不做真值/字符串宽容（值与存储值同型）", () => {
    expect(isActionDisabled([{ key: "k", value: false }], { k: 0 })).toBe(false);
    expect(isActionDisabled([{ key: "k", value: false }], { k: false })).toBe(true);
  });
});
