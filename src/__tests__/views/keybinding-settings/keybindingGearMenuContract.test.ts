/**
 * keybindingGearMenuContract——菜单声明（`plugin.json`）与行身份（`keybindingGearContext`）的字段契约。
 *
 * ## 为什么这条测试必须存在
 *
 * 菜单项的 `when` 由**壳侧** `ContextKeyService._readKey` 求值，而它是**裸属性查表**：
 * `if (overrides && key in overrides) return overrides[key]`——表达式里的标识符直接当属性名用，
 * 查不到就退回全局 state（那里没有这些「行局部」键）⇒ **求值恒 false、菜单项静默不显示**。
 * 于是「`when` 里写的名字」与「context 对象的字段名」必须逐字相同，而这两处一处住 JSON、
 * 一处住 TS——**类型系统连不起来**，门禁也不求值 `when`（ci-verify 只查声明自洽）。
 *
 * 2026-10-05 件 2 首版正是栽在这里：声明写 `keybindingHasKey` / `keybindingIsUser`，
 * 行身份却叫 `hasKey`／压根没有 isUser ⇒ 三条门控项（复制快捷键 / 复制为 JSON / 重置为默认）
 * 一个都不出（其余三条常显项照常）——实机看着像「功能没做完」。这条测试就是那次事故的回归锁。
 *
 * ## 判据
 *
 * 1. 菜单里每个 `when` 标识符都是行身份的属性名（`in` 判定 = `_readKey` 的真实条件）；
 * 2. `KEYBINDING_GEAR_WHEN` 的三串与 `plugin.json` 实际用的一致（常量不许漂）；
 * 3. 七项的命令都指向本插件自己声明的命令（「修改快捷键…」复用既有 `settings.editKeybinding`）；
 * 4. 常显三项无 `when`、门控四项有 `when`，且组序非降（`0_edit` → `1_copy` → `9_reset`）。
 *
 * ⚠️ 1.0.34 起 `keybindingGearContext` **多一枚必填实参**（`canClear`：壳能力位）——
 * 测试里一律显式传 `true`（「这个壳支持清空」），⭐ 顺手把「漏传就编译不过」这条编译期护栏
 * 钉在测试里：与上一次「`when` 名字对不上却静默跑通」的事故同类，只是这次让编译器先喊。
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KEYBINDING_GEAR_COMMANDS,
  KEYBINDING_GEAR_WHEN,
  KEYBINDING_ITEM_GEAR_MENU,
  NO_KEY,
  keybindingGearContext,
} from "../../../views/keybinding-settings/keybindingGearTarget";
import type { KeybindingRow } from "../../../views/keybinding-settings/types";

interface MenuItem {
  command: string;
  group?: string;
  when?: string;
  label?: string;
}

// ⚠️ 不走 `new URL(..., import.meta.url)`：jsdom 的 `import.meta.url` 是 `http://` 而非 `file://`
//    （实测报 `TypeError: The URL must be of scheme file`）。vitest 的 cwd = 仓根，故按 cwd 定位清单。
const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "plugin.json"), "utf8")
) as { contributes: { menus: Record<string, MenuItem[]> } };

const items: MenuItem[] = manifest.contributes.menus[KEYBINDING_ITEM_GEAR_MENU] ?? [];

/** 三种代表性行：内置有绑定 / 用户覆盖（带 when）/ 无绑定 */
const rows: KeybindingRow[] = [
  { command: "workbench.action.selectLanguage", title: "选择语言", key: "ctrl+k ctrl+l", source: "builtin" },
  { command: "editor.action.rename", title: "重命名", key: "F2", source: "user", when: "resourceIsFile" },
  { command: "workbench.action.toggleSidebar", title: "开关侧边栏", key: NO_KEY, source: "builtin" },
];

/** `when` 里的标识符——本菜单的 when 都是裸键名（不含字面量与比较），故正则取词即全部 */
const identifiersOf = (expr: string): string[] =>
  (expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).filter(id => id !== "true" && id !== "false");

describe("菜单声明 ↔ 行身份：字段名契约", () => {
  it("菜单槽读得到（槽名写错 ⇒ 空数组——后面几条会集体失效，不是假绿）", () => {
    expect(KEYBINDING_ITEM_GEAR_MENU).toBe("keybindingItemGear");
    expect(items.length).toBe(7);
  });

  it("每个 when 标识符都是行身份的属性名（🔴 `_readKey` 是 `key in overrides` 裸查表）", () => {
    const guarded = items.filter(i => i.when);
    expect(guarded.length).toBe(4); // 门控项：复制快捷键 / 复制为 JSON / 重置为默认 / 清空快捷键

    for (const item of guarded) {
      const ids = identifiersOf(item.when as string);
      expect(ids.length).toBeGreaterThan(0);
      for (const row of rows) {
        const ctx = keybindingGearContext(row, true);
        for (const id of ids) {
          expect(id in ctx, `when "${item.when}" 里的 "${id}" 不是行身份字段`).toBe(true);
        }
      }
    }
  });

  it("KEYBINDING_GEAR_WHEN 的三串与 plugin.json 实际用的一致（常量不许漂）", () => {
    const used = new Set(items.filter(i => i.when).flatMap(i => identifiersOf(i.when as string)));
    expect([...used].sort()).toEqual([...Object.values(KEYBINDING_GEAR_WHEN)].sort());
  });

  it("七项都指向本插件声明的命令（「修改快捷键…」复用既有 settings.editKeybinding）", () => {
    const allowed = new Set<string>(["settings.editKeybinding", ...Object.values(KEYBINDING_GEAR_COMMANDS)]);
    for (const item of items) expect(allowed.has(item.command), `未声明的命令：${item.command}`).toBe(true);
  });

  it("常显三项无 when、门控四项有 when；组序非降 = 0_edit → 1_copy → 9_reset", () => {
    const unguarded = items.filter(i => !i.when).map(i => i.command).sort();
    const alwaysOn = [KEYBINDING_GEAR_COMMANDS.copyId, KEYBINDING_GEAR_COMMANDS.copyName, "settings.editKeybinding"].sort();
    expect(unguarded).toEqual(alwaysOn);

    const groups = items.map(i => i.group ?? "");
    expect(groups).toEqual([...groups].sort());
  });

  it("🔴 清空那项的 when 带「壳能力位」——旧壳（无 clearKeybindingForCommand）上它必须不显示", () => {
    const clearItem = items.find(i => i.command === KEYBINDING_GEAR_COMMANDS.clear);
    expect(clearItem).toBeDefined();
    // 有绑定但壳不支持 ⇒ canClear 位假 ⇒ 这一项被门控掉（不是显示一个点了必然报错的死项）
    expect(identifiersOf(clearItem?.when as string)).toContain(KEYBINDING_GEAR_WHEN.canClear);
    expect(keybindingGearContext(rows[0], false)[KEYBINDING_GEAR_WHEN.canClear]).toBe(false);
  });
});
