/**
 * SettingRow 的值读写——当前值 / 显隐依赖值 / 动作按钮禁用条件 / 写回。
 * E6#87d 自 SettingRow.tsx 逐字搬出（只搬家，零逻辑变更）。
 */

import { useCallback } from "react";
import { useConfigurationValueIpc, useConfigurationValuesIpc } from "../../hooks/useConfigurationValueIpc";
import { lk } from "../helpers";
import { isActionDisabled } from "./actionDisabled";
import type { ConfigProperty } from "../types";

export function useSettingRowValue(
  configKey: string,
  prop: ConfigProperty | undefined,
  onChange: () => void,
) {
  // IPC 版 hook——替代 useConfigurationValue
  const currentValue = useConfigurationValueIpc(configKey);
  const depValue = useConfigurationValueIpc(prop?.dependsOn?.key ?? "");
  // E5.8#50.26：actionDisabledAll——动作按钮禁用条件（混搭复位「N 来源全跟随主题 → 置灰」）。
  // 🔴 判据抽到 actionDisabled.ts（纯函数 ＋ 单测）：**没声明 = 永不置灰**——2026-09-28 M4 AI#38.14
  // 实机暴露，原写法 `(… ?? []).every(…)` 空数组恒真 ⇒ 不带该字段的动作按钮全被置灰、点不动。
  const disabledAll = prop?.actionDisabledAll;
  const actionKeys = disabledAll?.map((c) => c.key) ?? [];
  const actionValues = useConfigurationValuesIpc(actionKeys);
  const actionDisabled = isActionDisabled(disabledAll, actionValues);

  const handleChange = useCallback(
    async (value: unknown) => {
      try {
        await lk().set(configKey, value);
        onChange();
      } catch (e) {
        console.error("[SettingsView] 设置失败:", configKey, e);
      }
    },
    [configKey, onChange],
  );

  return { currentValue, depValue, actionDisabled, handleChange };
}
