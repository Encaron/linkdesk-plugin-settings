/**
 * keybindingViewPresence——快捷键页「在场」标志：本页此刻是否正挂载着。
 *
 * ## 为什么需要它（2026-10-05 用户实测的缺陷）
 *
 * 齿轮菜单里点「修改快捷键…」会把界面**弹回左侧栏**（双击同一行却正常）。
 * 根因不在齿轮：`settings.editKeybinding` 的 handler 无论从哪来路，都会请壳执行
 * `workbench.action.openKeybindingsSettings`——而那条壳命令的语义是「**打开设置页**」：
 * `openKeybindingsSettings()`（壳 `KeybindingRegistry/persistence.ts`）⇒ 派发 `OPEN_SETTINGS`
 * ⇒ `App/lifecycle.ts` 的 `onOpenSettings` ⇒ `shellEvents.emit("icon:selected", settingsId)`
 * ——**连带把左栏的设置图标选中**。用户**本来就在**这一页上，于是表现为「缩回左侧栏」。
 *
 * ## 判据
 *
 * 「已在页内」这件事，插件自己最清楚：`SettingsView` 的「快捷键」 tab 是**条件渲染**
 * （非本 tab 时 `KeybindingSettingsView` 直接卸载）⇒ 「挂载中」 ⇔ 「用户正看着快捷键页」。
 * 于是：**在页内 ⇒ 只写编辑意图**（挂载中的视图订阅它，当场进编辑态——与双击同一条路）；
 * **不在页内 ⇒ 才请壳把这一页开出来**（AI/CLI 路径：命令面板、`exec` 直调都落这一支）。
 *
 * ⚠️ 模块级布尔（非 React state）：消费方是**命令 handler**（菜单项执行时视图可能都没 mount），
 *    组件语境拿不到它。写入口只有 `KeybindingSettingsView` 的挂载 effect（置真 / 卸载置假）。
 */

let _mounted = false;

/** 快捷键页挂载/卸载时置位——唯一写入口（`KeybindingSettingsView`） */
export function setKeybindingViewMounted(mounted: boolean): void {
  _mounted = mounted;
}

/** 快捷键页是否正挂载（= 用户正看着「设置 → 快捷键」这一页） */
export function isKeybindingViewMounted(): boolean {
  return _mounted;
}
