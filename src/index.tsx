/**
 * 设置视图插件。
 * Phase 4：核心控制面（core: true），不可卸载。
 * E5.8#41.14：内置设置纯插件化——SettingsView 集群整迁本插件 src/views/（壳 src/components/views/settings 已删）。
 * 零 @src/core import——共享控件走 @linkdesk/ui（E6#54c），数据全走 window.linkdesk.*。
 *
 * M2 `AI#25`：入口顶层补一次**改键命令**注册（`keybindingEditCommand.registerKeybindingEditCommand`）。
 * 🔴 作者契约（E6#62e on-command 激活）：无视图时 AI 经 `exec` 打一条池内没注册的命令 ⇒ 池 preload
 *    会 `import()` 本入口 ⇒ **入口顶层的副作用**才是唯一注册时机。⛔ 别挪进视图的 useEffect——
 *    「设置页还没开就让 AI 进改键编辑态」恰恰是本命令要治的场景（页面由它自己开出来）。
 *
 * 2026-10-05 件 2：快捷键行齿轮菜单的五条命令（四条复制 ＋ 重置为默认）**同处注册**——理由同上：
 *    菜单项执行时视图可能根本没 mount，命令必须随入口顶层副作用就位。
 */

import { registerKeybindingEditCommand } from "./views/keybinding-settings/keybindingEditCommand";
import { registerKeybindingGearCommands } from "./views/keybinding-settings/keybindingGearCommands";

registerKeybindingEditCommand();
registerKeybindingGearCommands();

export { default } from "./views/SettingsView";
