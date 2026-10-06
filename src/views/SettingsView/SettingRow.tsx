/**
 * SettingRow——单个设置行（IPC 读写 + 声明式显隐 + 齿轮菜单 + 色块取色）。
 * 自壳迁入（E5.8#41.14）：@src/core 三依赖全消除——useConfigurationValue（壳）→ useConfigurationValueIpc → 插件本地 hook；
 * MENU_SLOTS.SettingItemGear → 本地常量（菜单槽 id 是壳稳定契约面，壳 coreCommands 已注册该槽菜单项）。
 * E6#54c：共享组件（ContextMenu/ColorPicker）走 @linkdesk/ui。
 * E6#87d：行私有件归拢到同名夹 `SettingRow/`（值读写 / 齿轮开合 / 两个行尾徽标 / 行内常量）。
 * 依赖方向：SettingRow → renderControl + @linkdesk/ui + hooks/types + 同名夹；被聚合器 SettingsView 消费。
 */

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ColorPicker, ContextMenu, EffectiveBadge, SourceBadge } from "@linkdesk/ui";
import renderControl from "./renderControl";
import type { ConfigProperty } from "./types";
import { COLOR_PICKER_PRESETS, SOURCE_BADGE_UI } from "./SettingRow/constants";
import { SETTING_ITEM_GEAR_MENU, useSettingRowGear } from "./SettingRow/gearMenu";
// 说明文字的悬停提示（04「悬停提示系统」揭示类）——`.settings-row-desc` 单行截断，长说明全屏也看不全。
import { descHintAttrs } from "./SettingRow/descHint";
import { useSettingRowBadges } from "./SettingRow/useSettingRowBadges";
import { useSettingRowValue } from "./SettingRow/useSettingRowValue";

function SettingRow({
  configKey,
  prop,
  onChange,
  userOverrides,
  baselineSeeds,
  effectiveTokens,
  description,
}: {
  configKey: string;
  prop: ConfigProperty | undefined;
  onChange: () => void;
  /** E5.8#87：用户覆盖集（getUserSettings）——来源徽标 presence 派生（无 override = 主题 🎨） */
  userOverrides: Record<string, unknown>;
  /** E5.8#88：主题/混搭基准种子集（theme.getBaselineSeeds）——「已修改」徽标 value-vs-baseline 判定基准 */
  baselineSeeds: Record<string, unknown>;
  /** E5.8#155：生效 token 集（theme.getEffectiveTokens）——跟随主题生效值徽标数据源 */
  effectiveTokens: Record<string, string>;
  /** E5.8#90 D5：动态描述覆盖——外观模式等运行时语义（如 themeColor 配色区/域来源双语境）覆盖 schema 静态描述 */
  description?: string;
}) {
  const { t } = useTranslation();
  const gearRef = useRef<HTMLButtonElement>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<{ x: number; y: number } | null>(null);

  const { currentValue, depValue, actionDisabled, handleChange } = useSettingRowValue(configKey, prop, onChange);
  const { badge, effectiveBadge } = useSettingRowBadges({
    configKey,
    prop,
    userOverrides,
    baselineSeeds,
    effectiveTokens,
  });
  const { gearAnchor, handleGearClick, handleGearClose } = useSettingRowGear(gearRef, configKey, prop);

  if (!prop) return null;

  // 声明式条件显隐
  if (prop.dependsOn && depValue !== prop.dependsOn.value) return null;

  // 说明文案**一处真相源**：同一串既做行上的内容、又做悬停提示的全文（长说明被单行省略号截断）。
  const descText = t(description ?? prop.description ?? "");

  return (
    <div className="settings-row" id={`setting-row-${configKey}`}>
      <div className="settings-row-info">
        <div className="settings-row-label-line">
          {/* 配置项短名案 T2（D4）：行名取声明里的 title（人话短名），无 title 回退显配置键——
              第三方存量声明照旧可用（E1）；配置键仍可从齿轮「复制设置 ID」取到。 */}
          <label className="settings-row-label">{prop.title ? t(prop.title) : configKey}</label>
          {/* E5.8#87+#99：来源徽标——只显非默认态（#6 降噪）：改过 ✏️ / 混搭域来源 🔀；
              theme 态无徽标 = 主题来源（清除后徽标消失 = 一眼可见「回主题」，对标 VS Code 非默认态才点显） */}
          {badge === "user" || badge === "mix" ? (
            // 共享 SourceBadge（图标/药丸样式随件走）；文案仍由调用方 t() 供给（共享件零中文）
            <SourceBadge source={badge} label={t(SOURCE_BADGE_UI[badge].labelKey)} />
          ) : null}
        </div>
        <span className="settings-row-desc" {...descHintAttrs(descText)}>{descText}</span>
      </div>
      <div className="settings-row-control">
        {renderControl(prop, currentValue, handleChange, t, (e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setColorPickerAnchor({ x: rect.right + 4, y: rect.top });
          setColorPickerOpen(true);
        }, actionDisabled,
        // 设置行案 2.2（E1 互斥显示）：本行**跟随主题态**（effectiveBadge 非空 ⟺ 键声明了 effectiveToken
        //   且值来自主题）⇒ 让主控件（滑杆）收起自带值标签，改显下面这枚行尾生效徽标；自定义态反之。
        //   ⇒ 同一行永不同屏出现两个含义不同的数字。判据**复用现成信号**，不新造第二把尺子。
        !!effectiveBadge)}
        {/* E5.8#155：跟随主题生效值徽标——控件容器内、控件右侧（行尾/齿轮左），跟随主题态才现。
            放容器内与控件同一条垂直中心线（容器 align-items:center）——贴住控件而非浮在行中间；
            字体行「生效：‹首族名›」/ 玻璃色行「生效：‹rgba› + 色块」——播种改空后补回「实际生效成什么」可见性 */}
        {effectiveBadge && (
          // 共享 EffectiveBadge（前缀＋色块＋值文字随件走，值文字内部复用共享 ReadOnlyText）
          <EffectiveBadge label={t("生效：")} value={effectiveBadge.label} color={effectiveBadge.color} />
        )}
      </div>
      {/* hover 齿轮 */}
      <button
        ref={gearRef}
        className="settings-row-gear"
        data-hint={t("更多操作")} aria-label={t("更多操作")}
        onClick={handleGearClick}
      >
        <span className="codicon codicon-gear" />
      </button>
      {gearAnchor && (
        /* E5.8#92：非模态变体——行内轻量菜单不吞首击（backdrop 吞击 = 每次 gear 后首击被吃 →
           命中区漂移根因，14-档案 §七）；右键 context menu 保留模态（VS Code 语义）。 */
        <ContextMenu
          menuId={SETTING_ITEM_GEAR_MENU}
          anchor={gearAnchor}
          context={{ settingKey: configKey }}
          onClose={handleGearClose}
          variant="non-modal"
        />
      )}
      {/* 色块点击 → ColorPicker */}
      {prop.renderHint === "color" && (
        <ColorPicker
          open={colorPickerOpen}
          value={String(currentValue ?? prop.default ?? "")}
          onChange={(hex) => handleChange(hex)}
          onClose={() => setColorPickerOpen(false)}
          anchor={colorPickerAnchor}
          presets={COLOR_PICKER_PRESETS}
        />
      )}
    </div>
  );
}

export default SettingRow;
