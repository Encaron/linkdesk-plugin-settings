/**
 * 动作按钮（`renderHint: "action"`）的置灰判据——纯函数，供 SettingRow hook 与单测共用。
 *
 * E5.8#50.26 起语义：`actionDisabledAll` 里**每一条** {key,value} 都命中当前配置值 ⇒ 置灰
 *（混搭复位「N 来源全跟随主题 → 没得复位」）。
 *
 * 🔴 2026-09-28（M4 AI#38.14 实机暴露的回归）：**没声明 = 永不置灰**。原实现
 * `(prop?.actionDisabledAll ?? []).every(…)`——空数组的 `every` 恒真 ⇒ 凡是不带该字段的动作
 * 按钮全被置灰、点不动（壳侧 9 条 AI 接入动作行当场全中）。判据必须**先判有没有条件**。
 */
export function isActionDisabled(
  conditions: Array<{ key: string; value: unknown }> | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!conditions || conditions.length === 0) return false;
  return conditions.every((c) => values[c.key] === c.value);
}
