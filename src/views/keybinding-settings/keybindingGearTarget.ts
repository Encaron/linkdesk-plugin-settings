/**
 * keybindingGearTarget——快捷键行齿轮菜单的「行身份」与复制载荷。纯逻辑：零 React、零 window.linkdesk。
 *
 * 为什么单摘一个文件：齿轮菜单的两条硬判据都是**可证伪的窄事实**——①「有绑定才给复制项」
 * （无绑定的行复制出来是空串/占位符 ⇒ 死项）；②「复制为 JSON」必须与 `keybindings.json`
 * 写入器**同形**（壳侧 `KeybindingRegistry/persistence.ts` 写的就是 `{command, key, when?}`，
 * `when` 有才带），粘回文件才等价。埋在 IPC 壳里就只能靠目视，摘出来才测得动。
 *
 * 案件：`docs/04-软件更新/待抉择池/快捷键页-录制与齿轮菜单.md` 件 2。
 */

import type { KeybindingRow } from "./types";

/**
 * 快捷键行齿轮菜单槽——**插件自造槽**（`MenuId` 是开放字符串，作者面 22-菜单贡献点 §二）。
 *
 * ⛔ **不复用宿主 `settingItemGear`**：那个槽里有两条无 `when` 的宿主项（复制设置 ID / 复制为 JSON），
 * 「when 缺省 = 恒真」⇒ 借用就会给快捷键行冒出两条指向设置的死项。治它要改壳 + 壳发版，
 * 而自造槽零壳改动。
 */
export const KEYBINDING_ITEM_GEAR_MENU = "keybindingItemGear";

/** 无绑定行的键位占位符——`useKeybindingRows` 用它顶空，也是「有没有绑定」的既有口径 */
export const NO_KEY = "—";

/** 四条复制 + 一条重置 = 本次新注册的命令（「修改快捷键…」不在此列——直接指向既有 `settings.editKeybinding`） */
export const KEYBINDING_GEAR_COMMANDS = {
  copyId: "settings.keybinding.copyId",
  copyName: "settings.keybinding.copyName",
  copyKey: "settings.keybinding.copyKey",
  copyJson: "settings.keybinding.copyJson",
  resetToDefault: "settings.keybinding.resetToDefault",
} as const;

/** 菜单项 `when` 用的两个**本行局部**上下文键。
 *  不是全局 context key（⛔ 不走 `contextKey.set`）：它们是 `ContextMenu` 的 `context` prop，
 *  查询期作为 overrides 被 `ContextKeyService._readKey` 直读。
 *
 *  🔴 **这两串必须与 `KeybindingGearContext` 上的属性名逐字相同**——`_readKey` 是裸属性查表
 *  （`if (overrides && key in overrides) return overrides[key]`）：表达式里的标识符直接当属性名用，
 *  查不到就退回全局 state（那里没有这两个行局部键）⇒ **求值恒 false、菜单项静默不显示**
 *  （不报错、不警告，看着只像「这项没做」）。
 *  2026-10-05 件 2 首版就栽在这里：声明写 `keybindingHasKey` / `keybindingIsUser`，行身份却叫
 *  `hasKey`／压根没有 isUser ⇒ 三条门控项（复制快捷键 / 复制为 JSON / 重置为默认）一个都不出。
 *  现在两道锁守着：下面用**计算属性名**从本常量取字段名（改名即编译错），
 *  `keybindingGearMenuContract.test.ts` 拿 `plugin.json` 对账。 */
export const KEYBINDING_GEAR_WHEN = {
  /** 本行有绑定（`key !== NO_KEY`）——门控「复制快捷键 / 复制为 JSON」 */
  hasKey: "keybindingHasKey",
  /** 本行有用户覆盖（`source === "user"`）——门控「重置为默认」 */
  isUser: "keybindingIsUser",
} as const;

/** 本行身份——一份对象两用：菜单项 `when` 的 overrides ＋ 命令 handler 的入参 */
export interface KeybindingGearContext {
  command: string;
  title: string;
  key: string;
  source: string;
  /** 绑定条件原文（`KeybindingRow.when`）——只有有 `when` 才带 */
  when?: string;
  /** 本行有绑定——🔴 属性名 = `KEYBINDING_GEAR_WHEN.hasKey`（⛔ 改名必须同笔改 plugin.json） */
  keybindingHasKey: boolean;
  /** 本行有用户覆盖——🔴 属性名 = `KEYBINDING_GEAR_WHEN.isUser`（同上） */
  keybindingIsUser: boolean;
}

/** 表格行 → 本行身份 */
export function keybindingGearContext(row: KeybindingRow): KeybindingGearContext {
  return {
    command: row.command,
    title: row.title,
    key: row.key,
    source: row.source,
    ...(row.when ? { when: row.when } : {}),
    [KEYBINDING_GEAR_WHEN.hasKey]: row.key !== NO_KEY,
    [KEYBINDING_GEAR_WHEN.isUser]: row.source === "user",
  };
}

/**
 * 命令 handler 入参 → 本行身份。
 *
 * 池侧 `executeCommand(id, undefined, ...commandArgs, context)`（`ContextMenu`）经 preload 归一后
 * handler 收到的第一枚实参就是本行 context（`electron/preload-pool/commands.ts:138`）。
 * ⛔ 缺 `command` 一律当「没有目标」——不拿 title 猜、不静默选中别的行。
 */
export function readGearTarget(args: unknown): KeybindingGearContext | undefined {
  const ctx = args as Partial<KeybindingGearContext> | null | undefined;
  if (!ctx || typeof ctx.command !== "string" || ctx.command === "") return undefined;
  const key = typeof ctx.key === "string" ? ctx.key : NO_KEY;
  const source = typeof ctx.source === "string" ? ctx.source : "";
  const rawHasKey = ctx[KEYBINDING_GEAR_WHEN.hasKey];
  const rawIsUser = ctx[KEYBINDING_GEAR_WHEN.isUser];
  return {
    command: ctx.command,
    title: typeof ctx.title === "string" && ctx.title ? ctx.title : ctx.command,
    key,
    source,
    ...(typeof ctx.when === "string" && ctx.when ? { when: ctx.when } : {}),
    // 门控位缺省时由 key / source 反推——只送四字段的调用方也不至于把菜单项藏错
    [KEYBINDING_GEAR_WHEN.hasKey]: typeof rawHasKey === "boolean" ? rawHasKey : key !== NO_KEY,
    [KEYBINDING_GEAR_WHEN.isUser]: typeof rawIsUser === "boolean" ? rawIsUser : source === "user",
  };
}

/**
 * 「复制为 JSON」的载荷——与 `keybindings.json` 写入器同形：`{command, key, when?}`。
 *
 * ⚠️ **`when` 有才带**：恒输出两键会把条件行撕成「全局绑定」——粘回文件不再等价（可能与他人撞车）。
 */
export function buildKeybindingJson(target: Pick<KeybindingGearContext, "command" | "key" | "when">): string {
  return JSON.stringify({
    command: target.command,
    key: target.key,
    ...(target.when ? { when: target.when } : {}),
  });
}
