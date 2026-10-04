/**
 * 快捷键行齿轮菜单的开合——照 `SettingsView/SettingRow/gearMenu.ts` 的形态（锚点算法与开合同款），
 * 但**不写任何全局 context key**：本菜单的 `when` 门控读的是 `ContextMenu` 的 `context` prop
 * （查询期 overrides，见 `keybindingGearTarget.ts` 的 `KEYBINDING_GEAR_WHEN` 注释），
 * ⛔ 不走 `contextKey.set` 全局广播——那正是 E5.8#153-fix 修过的竞态源。
 */

import { useCallback, useState } from "react";
import i18n from "i18next";
import { keybindingGearContext, type KeybindingGearContext } from "./keybindingGearTarget";
import type { KeybindingRow } from "./types";

export interface KeybindingGearState {
  anchor: { x: number; y: number };
  context: KeybindingGearContext;
}

export function useKeybindingGearMenu() {
  const [gear, setGear] = useState<KeybindingGearState | null>(null);

  /** 行内点击 → 以**那颗按钮**的矩形定位菜单（与设置页 `{x: rect.left, y: rect.bottom + 4}` 同款） */
  const handleGearClick = useCallback((e: { currentTarget: HTMLElement }, row: KeybindingRow) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const context = keybindingGearContext(row);
    setGear({
      anchor: { x: rect.left, y: rect.bottom + 4 },
      // 名字取**界面语言**的显示名（与行的 `t(row.title)` 同口径，也是壳「复制设置名称」的口径）：
      // 「复制命令名称」与「重置」确认框都直接用它，⛔ 别把中文源串原样递出去。
      context: { ...context, title: i18n.t(context.title) },
    });
  }, []);

  const handleGearClose = useCallback(() => setGear(null), []);

  return { gear, handleGearClick, handleGearClose };
}
