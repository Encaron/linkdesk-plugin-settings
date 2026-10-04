/**
 * Keyboard Shortcuts 设置子栏——对标 VS Code Keyboard Shortcuts 页面。
 * E3f #59：双 tab + 表格视图 + 搜索 + 双击改绑定 + 冲突检测。
 * #59-C：完整命令视图——以 CommandRegistry 为数据源。
 * #59-D：行内编辑——双框 chord 捕获 + ✕ + 点击外部取消 + 字体归一化。
 *
 * 🔥 E5.5#7-p2 多 WebView 改造：零 import @src/core，全走 window.linkdesk.* IPC。
 * E6#87d：数据层 → `useKeybindingRows.ts`、行内编辑状态机 → `useKeybindingEditor.ts`、
 *   编辑单元格 → `InlineChordEditor.tsx`、类型 → `types.ts`（子件留本夹内，不搬去 SettingsView/）。
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ContextMenu } from "@linkdesk/ui";
import InlineChordEditor from "./InlineChordEditor";
import { useKeybindingEditor } from "./useKeybindingEditor";
import { useKeybindingGearMenu } from "./useKeybindingGearMenu";
import { useKeybindingRows } from "./useKeybindingRows";
import { KEYBINDING_ITEM_GEAR_MENU } from "./keybindingGearTarget";
import { consumeKeybindingEdit, subscribeKeybindingEdit } from "./keybindingEditRequest";
import type { KeybindingSettingsViewProps } from "./types";
import "./KeybindingSettingsView.css";

function KeybindingSettingsView({ initialQuery }: KeybindingSettingsViewProps) {
  const { t } = useTranslation();
  const { search, setSearch, rows, allKeybindings } = useKeybindingRows(initialQuery);
  const editor = useKeybindingEditor(allKeybindings);
  const { gear, handleGearClick, handleGearClose } = useKeybindingGearMenu();
  const { editingRow, editRowRef, startEdit, splitChord } = editor;

  // ── M2 AI#25：命令侧的「改这条」意图 → 同一个编辑态（与双击**同一条路**）──
  // 双通道：挂载时领待办（设置页由命令侧打开时，请求早于本视图），在场时走订阅当场收。
  const [editRequest, setEditRequest] = useState<string | null>(null);
  useEffect(() => {
    const pending = consumeKeybindingEdit();
    if (pending) setEditRequest(pending);
    return subscribeKeybindingEdit((command) => setEditRequest(command));
  }, []);
  // 落进编辑态要等**那一行真在表里**（rows 是异步拉的，且受搜索框过滤）——不在就等 rows 变
  useEffect(() => {
    if (!editRequest) return;
    const row = rows.find((r) => r.command === editRequest);
    if (!row) return;
    setEditRequest(null);
    startEdit(row);
    splitChord(row);
  }, [editRequest, rows, startEdit, splitChord]);

  const sourceLabel = (s: string) => {
    if (s === "user") return t("用户");
    if (s === "plugin") return t("插件");
    if (s === "builtin") return t("内置");
    return "—";
  };

  return (
    <div className="settings-keybindings-view">
      <div className="settings-keybindings-search-bar">
        <span className="codicon codicon-search settings-keybindings-search-icon" />
        <input
          className="settings-keybindings-search-input"
          type="text"
          placeholder={t("搜索快捷键")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="settings-keybindings-table">
        <div className="settings-keybindings-header">
          <span>{t("命令")}</span>
          <span>{t("快捷键")}</span>
          <span>{t("来源")}</span>
          <span>{t("when 条件")}</span>
        </div>
        {rows.length === 0 ? (
          <div className="settings-keybindings-empty">{t("无匹配快捷键")}</div>
        ) : (
          rows.map((row) => {
            const isEditing = editingRow?.command === row.command;
            return (
              <div
                key={row.command}
                ref={isEditing ? editRowRef : undefined}
                className={`settings-keybindings-row ${row._conflict ? "conflict" : ""} ${isEditing ? "editing" : ""}`}
                onDoubleClick={isEditing ? undefined : () => { startEdit(row); splitChord(row); }}
              >
                <div className="settings-keybindings-col-command">
                  <div>{t(row.title)}</div>
                  <div className="settings-keybindings-col-command-id">{row.command}</div>
                </div>
                <div>
                  {isEditing ? (
                    <InlineChordEditor editor={editor} />
                  ) : row.key === "—" ? (
                    <span className="settings-keybindings-col-key-none">{row.key}</span>
                  ) : (
                    <span className={`settings-keybindings-col-key ${row._conflict ? "conflict-key" : ""}`}>
                      {row.key}
                    </span>
                  )}
                  {/* 齿轮常显（2026-10-05 件 2）——旧形态只在 `source === "user"` 的行上出现
                      （=「这条被改过」的指示灯），用户要它像设置页那样**每行都有**；hover 淡入是既有样式。
                      点开的菜单项与门控见 `keybindingGearTarget.ts` / `plugin.json`（插件自有槽）。 */}
                  {!isEditing && (
                    <button
                      className="settings-keybindings-row-gear"
                      data-hint={t("更多操作")} aria-label={t("更多操作")}
                      onClick={(e) => { e.stopPropagation(); handleGearClick(e, row); }}
                    >
                      <span className="codicon codicon-gear" />
                    </button>
                  )}
                </div>
                <div className="settings-keybindings-col-source">{sourceLabel(row.source)}</div>
                <div className="settings-keybindings-col-when">{row.when || "—"}</div>
              </div>
            );
          })
        )}
      </div>
      {gear && (
        /* 非模态：行内轻量菜单不吞首击（backdrop 吞击 = 每次齿轮后首击被吃），与设置页行齿轮同款 */
        <ContextMenu
          menuId={KEYBINDING_ITEM_GEAR_MENU}
          anchor={gear.anchor}
          context={gear.context}
          onClose={handleGearClose}
          variant="non-modal"
        />
      )}
    </div>
  );
}

export default KeybindingSettingsView;
