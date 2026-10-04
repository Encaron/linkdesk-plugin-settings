/**
 * keybindingReset——「重置为默认」的落盘动作：确认框 → 清该条用户覆盖 → 写 `keybindings.json`。
 *
 * E3f #59-G 立的动作，E6#87d 搬出视图；本次（2026-10-05 齿轮菜单化）从 `useKeybindingReset` 的
 * **hook 形态**改成**普通函数**——消费方从「行内齿轮按钮」变成「齿轮菜单命令 handler」，
 * 非组件语境拿不到 hook（菜单项执行时视图可能都没 mount）。
 */

import i18n from "i18next";

/** 需要的最小行信息：命令 id（重置目标）＋ 显示名（确认框里让人认得出是哪条） */
export interface ResetTarget {
  command: string;
  title: string;
}

/**
 * 确认 → 重置 → 保存。用户取消（或 keybindings 面不可用）⇒ 什么都不做。
 * @returns 是否真的重置了（false = 用户取消 / 面不可用）
 */
export async function resetKeybindingToDefault(target: ResetTarget): Promise<boolean> {
  const lk = window.linkdesk;
  const confirmed = await lk?.dialog?.confirm?.(
    i18n.t("确定要将「{{key}}」重置为默认值吗？", { key: target.title })
  );
  if (!confirmed) return false;
  const kb = lk?.keybindings;
  if (!kb) return false;
  await kb.resetKeybindingToDefault(target.command);
  await kb.saveUserKeybindings();
  return true;
}
