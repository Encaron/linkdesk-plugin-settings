/**
 * fileAssociationsGearCommands——管理器两处齿轮菜单的三条命令。
 *
 * | 命令 | 谁弹 | 载荷 | 动作 |
 * |:--|:--|:--|:--|
 * | `settings.fileAssociations.clearRow` | 管理器自弹的**竞争行**齿轮 | `commandArgs[0]` = 类型数组 | 整格恢复自动（`writeDefaults(exts, null)`） |
 * | `settings.fileAssociations.clearCard` | **PluginCard** 的卡头齿轮 | `context = { pluginId }`（共享件固定） | 该插件名下**所有有键的类**恢复自动 |
 * | `settings.fileAssociations.copyPluginId` | 同上 | 同上 | 复制插件 id |
 *
 * 写口一律经 `writeDefaults`（`fileAssociationsWrite.ts`）——新壳一次写 N 类、旧壳逐类退化，
 * ⛔ 两个 handler 都不直接碰 `setDefaultBulk`（旧壳上没有它）。
 *
 * ## 为什么走命令而不是行内回调
 *
 * ① 卡齿轮的菜单项是 `PluginCard` 渲染的，它的 `items` 只能指命令（`MenuItemDescriptor.command`）；
 * ② 同一个动作要能被**非视图**调用方复用（AI 直接 `exec`、将来的批量入口）——动作住命令、视图只接线；
 * ③ 注册时机：几何上必须住插件入口顶层副作用（见 `src/index.tsx` 头注）——菜单项执行时视图可能
 *    压根没 mount（设置页没开，用户从别处打开这个菜单不可能，但 AI 调用可能），视图里的注册全落空。
 *
 * ## 为什么「清除相关默认覆盖」自己去查表（⛔ 不靠菜单打开时算好的入参）
 *
 * PluginCard 的齿轮固定只送 `{pluginId}`（共享件契约，改不动也不该改）⇒ handler 必须自己从
 * `pluginManager.list()` 取该插件的声明、从配置面取覆盖表，才算得出「哪些类真有键」。
 * 好处是**执行时刻的事实**：菜单开着的那几秒里用户若在别处改了覆盖表，这里清的就是当下的键，
 * 而不是打开菜单时的快照。
 *
 * ⚠️ 命令的 title / description / params 只写在 `plugin.json` 的 `contributes.commands[]`；
 * 运行时 `registerCommand` 不带 meta（壳加载器会把声明那份注册进命令索引）。
 */

import i18n from "i18next";
import {
  FILE_ASSOC_GEAR_COMMANDS,
  planCardClear,
  readContestedRowGearTarget,
  readPluginCardGearTarget,
} from "./fileAssociationsGearTarget";
import { extractDeclaredExtensions } from "./model";
import { writeDefaults } from "./fileAssociationsWrite";
import { WORKBENCH_FILE_ASSOCIATIONS_KEY } from "./managerHint";

/** 通知来源 id——与 `keybindingGearTarget.NOTIFY_SOURCE` 同值（都是本插件这个生产者） */
const NOTIFY_SOURCE = "settings";

/** 回执 toast——通知面不可用（壳进程/预览）时静默，不影响动作本身 */
function toast(message: string, type: "info" | "warning" | "error" = "info"): void {
  void window.linkdesk?.notifications?.show?.(message, { type, source: NOTIFY_SOURCE });
}

/** 该插件声明过的类型——`pluginManager.list()` 里找它那一条（找不到 = 已卸载/禁用 ⇒ 空数组） */
async function declaredExtsOf(pluginId: string): Promise<string[]> {
  const list = await window.linkdesk?.pluginManager?.list?.().catch(() => []);
  const entry = (list ?? []).find((e) => e.pluginId === pluginId);
  return extractDeclaredExtensions(entry?.manifest?.contributes).map((d) => d.ext);
}

/**
 * 注册三条命令。
 * @returns 注册条数（0 = `window.linkdesk.commands` 不可用）
 */
export function registerFileAssociationGearCommands(): number {
  const reg = window.linkdesk?.commands?.registerCommand;
  if (!reg) return 0;

  const { clearRow, clearCard, copyPluginId } = FILE_ASSOC_GEAR_COMMANDS;

  // 竞争行：本格整格恢复自动。格内可能有已在自动态的类型——`applyDefaultBulkOverride` 对无键的
  // 删除是 no-op，整格仍是**一次写盘一次广播**（E31/E32），所以不必先过滤。
  reg(clearRow, async (args?: unknown) => {
    const target = readContestedRowGearTarget(args);
    if (!target) return;
    const fa = window.linkdesk?.fileAssociation;
    if (!fa) return;
    try {
      await writeDefaults(fa, target.exts, null);
      toast(i18n.t("{{count}} 类已恢复自动", { count: target.exts.length }));
    } catch (e) {
      toast(
        i18n.t("写默认打开方式失败：{{msg}}", { msg: e instanceof Error ? e.message : String(e) }),
        "error",
      );
    }
  });

  // 卡：本插件名下所有「真有键」的类一并清除（键在别家名下的不动——那是别家的选择）
  reg(clearCard, async (args?: unknown) => {
    const target = readPluginCardGearTarget(args);
    if (!target) return;
    const fa = window.linkdesk?.fileAssociation;
    const cfg = window.linkdesk?.configuration;
    if (!fa || !cfg) return;
    try {
      const [declared, table] = await Promise.all([
        declaredExtsOf(target.pluginId),
        cfg.get<Record<string, unknown>>(WORKBENCH_FILE_ASSOCIATIONS_KEY).catch(() => undefined),
      ]);
      const toClear = planCardClear(declared, table);
      if (toClear.length === 0) {
        toast(i18n.t("这个插件名下没有需要清除的默认覆盖"));
        return;
      }
      await writeDefaults(fa, toClear, null);
      toast(i18n.t("已清除 {{count}} 类覆盖，全部恢复自动", { count: toClear.length }));
    } catch (e) {
      toast(
        i18n.t("写默认打开方式失败：{{msg}}", { msg: e instanceof Error ? e.message : String(e) }),
        "error",
      );
    }
  });

  // 卡：复制插件 id（回执句式与壳侧「复制设置 ID」同款：`已复制：<内容>`）
  reg(copyPluginId, async (args?: unknown) => {
    const target = readPluginCardGearTarget(args);
    if (!target) return;
    await window.linkdesk?.clipboard?.writeText?.(target.pluginId);
    toast(i18n.t("已复制：") + target.pluginId);
  });

  return 3;
}
