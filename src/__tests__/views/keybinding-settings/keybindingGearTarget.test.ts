/**
 * keybindingGearTarget 单测——齿轮菜单的「行身份」与复制载荷（2026-10-05 件 2）。
 *
 * ## 为什么这三条判据值得测
 *
 * 都是**可证伪的窄事实**，而且错了不会报错、只会静默给错东西：
 *   ① `keybindingHasKey` 判错 ⇒ 无绑定的行也冒出「复制快捷键」，粘出来是 `—`（死项）；
 *   ② 「复制为 JSON」多带 / 少带 `when` ⇒ 粘回 `keybindings.json` **不等价**
 *      （少带 = 条件绑定被撕成全局绑定，可能与他人撞车）；
 *   ③ `readGearTarget` 缺 `command` 时若去猜（拿 title 顶）⇒ 重置/复制打到**别的行**。
 *
 * ## 测试面
 *
 * 纯逻辑——零 React、零 `window.linkdesk`，不碰任何桩。
 */

import { describe, expect, it } from "vitest";
import {
  KEYBINDING_GEAR_COMMANDS,
  KEYBINDING_GEAR_WHEN,
  KEYBINDING_ITEM_GEAR_MENU,
  NO_KEY,
  buildKeybindingJson,
  keybindingGearContext,
  readGearTarget,
} from "../../../views/keybinding-settings/keybindingGearTarget";
import type { KeybindingRow } from "../../../views/keybinding-settings/types";

const row = (over: Partial<KeybindingRow> = {}): KeybindingRow => ({
  command: "workbench.action.selectLanguage",
  title: "选择语言",
  key: "ctrl+k ctrl+l",
  source: "builtin",
  ...over,
});

describe("常量", () => {
  it("槽位 id 是本插件自造槽（⛔ 不是宿主 settingItemGear——那槽有无 when 的宿主项会漏死项）", () => {
    expect(KEYBINDING_ITEM_GEAR_MENU).toBe("keybindingItemGear");
  });

  it("命令 id 一律带 settings. 前缀，且两条 when 键名不同（一个有绑定 / 一个用户覆盖）", () => {
    expect(Object.values(KEYBINDING_GEAR_COMMANDS)).toEqual([
      "settings.keybinding.copyId",
      "settings.keybinding.copyName",
      "settings.keybinding.copyKey",
      "settings.keybinding.copyJson",
      "settings.keybinding.resetToDefault",
    ]);
    expect(KEYBINDING_GEAR_WHEN.hasKey).not.toBe(KEYBINDING_GEAR_WHEN.isUser);
  });
});

describe("keybindingGearContext——表格行 → 行身份", () => {
  it("有绑定：门控位为真，when 原样带上", () => {
    const ctx = keybindingGearContext(row({ when: "resourceIsFile" }));
    expect(ctx).toEqual({
      command: "workbench.action.selectLanguage",
      title: "选择语言",
      key: "ctrl+k ctrl+l",
      source: "builtin",
      when: "resourceIsFile",
      keybindingHasKey: true,
      keybindingIsUser: false,
    });
  });

  it("无绑定（占位符）：有绑定位为假，且**不带 when 字段**（不是空串）", () => {
    const ctx = keybindingGearContext(row({ key: NO_KEY }));
    expect(ctx.keybindingHasKey).toBe(false);
    expect("when" in ctx).toBe(false);
  });

  it("用户覆盖行：isUser 位为真（门控「重置为默认」）；plugin 行不是", () => {
    expect(keybindingGearContext(row({ source: "user" })).keybindingIsUser).toBe(true);
    expect(keybindingGearContext(row({ source: "plugin" })).keybindingIsUser).toBe(false);
  });
});

describe("readGearTarget——菜单项把本行 context 递进来", () => {
  const FULL = {
    command: "editor.action.rename",
    title: "重命名",
    key: "F2",
    source: "user",
    when: "resourceIsFile",
    keybindingHasKey: true,
    keybindingIsUser: true,
  };

  it("原样收下本行身份", () => {
    expect(readGearTarget(FULL)).toEqual(FULL);
  });

  it("缺 command / 空 command ⇒ undefined（⛔ 不拿 title 猜目标）", () => {
    expect(readGearTarget(undefined)).toBeUndefined();
    expect(readGearTarget(null)).toBeUndefined();
    expect(readGearTarget({})).toBeUndefined();
    expect(readGearTarget({ title: "选择语言" })).toBeUndefined();
    expect(readGearTarget({ command: "" })).toBeUndefined();
    expect(readGearTarget("workbench.action.selectLanguage")).toBeUndefined();
  });

  it("title 缺失 ⇒ 退回 command（表格行 title 的既有兜底同款），key 缺失 ⇒ 占位符", () => {
    expect(readGearTarget({ command: "a.b" })).toMatchObject({ command: "a.b", title: "a.b", key: NO_KEY, source: "" });
  });

  it("门控位缺省时由 key / source 反推（只送四字段的调用方也不至于把菜单项藏错）", () => {
    expect(readGearTarget({ command: "a.b", key: "ctrl+s" })?.keybindingHasKey).toBe(true);
    expect(readGearTarget({ command: "a.b", key: NO_KEY })?.keybindingHasKey).toBe(false);
    expect(readGearTarget({ command: "a.b", source: "user" })?.keybindingIsUser).toBe(true);
    expect(readGearTarget({ command: "a.b", source: "builtin" })?.keybindingIsUser).toBe(false);
  });
});

describe("buildKeybindingJson——与 keybindings.json 写入器同形", () => {
  it("无 when ⇒ 只有两键", () => {
    const json = buildKeybindingJson({ command: "workbench.action.selectLanguage", key: "ctrl+k ctrl+l" });
    expect(JSON.parse(json)).toEqual({ command: "workbench.action.selectLanguage", key: "ctrl+k ctrl+l" });
  });

  it("有 when ⇒ 三键（条件不丢——粘回文件才等价）", () => {
    const json = buildKeybindingJson({ command: "editor.action.rename", key: "F2", when: "resourceIsFile" });
    expect(JSON.parse(json)).toEqual({ command: "editor.action.rename", key: "F2", when: "resourceIsFile" });
  });

  it("空串 when 视同没有（⛔ 不留 `\"when\":\"\"` 这种半残形状）", () => {
    expect(JSON.parse(buildKeybindingJson({ command: "a.b", key: "F2", when: "" }))).toEqual({ command: "a.b", key: "F2" });
  });
});
