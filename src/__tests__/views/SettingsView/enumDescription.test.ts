/**
 * enumDescriptionAt——枚举档显示名取字（配置项短名案 T2：修「插件侧对象形态从不生效」盲区）。
 *
 * 两种声明形态各钉一条（对象 = 插件 manifest schema 形态；数组 = 壳侧形态），
 * 外加「形状不对 = 无显示名，不炸」——manifest 形状不可信（E6#151 同口径）。
 */

import { describe, expect, it } from "vitest";
import { enumDescriptionAt } from "../../../views/SettingsView/enumDescription";

describe("enumDescriptionAt", () => {
  it("对象形态（插件 manifest schema 规定形态）：按 enum 值查键", () => {
    const ed = { powershell: "PowerShell（Windows 默认）", custom: "自定义命令…" };

    expect(enumDescriptionAt(ed, "powershell", 0)).toBe("PowerShell（Windows 默认）");
    expect(enumDescriptionAt(ed, "custom", 4)).toBe("自定义命令…");
  });

  it("数组形态（壳侧声明与动态推送）：按下标取位，与 enum 一一对应", () => {
    const ed = ["关", "延迟自动", "切换标签页时"];

    expect(enumDescriptionAt(ed, "off", 0)).toBe("关");
    expect(enumDescriptionAt(ed, "onFocusChange", 2)).toBe("切换标签页时");
  });

  it("对象形态下**下标不是键**——值查不到就是没有（旧写法 `obj[i]` 恒落空的正是这条）", () => {
    const ed = { powershell: "PowerShell（Windows 默认）" };

    expect(enumDescriptionAt(ed, "powershell", 0)).toBe("PowerShell（Windows 默认）");
    expect(enumDescriptionAt(ed, "cmd", 0)).toBeUndefined();
    expect(enumDescriptionAt(ed, "0", 0)).toBeUndefined();
  });

  it("形状不对（未声明 / null / 原始值 / 非字符串项）→ undefined，不炸", () => {
    expect(enumDescriptionAt(undefined, "a", 0)).toBeUndefined();
    expect(enumDescriptionAt(null, "a", 0)).toBeUndefined();
    expect(enumDescriptionAt("裸串", "a", 0)).toBeUndefined();
    expect(enumDescriptionAt([1, "b"], "a", 0)).toBeUndefined();
    expect(enumDescriptionAt([1, "b"], "b", 1)).toBe("b");
    expect(enumDescriptionAt({ a: 42 }, "a", 0)).toBeUndefined();
  });
});
