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
 *  查询期作为 overrides 被 `ContextKeyService._readKey` 直读（`key in overrides` ⇒ 无需预先声明）。
 *  这样既躲开全局键的竞态，也躲开宿主 reserved 键账本。 */
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
  /** 透明给 handler 的派生位（菜单门控已在 `when` 里判过一次，这里让 handler 不重复推导） */
  hasKey: boolean;
}

/** 表格行 → 本行身份 */
export function keybindingGearContext(row: KeybindingRow): KeybindingGearContext {
  return {
    command: row.command,
    title: row.title,
    key: row.key,
    source: row.source,
    ...(row.when ? { when: row.when } : {}),
    hasKey: row.key !== NO_KEY,
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
  return {
    command: ctx.command,
    title: typeof ctx.title === "string" && ctx.title ? ctx.title : ctx.command,
    key: typeof ctx.key === "string" ? ctx.key : NO_KEY,
    source: typeof ctx.source === "string" ? ctx.source : "",
    ...(typeof ctx.when === "string" && ctx.when ? { when: ctx.when } : {}),
    hasKey: typeof ctx.hasKey === "boolean" ? ctx.hasKey : typeof ctx.key === "string" && ctx.key !== NO_KEY,
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
