/**
 * `descHintAttrs` 单测——设置行说明文字的悬停提示（揭示类）。
 *
 * 钉两条判据：延时必须是 `"0"`（揭示类要立刻出，别退回 120ms 默认值）；空文案零属性。
 */
import { describe, expect, it } from "vitest";
import { descHintAttrs } from "../../../views/SettingsView/SettingRow/descHint";

describe("设置行说明的悬停提示属性（揭示类）", () => {
  it("非空文案 ⇒ data-hint = 原文，且延时为 0（看全被截断的字不该等）", () => {
    expect(descHintAttrs("商店拉取哪些目录。官方目录内置；添加作者仓库 URL 即可发现该作者的插件。")).toEqual({
      "data-hint": "商店拉取哪些目录。官方目录内置；添加作者仓库 URL 即可发现该作者的插件。",
      "data-hint-delay": "0",
    });
  });

  it("空文案 / 纯空白 ⇒ 零属性（负控：不挂空 data-hint）", () => {
    expect(descHintAttrs("")).toEqual({});
    expect(descHintAttrs("   ")).toEqual({});
  });

  it("文案逐字透传（不裁尾、不折行、不加省略号）", () => {
    const long = "A".repeat(300);
    expect(descHintAttrs(long)["data-hint"]).toBe(long);
  });
});
