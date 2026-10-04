/**
 * keybindingGearCommands——快捷键行齿轮菜单的六条命令（四条复制 ＋ 重置为默认 ＋ 清空快捷键）。
 *
 * ## 补的是哪条隐形路径
 *
 * 快捷键页的「改这条绑定的键」此前**只有双击行**（`KeybindingSettingsView` 的 `onDoubleClick`），
 * 而齿轮此前**只在 `source === "user"` 的行上出现**、且一个按钮 = 一个动作（重置）。
 * 本次：齿轮常显（每行都有）＋ 点开是一个菜单——第一项「修改快捷键…」把双击那条路显式化，
 * 其后四条复制让「拿这条绑定的 id / 名字 / 键位 / JSON 去别处用」不必手抄；
 * 「重置为默认」回到作者键，「清空快捷键」则是**这条命令不要键**（见 `keybindingClear.ts` 的分工表）。
 *
 * ## 为什么重置/清空也走命令
 *
 * 原行内齿轮按钮直接调 hook 里的重置动作；菜单化后按钮没了，动作必须成为**可被菜单项引用**的命令
 * （菜单项 `command` 字段只能指命令）。动作本体住 `keybindingReset.ts` / `keybindingClear.ts`
 * ——一条路，两个入口（菜单项 / 将来的 AI 调用）共用。
 *
 * ## 入参
 *
 * 六条的入参都是**同一份**「本行身份」：`ContextMenu` 执行菜单项时把它的 `context` prop 作为
 * 最后一枚实参送到 handler（`executeCommand(id, undefined, ...commandArgs, context)`，池侧归一后
 * handler 收到 `args[0]` = 本行 context）。字段解释见 `keybindingGearTarget.ts`。
 *
 * ⚠️ 命令的 title / description / params 只写在 `plugin.json` 的 `contributes.commands[]`；
 * 运行时 `registerCommand` 不带 meta（壳加载器会把声明那份注册进命令索引——`settings.editKeybinding` 同款）。
 */

import i18n from "i18next";
import {
  KEYBINDING_GEAR_COMMANDS,
  NOTIFY_SOURCE,
  buildKeybindingJson,
  readGearTarget,
  type KeybindingGearContext,
} from "./keybindingGearTarget";
import { clearKeybinding } from "./keybindingClear";
import { resetKeybindingToDefault } from "./keybindingReset";

/** 复制到系统剪贴板 ＋ 一条回执 toast。剪贴板面不可用（壳进程/预览）⇒ 静默，不影响调用方 */
async function copyWithReceipt(text: string, receipt: string): Promise<void> {
  const lk = window.linkdesk;
  await lk?.clipboard?.writeText?.(text);
  void lk?.notifications?.show?.(receipt, { type: "info", source: NOTIFY_SOURCE });
}

/** 复制类的统一回执句式——与壳侧「复制设置 ID」齿轮项同款（`已复制：<内容>`） */
async function copyField(text: string): Promise<void> {
  await copyWithReceipt(text, i18n.t("已复制：") + text);
}

/**
 * 注册六条命令。
 * @returns 注册条数（0 = `window.linkdesk.commands` 不可用）
 */
export function registerKeybindingGearCommands(): number {
  const reg = window.linkdesk?.commands?.registerCommand;
  if (!reg) return 0;

  const { copyId, copyName, copyKey, copyJson, resetToDefault, clear } = KEYBINDING_GEAR_COMMANDS;

  reg(copyId, async (args?: unknown) => {
    const ctx = readGearTarget(args);
    if (!ctx) return;
    await copyField(ctx.command);
  });

  reg(copyName, async (args?: unknown) => {
    const ctx = readGearTarget(args);
    if (!ctx) return;
    await copyField(ctx.title);
  });

  // 键位串**保持声明原形**（含 chord 的空格分段）——归一化只发生在壳的查表侧，复制出来要是能粘回去的那个串
  reg(copyKey, async (args?: unknown) => {
    const ctx = readGearTarget(args);
    if (!ctx) return;
    await copyField(ctx.key);
  });

  reg(copyJson, async (args?: unknown) => {
    const ctx = readGearTarget(args);
    if (!ctx) return;
    await copyWithReceipt(buildKeybindingJson(ctx), i18n.t("已复制为 JSON"));
  });

  reg(resetToDefault, async (args?: unknown) => {
    const ctx = readGearTarget(args);
    if (!ctx) return;
    // 确认框在动作本体里（`keybindingReset`）——用户取消 ⇒ 什么都没发生
    await resetKeybindingToDefault({ command: ctx.command, title: ctx.title });
  });

  reg(clear, async (args?: unknown) => {
    const ctx = readGearTarget(args);
    if (!ctx) return;
    // 确认框与能力探测都在动作本体里（`keybindingClear`）——旧壳上给一句说明、不静默失败
    await clearKeybinding({ command: ctx.command, title: ctx.title });
  });

  return 6;
}
