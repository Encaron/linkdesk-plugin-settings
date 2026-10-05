/**
 * osFollowBlock——「默认打开方式」组**底部**的 OS 登记折叠块（T6 · 第 5 波）。
 *
 * 权威（壳仓案档「文件打开方式与贡献点」）：`00-README.md` 的 D6 ＋ `01-方案与落点契约.md` §T6
 * ＋ 设计图 `mockups/08`（`<details class="osblock">` 那一段）。形态 = **折叠块（总开关 ＋ 一行只读状态）**：
 * 之所以「降级」成折叠块而不给独立分组，是因为这条开关的语义最容易与「本页的应用内默认」混淆——
 * 它管的是 **OS 层候选**（装阅读器 → Windows「打开方式」里多一个 LinkDesk），和「谁是这个文件的应用内
 * 默认」**互不干涉**（三层口径：`*` 全文件右键项 / per-ext 候选 / 应用内默认）。
 *
 * ## 两处「不做什么」
 *
 * - ⛔ **不自造文案**：开关的标题与说明**住壳**（`src/App/config/fileAssociations.ts` 的声明，
 *   译名随之落 `lang-defaults`）——本件只用 `t(prop.title/description)` 转一道，⛔ 不在本仓复制一份
 *   （复制 = 第二真相源，改一边漏一边）。壳没声明这个键（第三方壳）⇒ 本件返回 `null`，整块不出现。
 * - ⛔ **不为状态行新开 IPC**：状态行只读，读数用**本页已有的**数据（已装插件声明的类型数）。
 *   「运行期实际登记了哪些扩展名」住主进程（`os-associations-dynamic.json`），池侧今天没有读面——
 *   本波**有意不为一行只读文字**去扩契约／preload（详见案档 交接 §三 本波读数）。
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Toggle } from "@linkdesk/ui";
import { lk } from "../SettingsView/helpers";
import { useConfigurationValueIpc } from "../hooks/useConfigurationValueIpc";
import type { ConfigProperty } from "../SettingsView/types";
import { OS_FOLLOW_PLUGINS_KEY } from "./managerHint";

interface Props {
  /** 已装插件声明的**去重**类型数——状态行读数（本页已有，⛔ 不为它新开 IPC） */
  declaredExtCount: number;
  /** 壳声明的配置项——文案真源住壳；未声明（无标题）⇒ 本块不渲染 */
  prop: ConfigProperty;
}

export default function OsFollowBlock({ declaredExtCount, prop }: Props) {
  const { t } = useTranslation();
  const follow = useConfigurationValueIpc<boolean>(OS_FOLLOW_PLUGINS_KEY);
  // 缺省 = 开（壳声明 `default: true`）——首帧值未到按默认画，免得先闪一下「关」
  const on = follow !== false;

  const setFollow = useCallback((v: boolean) => {
    // 受控件：值只来自配置面。写成功的路径是「壳写盘 → config:changed → onChange 广播」，
    // 本件不自设本地态（免得与广播打架）；写失败则界面停在旧值（上面 hook 的 onChange 不会来）。
    void lk().set(OS_FOLLOW_PLUGINS_KEY, v).catch(() => {});
  }, []);

  if (!prop.title) return null;

  return (
    <details className="settings-assoc-os">
      {/* summary 写明语义（D6 钉死）：折叠态也要让用户看见「关掉会发生什么」 */}
      <summary className="settings-assoc-os-summary">
        {t("系统「打开方式」登记——关 = 停止替插件登记并撤回运行期已登记；安装包自带类不动；与本页默认无关")}
      </summary>
      <div className="settings-row settings-assoc-os-row">
        <div className="settings-row-info">
          <span className="settings-assoc-os-title">{t(prop.title)}</span>
          {prop.description && <span className="settings-row-desc">{t(prop.description)}</span>}
        </div>
        <div className="settings-row-control">
          <Toggle checked={on} onChange={setFollow} />
        </div>
      </div>
      <div className="settings-assoc-os-status">
        {on
          ? t("已开启 · 当前已装插件共声明 {{count}} 类文件类型——装卸插件时自动进出系统「打开方式」", {
              count: declaredExtCount,
            })
          : t("已关闭 · 运行期加进系统的类型已撤回；安装包自带类与本页默认不受影响")}
      </div>
    </details>
  );
}
