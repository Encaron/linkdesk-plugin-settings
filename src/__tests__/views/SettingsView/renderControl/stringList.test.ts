/**
 * splitStringList——stringList 控件的「锁定行 / 可编辑行」切分（E6#150 补测）。
 *
 * 为什么单独立文件：这是「官方源凭任何入口都落不了盘」这条硬约束的执行处（E6#30c），
 * 而它一条断言都没有——写错的表现是**官方源混进存盘数组**（下次存盘写进用户配置，
 * 或页面出现可删的官方行）。三条规则逐条钉：① default 是锁定行；② 身份去重走 urlSourceKey
 * （github 源归 owner/repo、**分支无关**）；③ 非 github 串回精确比较（无身份的串不受影响）。
 */

import { describe, expect, it } from "vitest";
import { splitStringList } from "../../../../views/SettingsView/renderControl/stringList";
import type { ConfigProperty } from "../../../../views/SettingsView/types";

const prop = (defaultValue?: unknown): ConfigProperty => ({ type: "array", default: defaultValue });

const OFFICIAL = "https://github.com/Official/Repo";

describe("splitStringList", () => {
  it("default 非数组 → 无锁定行；value 非数组 → 可编辑行为空（不炸）", () => {
    expect(splitStringList(prop("not-array"), undefined)).toEqual({ locked: [], editable: [] });
    expect(splitStringList(prop(undefined), 42)).toEqual({ locked: [], editable: [] });
  });

  it("锁定行只收 default 里的字符串（非字符串元素滤掉）", () => {
    const { locked } = splitStringList(prop([OFFICIAL, 7, null, { a: 1 }, "  "]), []);
    expect(locked).toEqual([OFFICIAL, "  "]);
  });

  it("value 缺失 → 以 default 为底 ⇒ 全被锁住，可编辑行为空（不回显官方行）", () => {
    expect(splitStringList(prop([OFFICIAL, "https://example.com/a.json"]), undefined)).toEqual({
      locked: [OFFICIAL, "https://example.com/a.json"],
      editable: [],
    });
  });

  it("value 是数组 → 以 value 为底；default 精确形态的行被锁掉", () => {
    const { editable } = splitStringList(prop([OFFICIAL]), [OFFICIAL, "https://example.com/mine.json"]);
    expect(editable).toEqual(["https://example.com/mine.json"]);
  });

  it("🔒 身份去重：官方源的**其他形态**（raw 直链 / 仓库主页 / 任意分支）一并滤除", () => {
    const { editable } = splitStringList(prop([OFFICIAL]), [
      "https://raw.githubusercontent.com/official/repo/main/index.json",
      "https://github.com/official/repo",
      "https://github.com/Official/Repo/tree/HEAD",
      "https://example.com/mine.json",
    ]);

    expect(editable).toEqual(["https://example.com/mine.json"]);
  });

  it("身份比较大小写不敏感（owner/repo 归一）", () => {
    const { editable } = splitStringList(prop(["https://github.com/Official/Repo"]), [
      "https://github.com/OFFICIAL/REPO",
    ]);
    expect(editable).toEqual([]);
  });

  it("非 github 串（无身份）→ 只认精确相等，不做任何归一", () => {
    const { editable } = splitStringList(prop(["https://example.com/a.json"]), [
      "https://example.com/a.json",
      "https://example.com/a.json/", // 只差一个斜杠 = 不同串（无身份 ⇒ 不归一）
      "HTTPS://EXAMPLE.COM/A.JSON", // 大小写不同 = 不同串
    ]);

    expect(editable).toEqual(["https://example.com/a.json/", "HTTPS://EXAMPLE.COM/A.JSON"]);
  });

  it("非字符串元素（数字 / null / 对象）不进可编辑行", () => {
    const { editable } = splitStringList(prop([]), [1, null, {}, ["a"], "https://example.com/ok.json"]);
    expect(editable).toEqual(["https://example.com/ok.json"]);
  });

  it("保序：locked 与 editable 都按原数组顺序", () => {
    const out = splitStringList(prop(["b", "a"]), ["c", "a", "b", "d"]);
    expect(out.locked).toEqual(["b", "a"]);
    expect(out.editable).toEqual(["c", "d"]);
  });

  it("default 空数组 → 无锁定行，value 全留（第三方 stringList 键的常态）", () => {
    expect(splitStringList(prop([]), ["https://a.example/1", "https://b.example/2"]).editable).toEqual([
      "https://a.example/1",
      "https://b.example/2",
    ]);
  });

  it("value 空数组 → 可编辑行为空（用户把作者源全删了）", () => {
    expect(splitStringList(prop([OFFICIAL]), []).editable).toEqual([]);
  });
});
