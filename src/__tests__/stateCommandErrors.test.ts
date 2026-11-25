/**
 * settings 返回式错误信封——跨 contextBridge 可携带的普通对象（⛔ Error 实例）。
 */
import { describe, expect, it } from "vitest";
import { settingsError, SETTINGS_ERROR_CODES } from "../stateCommandErrors";

describe("settings 返回式错误信封", () => {
  it("码表稳定（EBADARGS/EFS）", () => {
    expect(SETTINGS_ERROR_CODES.EBADARGS).toBe("EBADARGS");
    expect(SETTINGS_ERROR_CODES.EFS).toBe("EFS");
  });

  it("返回普通对象，code/hint/details 结构化克隆不丢", () => {
    const err = settingsError(SETTINGS_ERROR_CODES.EBADARGS, "缺 exts", "传 {exts:[...]}", { exts: null });
    expect(err).not.toBeInstanceOf(Error);
    expect(err.isPluginError).toBe(true);
    expect(err.code).toBe("EBADARGS");
    expect(err.hint).toMatch(/exts/);
    expect(err.details).toEqual({ exts: null });
    expect(structuredClone(err)).toEqual(err);
  });

  it("入参写错当场失败（编程错误不是业务回执）", () => {
    expect(() => settingsError("" as never, "x")).toThrow(TypeError);
    expect(() => settingsError(SETTINGS_ERROR_CODES.EFS, "")).toThrow(TypeError);
  });
});
