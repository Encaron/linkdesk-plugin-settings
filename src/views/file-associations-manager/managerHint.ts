/**
 * file-associations-manager/managerHint——「这组该交给管理器渲染」的**唯一判据**。
 *
 * 挂载位在**壳**：`src/App/config/fileAssociations.ts` 注册了 pseudo pluginId `file-associations`
 * 的一只配置组，组里唯一键＝覆盖表本身（`workbench.fileAssociations`），键上带
 * `uiHint: "fileAssociationsManager"`（契约 `SettingsUiHint` 第 14 枚）。设置插件见到这个提示就把
 * **整组**渲染成管理器——先例＝`uiHint:"image"` 的 `app.backgroundImage`（宿主声明 → 渲染方画 UI）。
 *
 * 🔴 **为什么按 hint 认组、⛔ 不按 pluginId 认**：`file-associations` 是壳的私有 pseudo id，
 * 第三方设置插件整套替换本仓时，写死 id 就把自己锁死在官方壳的当前实现上；hint 是**契约的一部分**
 * （`SettingsUiHint` 联合里那一枚），换壳实现、换插件实现都还在。同理，本文件是本仓里唯一
 * 「知道有个管理器」的地方，`filterGroups` 与 `SettingsView` 都从这里取判据。
 *
 * 三处消费：
 *   ① `SettingsView` 组挂载——命中即换掉 `GroupedKeys`（整组自定义视图）；
 *   ② `filterGroups` 搜索豁免——**任何**搜索词都保留本组（组内唯一键「workbench.fileAssociations」
 *      不可能命中「.pdf」，不豁免则搜扩展名时整组消失，E30 的「检索复用设置页搜索」就成了空话）。
 *      搜不到时由管理器自己出「没有匹配的类型或插件」空态（08/09 图三处空态之一）；
 *   ③ `SettingsView` 导航计数——本组的徽标不数键，改数管理器报上来的 `navCount`。
 */
import type { ConfigProperty, GroupInfo } from "../SettingsView/types";

/** 挂载位提示词——与 `SettingsUiHint` 联合里的那一枚逐字相同（⛔ 改这里必须同步契约）。 */
export const MANAGER_UI_HINT = "fileAssociationsManager";

/** 覆盖表键（组内唯一键，也是管理器读写的那一处真源）。 */
export const WORKBENCH_FILE_ASSOCIATIONS_KEY = "workbench.fileAssociations";

/**
 * OS 跟随总开关键（T6 第 5 波）——声明在**壳**（`src/App/config/fileAssociations.ts`，与本组同属
 * 一只 contribution），本仓只管渲染。语义与默认值都在壳的声明里，这里只留键名一份字面量。
 * ⛔ `app.osAssociations.overrides` 不在本文件：它是「无界面项」（D6 留作将来高级位），
 * 本管理器一个字都不渲染它——留常量 = 留一个没人用的键名。
 */
export const OS_FOLLOW_PLUGINS_KEY = "app.osAssociations.followPlugins";

/** 这组是不是管理器组——判据：组内任一键带管理器提示词。 */
export function isManagerGroup(
  group: Pick<GroupInfo, "keys">,
  allProps: Record<string, ConfigProperty>,
): boolean {
  return group.keys.some((k) => allProps[k]?.uiHint === MANAGER_UI_HINT);
}

/**
 * 首次加载后从原始分组表里挑出管理器组的 pluginId（挑不到 = 壳没声明这个挂载位 ⇒ 本管理器不出现）。
 * 取**原始**分组（`groupsRaw`）而非搜索过滤后的——过滤会把键滤空，判据会失真。
 */
export function findManagerPluginId(
  groups: readonly GroupInfo[],
  allProps: Record<string, ConfigProperty>,
): string | null {
  for (const g of groups) {
    if (isManagerGroup(g, allProps)) return g.pluginId;
  }
  return null;
}
