/**
 * fileAssociationsGearTarget——管理器两处齿轮菜单的**行/卡身份**与载荷（纯逻辑：零 React、零 window.linkdesk）。
 *
 * 为什么单摘一个文件（照 `keybindingGearTarget.ts` 的先例）：三条判据都是**可证伪的窄事实**——
 * ① 菜单项 `command` 是开放字符串，`plugin.json` 里声明的那条与这里注册的那条**只能靠对账**保证一致
 *    （漏一条 ⇒ 点了没反应，且不报错）；② 「清除相关默认覆盖」的**入参形状**取决于菜单由谁弹：
 *    PluginCard 的齿轮固定送 `context = { pluginId }`（共享件契约，管理器管不着），而管理器自弹的
 *    竞争行齿轮送的是 `commandArgs = [exts]`——两条路读同一枚 `args[0]`，形状完全不同，混了就是静默空转；
 *    🔴 这一句的**前提**＝ handler 写 **rest 形式** `(...args)`（壳按展开调用 handler，
 *    见 `fileAssociationsGearCommands.ts` 头注「载荷形状」）。单参 handler 喂进来的是**第一枚实参**，
 *    本文件两个读入参的函数一律判空 ⇒ 静默空转（2026-10-06 · 纠正案加严 V3 实测正是此形）；
 * ③ 「哪些类真的要去清」是一条纯查表规则（键在才清），摘出来才测得动。
 *
 * ⛔ 本文件不 import `window.linkdesk`、不 import React——`fileAssociationsGearCommands.ts` 才碰 IPC。
 */
import { normalizeExtList, readOverride } from "@linkdesk/ui";

/** 管理器齿轮菜单的三条命令 id——与 `plugin.json` 的 `contributes.commands[]` 逐字对应。 */
export const FILE_ASSOC_GEAR_COMMANDS = {
  /** 竞争行齿轮：本格全部类型恢复自动（载荷 = 类型数组，`commandArgs[0]`） */
  clearRow: "settings.fileAssociations.clearRow",
  /** 卡齿轮：本插件名下**所有有键的类**一并清除（载荷 = `{pluginId}`，PluginCard 的固定 context） */
  clearCard: "settings.fileAssociations.clearCard",
  /** 卡齿轮：复制插件 id（载荷同上） */
  copyPluginId: "settings.fileAssociations.copyPluginId",
} as const;

/**
 * 竞争行齿轮的本行身份——管理器自弹菜单，形状由我们定（简单：一个类型数组）。
 *
 * ⚠️ 「打开方式」那一项的命令 id **不在这里**：它是**宿主**命令，常量住插件 SDK 的
 * 子路径 `@linkdesk/plugin-sdk/shell-commands`（`SHELL_COMMANDS`；⛔ 硬编码宿主命令 id 是
 * 门禁拦的红线，R1）；出与不出仍看运行时探活（`useFileAssociationsModel` 的 `openWithAvailable`）。
 */
export interface ContestedRowGearContext {
  exts: string[];
}

/**
 * 读「竞争行齿轮」命令入参。
 *
 * 管理器自弹的菜单**不带 `context`**（`ContextMenu` 的 `context` 是整菜单共享的，本行身份该走
 * per-item 载荷）⇒ 命令 handler 收到 `args[0]` = `commandArgs[0]` = 类型数组。
 * ⚠️ `args` 是**壳展开后的实参数组**——只有 `(...args)` 形式收得全；单参 handler 喂进来的就是
 *    「类型数组本身」，`args[0]` 退化成第一个扩展名字符串 ⇒ 本函数判空（V3 实测的空转形）。
 * ⛔ 也容忍 `{exts: [...]}` 形态：将来若有调用方（AI 直接 exec）习惯命名入参，不必改两端。
 * 非法/空 ⇒ `undefined`（静默不动手，而不是「清了个空的」）。
 */
export function readContestedRowGearTarget(args: unknown): ContestedRowGearContext | undefined {
  if (!Array.isArray(args)) return undefined;
  const head = args[0] as unknown;
  const raw = Array.isArray(head) ? head : (head as { exts?: unknown } | null | undefined)?.exts;
  const exts = normalizeExtList(raw);
  return exts.length > 0 ? { exts } : undefined;
}

/** 卡齿轮的本卡身份——PluginCard 的齿轮固定送 `context = { pluginId }`（`PluginCard.tsx` 硬编码）。 */
export interface PluginCardGearContext {
  pluginId: string;
}

/** 读「卡齿轮」命令入参（同 `readGearTarget` 先例：缺 `pluginId` 一律当没有目标，不猜）。 */
export function readPluginCardGearTarget(args: unknown): PluginCardGearContext | undefined {
  if (!Array.isArray(args)) return undefined;
  const ctx = args[0] as Partial<PluginCardGearContext> | null | undefined;
  const pluginId = typeof ctx?.pluginId === "string" ? ctx.pluginId : "";
  return pluginId ? { pluginId } : undefined;
}

/**
 * 「清除相关默认覆盖」要清哪些类——**纯查表**：该插件声明的类型里，覆盖表**真的有键**的那些。
 *
 * ⛔ 不清没键的：`setDefaultBulk` 每次调用都是一次配置写入 + 一次广播（E31 单写者语义），
 * 清 8 个空键等于白白惊动一遍文件树选择器与所有监听者，而用户看到的「已清除 0 类」也是噪声。
 * ⛔ 也不清**不在本插件名下**的键：指向别家的覆盖是别家的选择（08 图口径）。
 */
export function planCardClear(
  declaredExts: readonly string[],
  table: Readonly<Record<string, unknown>> | undefined,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ext of normalizeExtList(declaredExts)) {
    if (seen.has(ext)) continue;
    seen.add(ext);
    if (readOverride(table, ext) !== undefined) out.push(ext);
  }
  return out;
}
