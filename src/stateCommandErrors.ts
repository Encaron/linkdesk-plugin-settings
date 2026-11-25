/**
 * settings 命令的返回式错误信封（跨 contextBridge 口径，与 file-tree/serial 同源）。
 *
 * 预期失败一律 **`return settingsError(...)`**（⛔ throw：异常跨桥只留 message，code/hint/details 会丢）：
 * `{ isPluginError: true, code, message, hint?, details? }`（普通对象，⛔ Error 实例）。
 */
import { pluginError } from "@linkdesk/plugin-sdk/runtime";

export const SETTINGS_ERROR_CODES = {
  /** 参数非法 / 缺必填载荷（exts/context.pluginId） */
  EBADARGS: "EBADARGS",
  /** 宿主文件关联能力/写盘失败 */
  EFS: "EFS",
} as const;

export type SettingsErrorCode = (typeof SETTINGS_ERROR_CODES)[keyof typeof SETTINGS_ERROR_CODES];

export interface SettingsCommandError {
  readonly isPluginError: true;
  readonly code: SettingsErrorCode;
  readonly message: string;
  readonly hint?: string;
  readonly details?: Record<string, unknown>;
}

export function settingsError(
  code: SettingsErrorCode,
  message: string,
  hint?: string,
  details?: Record<string, unknown>,
): SettingsCommandError {
  const validated = pluginError({ code, message, hint, details });
  return {
    isPluginError: true,
    code: validated.code as SettingsErrorCode,
    message: validated.message,
    ...(validated.hint !== undefined ? { hint: validated.hint } : {}),
    ...(validated.details !== undefined ? { details: validated.details } : {}),
  };
}
