/**
 * gearMenus——管理器三处齿轮菜单的**菜单项装配**（i18n 文案 ＋ 命令 id ＋ 载荷形状）。
 *
 * 为什么单摘一件：共享组装视图（`@linkdesk/ui` 的 `ManagerView`）**不认识任何命令 id**——命令是
 * 插件／宿主自己的资产，所以三个 `*GearItems` 工厂是**消费方的义务**（共享件只出齿轮壳与点击面）。
 * 三处菜单条目各有自己的「出不出」判据，混在 JSX 里只能靠目视：
 *
 * | 菜单 | 条目 | 出它的判据 |
 * |:--|:--|:--|
 * | 竞争行（管理器自弹） | 「恢复自动（本格 N 类）」 | `row.overrideCount > 0`——⛔ 零覆盖不出（`ContextMenu` 的条目**没有置灰能力**，「无动作可给」的表达只能是「不出这一项」） |
 * | 竞争行 | 「打开方式…（.ext）」 | 宿主命令 `workbench.action.openWith` 在册（E39 运行时探活）＋ 用本行**首个类型**做载荷（按类型开选择器，不需要文件） |
 * | 卡头 | 「清除相关默认覆盖（N 类）」 | `card.overrideExts.length > 0` |
 * | 卡头 | 「复制插件 ID」 | **恒在**——没有覆盖也总有 id 可复制 |
 * | 卡体行（C4） | 「打开方式…（.ext）」 | 同竞争行的探活；⛔ **不带**「恢复自动」（行尾下拉已有这个入口，双入口是同一动作的第二处真相） |
 *
 * 载荷形状（两张卡齿轮固定收 `context = {pluginId}`、竞争行收 `commandArgs = [exts]`）见
 * `fileAssociationsGearTarget.ts` 头注——⛔ 本件只**造**菜单项，不解析入参。
 */
import { SHELL_COMMANDS } from "@linkdesk/plugin-sdk/shell-commands";
import type { MenuItemDescriptor } from "@linkdesk/contracts";
import type { CardModel, ContestedRowModel, ExtRowModel } from "@linkdesk/ui";
import { FILE_ASSOC_GEAR_COMMANDS } from "./fileAssociationsGearTarget";

/** 三个工厂共同的上下文：i18n 的 `t` ＋ 宿主「打开方式」命令是否在册。 */
export interface GearMenuContext {
  t(key: string, options?: Record<string, unknown>): string;
  /** E39：宿主命令 `workbench.action.openWith` 在册 ⇒ 才给「打开方式…」条目 */
  openWithAvailable: boolean;
}

/** 管理器三处齿轮的菜单项工厂——形状直接喂共享 `ManagerView` 的三个同名 prop。 */
export interface GearMenuFactories {
  contested(row: ContestedRowModel): MenuItemDescriptor[];
  card(card: CardModel): MenuItemDescriptor[];
  cardRow(row: ExtRowModel): MenuItemDescriptor[];
}

/**
 * 造三个工厂。`openWithAvailable` 一变就换一整套（菜单是快照，运行时探活的结论不缓存）。
 */
export function makeGearMenus({ t, openWithAvailable }: GearMenuContext): GearMenuFactories {
  /** 「打开方式…（.ext）」——竞争行与卡体行共用同一条目（同一命令、同一载荷律） */
  const openWithItem = (ext: string): MenuItemDescriptor => ({
    // 命令 id 走宿主常量（⛔ 不硬编码宿主命令 id——门禁 R1 红线）；身份走 `commandArgs`（载荷律）
    command: SHELL_COMMANDS.openWith,
    label: t("打开方式…（.{{ext}}）", { ext }),
    commandArgs: [{ ext }],
  });

  return {
    contested(row) {
      const items: MenuItemDescriptor[] = [];
      if (row.overrideCount > 0) {
        items.push({
          command: FILE_ASSOC_GEAR_COMMANDS.clearRow,
          label: t("恢复自动（本格 {{count}} 类）", { count: row.exts.length }),
          commandArgs: [row.exts],
        });
      }
      // 按**类型**开选择器：载荷给该行首个类型，面板列出能处理它的处理器（不需要文件）
      if (openWithAvailable) items.push(openWithItem(row.exts[0] ?? ""));
      return items;
    },

    card(card) {
      const items: MenuItemDescriptor[] = [];
      if (card.overrideExts.length > 0) {
        items.push({
          command: FILE_ASSOC_GEAR_COMMANDS.clearCard,
          label: t("清除相关默认覆盖（{{count}} 类）", { count: card.overrideExts.length }),
        });
      }
      // 复制 id 与「清除」不同：**恒在**（没有覆盖也总有 id 可复制）
      items.push({ command: FILE_ASSOC_GEAR_COMMANDS.copyPluginId, label: t("复制插件 ID") });
      return items;
    },

    cardRow(row) {
      return openWithAvailable ? [openWithItem(row.ext)] : [];
    },
  };
}
