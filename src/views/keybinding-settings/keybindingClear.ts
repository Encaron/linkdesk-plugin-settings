/**
 * keybindingClear——「清空快捷键」的落盘动作：能力探测 → 确认框 → 删该命令全部绑定且**抑制**作者默认 → 写盘。
 *
 * ## 与「重置为默认」的分工（⛔ 不是同一件事）
 *
 * | | `keybindingReset.ts` 重置为默认 | 本文件 清空 |
 * |:--|:--|:--|
 * | 动作 | 只删 `source === "user"` 的覆盖 | 删该命令**全部来源**的绑定 ＋ 让壳记住「这条命令不要键」 |
 * | 结果 | 回到**作者声明**的键 | 这条命令**没有键**（作者声明也被压住，重启后依然如此） |
 * | 用在 | 「我改坏了，回到出厂键」 | 「这条命令我不想要键」 |
 *
 * 用户立案原话：设了一个键之后「连撤回的能力都没了」——因为「恢复为默认」在命令**自带作者默认键**
 * 时只会把作者那把键请回来，而壳侧此前**根本没有「这条命令不要键」的表达**
 * （`keybindings.json` 只能写「有键」）。壳 0.2.46 补上 `clearKeybindingForCommand`
 * （落盘形状 = `{ "command": "…", "key": "" }`）。
 *
 * ## 为什么要探能力
 *
 * 旧壳（< 0.2.46）上没有这个方法 ⇒ 直接调就是 `TypeError`。菜单项那位门控
 * （`KEYBINDING_GEAR_WHEN.canClear`）负责**不显示**，本文件负责**真被调到时优雅说明**
 * （AI/CLI 可以绕过菜单直接执行命令）。⛔ 不静默失败——「什么也没发生」比报错更难查。
 */

import i18n from "i18next";
import { NOTIFY_SOURCE } from "./keybindingGearTarget";

/** 需要的最小行信息：命令 id（清空目标）＋ 显示名（确认框里让人认得出是哪条） */
export interface ClearTarget {
  command: string;
  title: string;
}

/**
 * 壳是否具备「清空快捷键」能力（LinkDesk **0.2.46+**）。
 *
 * ⚠️ 参数可注入（默认 `window.linkdesk`）——测试与预览宿主都能塞替身；生产路径只有默认那一个。
 */
export function hasClearKeybindingApi(lk: typeof window.linkdesk | undefined = window.linkdesk): boolean {
  return typeof (lk as { keybindings?: { clearKeybindingForCommand?: unknown } } | undefined)
    ?.keybindings?.clearKeybindingForCommand === "function";
}

/**
 * 确认 → 清空 → 保存。用户取消 / 壳没有该能力 / `keybindings` 面不可用 ⇒ 什么都不做。
 * @returns 是否真的清空了（false = 用户取消 / 能力缺失 / 面不可用）
 */
export async function clearKeybinding(target: ClearTarget): Promise<boolean> {
  const lk = window.linkdesk;

  if (!hasClearKeybindingApi(lk)) {
    // 正常路径不会走到这里（菜单项已被能力门控挡住）——走到即说明是命令直调（AI/CLI）或旧壳
    void lk?.notifications?.show?.(
      i18n.t("当前 LinkDesk 版本不支持「清空快捷键」——需要 0.2.46 及以上。"),
      { type: "warning", source: NOTIFY_SOURCE }
    );
    return false;
  }

  const confirmed = await lk?.dialog?.confirm?.(
    i18n.t(
      "确定要清空「{{key}}」的快捷键吗？清空后这条命令不再有按键，作者声明的默认键也不会自动恢复（想恢复默认键请用「重置为默认」）。",
      { key: target.title }
    )
  );
  if (!confirmed) return false;

  const kb = lk?.keybindings;
  if (!kb?.clearKeybindingForCommand) return false;
  await kb.clearKeybindingForCommand(target.command);
  await kb.saveUserKeybindings?.();
  return true;
}
