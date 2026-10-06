/**
 * gearMenus 单测——管理器三处齿轮**「哪一项出、哪一项不出」**的判据。
 *
 * ## 为什么这几条值得测
 *
 * 菜单条目**没有置灰态**（`ContextMenu` 的 items 只能「有/无」）⇒ 「这个动作此刻不可用」的表达方式
 * 就是**不出这一项**。判据写反的表现是：点了一条什么都不会发生的项（用户报「齿轮空转」），
 * 或者反过来——该给的动作被藏起来（用户报「找不到恢复自动」）。两种都不报错。
 *
 * 另有一处硬口径在这条测试里钉死：**卡体行 ⛔ 不重复给「恢复自动」**——行尾下拉已经是那个入口，
 * 双入口＝同一动作的第二处真相（C4 定案原话）。
 *
 * 纯逻辑：`t` 是替身（只回填插值，⛔ 不加载真字典），三个模型件按最小字段手工构造。
 */

import { describe, expect, it } from "vitest";
import type { CardModel, ContestedRowModel, ExtRowModel } from "@linkdesk/ui";
import { SHELL_COMMANDS } from "@linkdesk/plugin-sdk/shell-commands";
import { makeGearMenus } from "../../../views/file-associations-manager/gearMenus";
import { FILE_ASSOC_GEAR_COMMANDS } from "../../../views/file-associations-manager/fileAssociationsGearTarget";

/** t 替身——把 `{{k}}` 就地回填，于是断言可以直接读「条目文案里的数字对不对」 */
const t = (key: string, options: Record<string, unknown> = {}) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(options[k] ?? ""));

const contestedRow = (over: Partial<ContestedRowModel> = {}): ContestedRowModel => ({
  exts: ["a", "b"],
  groupExtsCount: 2,
  handlers: [],
  effectiveName: "甲",
  source: "auto",
  value: "",
  overrideCount: 0,
  handlerCount: 2,
  ...over,
});

const card = (over: Partial<CardModel> = {}): CardModel => ({
  pluginId: "plug-x",
  name: "某插件",
  rows: [],
  declaredCount: 0,
  contestedCount: 0,
  holdCount: 0,
  overrideExts: [],
  matchedSearch: false,
  ...over,
});

const row = (over: Partial<ExtRowModel> = {}): ExtRowModel => ({
  ext: "py",
  key: ".py",
  state: "auto",
  dangling: false,
  value: "",
  options: [],
  ...over,
});

describe("竞争行齿轮", () => {
  it("零覆盖 ⇒ **不出**「恢复自动」（点了什么也不会发生）；探活在册 ⇒ 仍给「打开方式…」", () => {
    const items = makeGearMenus({ t, openWithAvailable: true }).contested(contestedRow());
    expect(items.map((i) => i.command)).toEqual([SHELL_COMMANDS.openWith]);
    expect(items[0].label).toBe("打开方式…（.a）");
    expect(items[0].commandArgs).toEqual([{ ext: "a" }]);
  });

  it("有覆盖 ⇒ 出「恢复自动」，载荷＝整格成员数组（形状见 `fileAssociationsGearTarget`）", () => {
    const items = makeGearMenus({ t, openWithAvailable: false }).contested(
      contestedRow({ exts: ["a", "b", "c"], overrideCount: 1 }),
    );
    expect(items).toHaveLength(1);
    expect(items[0].command).toBe(FILE_ASSOC_GEAR_COMMANDS.clearRow);
    expect(items[0].label).toBe("恢复自动（本格 3 类）");
    expect(items[0].commandArgs).toEqual([["a", "b", "c"]]);
  });

  it("宿主命令不在册（E39 探活假）⇒ 「打开方式…」整条不出现——⛔ 不给点了没反应的项", () => {
    const items = makeGearMenus({ t, openWithAvailable: false }).contested(
      contestedRow({ overrideCount: 1 }),
    );
    expect(items.map((i) => i.command)).toEqual([FILE_ASSOC_GEAR_COMMANDS.clearRow]);
  });
});

describe("卡头齿轮", () => {
  it("「复制插件 ID」恒在（没有覆盖也总有 id 可复制），「清除」看 overrideExts", () => {
    const menus = makeGearMenus({ t, openWithAvailable: false });
    expect(menus.card(card()).map((i) => i.command)).toEqual([
      FILE_ASSOC_GEAR_COMMANDS.copyPluginId,
    ]);
    const withOverrides = menus.card(card({ overrideExts: ["a", "b"] }));
    expect(withOverrides.map((i) => i.command)).toEqual([
      FILE_ASSOC_GEAR_COMMANDS.clearCard,
      FILE_ASSOC_GEAR_COMMANDS.copyPluginId,
    ]);
    expect(withOverrides[0].label).toBe("清除相关默认覆盖（2 类）");
  });

  it("卡头两项目**不带** commandArgs——PluginCard 的齿轮固定送 `context = {pluginId}`", () => {
    const items = makeGearMenus({ t, openWithAvailable: false }).card(card({ overrideExts: ["a"] }));
    for (const item of items) expect(item.commandArgs).toBeUndefined();
  });
});

describe("卡体行齿轮（C4）", () => {
  it("只给「打开方式…（.ext）」——⛔ 不重复给「恢复自动」（行尾下拉已是那个入口）", () => {
    const items = makeGearMenus({ t, openWithAvailable: true }).cardRow(row());
    expect(items.map((i) => i.command)).toEqual([SHELL_COMMANDS.openWith]);
    expect(items[0].label).toBe("打开方式…（.py）");
  });

  it("探活假 ⇒ 空数组（共享件对空数组＝不出齿轮）", () => {
    expect(makeGearMenus({ t, openWithAvailable: false }).cardRow(row())).toEqual([]);
  });
});
