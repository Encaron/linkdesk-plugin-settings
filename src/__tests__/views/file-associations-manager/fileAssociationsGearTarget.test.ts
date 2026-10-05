/**
 * fileAssociationsGearTarget 单测——管理器两处齿轮菜单的「行/卡身份」与清除清单。
 *
 * ## 为什么这几条判据值得测
 *
 *   ① **命令 id 两面靠对账**（`plugin.json` 声明一条、代码注册一条）：漏一条 ⇒ 菜单项点了没反应
 *      且**不报错**（最坏的那种故障）；
 *   ② **两处齿轮送来的载荷形状完全不同**：PluginCard 的卡齿轮固定送 `context = { pluginId }`
 *      （共享件契约，管理器改不动），而管理器自弹的竞争行齿轮走 `commandArgs = [exts]`——
 *      两条路读同一枚 `args[0]`，读错就是**静默空转**（清了个空）或**打错目标**（清了别人的键）；
 *   ③ **清除清单是一条纯查表规则**（只在覆盖表真有键时清）：算错 ⇒ 要么留下清不掉的键（用户以为
 *      清了），要么为 0 个键惊动一次写盘 + 广播（E31 单写者的代价）。
 *
 * 纯逻辑——零 React、零 `window.linkdesk`。夹具假名，⛔ 不用真插件名/真文案。
 */

import { describe, expect, it } from "vitest";
import {
  FILE_ASSOC_GEAR_COMMANDS,
  planCardClear,
  readContestedRowGearTarget,
  readPluginCardGearTarget,
} from "../../../views/file-associations-manager/fileAssociationsGearTarget";

describe("命令 id（与 plugin.json 的 contributes.commands[] 对账）", () => {
  it("三条本插件命令 id 逐字钉死，且互不相同", () => {
    expect(Object.values(FILE_ASSOC_GEAR_COMMANDS)).toEqual([
      "settings.fileAssociations.clearRow",
      "settings.fileAssociations.clearCard",
      "settings.fileAssociations.copyPluginId",
    ]);
    expect(new Set(Object.values(FILE_ASSOC_GEAR_COMMANDS)).size).toBe(3);
  });

  it("宿主命令 id ⛔ 不住本表——「打开方式」走 @linkdesk/plugin-sdk 的 SHELL_COMMANDS（R1 红线）", () => {
    // 这条判据防的是「宿主命令 id 又被硬编码回本插件」：本表只放 settings.* 自有命令。
    expect(Object.values(FILE_ASSOC_GEAR_COMMANDS).every((id) => id.startsWith("settings."))).toBe(true);
  });
});

describe("readContestedRowGearTarget——竞争行齿轮（commandArgs[0] = 类型数组）", () => {
  it("数组形态：归一化去重（`.MX` 与 `mx` 是同一类）", () => {
    expect(readContestedRowGearTarget([[".MX", "mx", " pdf "]])).toEqual({ exts: ["mx", "pdf"] });
  });

  it("容忍 `{exts: [...]}` 命名形态（AI 直接 exec 时的手感）", () => {
    expect(readContestedRowGearTarget([{ exts: ["DOCX"] }])).toEqual({ exts: ["docx"] });
  });

  it("空 / 非法 / 缺参 ⇒ undefined（⛔ 不「清了个空的」）", () => {
    expect(readContestedRowGearTarget([])).toBeUndefined();
    expect(readContestedRowGearTarget([[]])).toBeUndefined();
    expect(readContestedRowGearTarget([[".", "a/b"]])).toBeUndefined();
    expect(readContestedRowGearTarget(undefined)).toBeUndefined();
    expect(readContestedRowGearTarget("docx")).toBeUndefined();
    expect(readContestedRowGearTarget([{ exts: "docx" }])).toBeUndefined();
  });
});

describe("readPluginCardGearTarget——卡齿轮（共享件固定送 context = { pluginId }）", () => {
  it("读 args[0].pluginId", () => {
    expect(readPluginCardGearTarget([{ pluginId: "plug-a" }])).toEqual({ pluginId: "plug-a" });
  });

  it("缺 pluginId / 非字符串 / 缺参 ⇒ undefined（不猜目标）", () => {
    expect(readPluginCardGearTarget([{}])).toBeUndefined();
    expect(readPluginCardGearTarget([{ pluginId: "" }])).toBeUndefined();
    expect(readPluginCardGearTarget([{ pluginId: 7 }])).toBeUndefined();
    expect(readPluginCardGearTarget([["plug-a"]])).toBeUndefined();
    expect(readPluginCardGearTarget(undefined)).toBeUndefined();
  });

  it("两种齿轮的载荷形状**不通用**（这条判据的意义就在于别把两者混着读）", () => {
    expect(readContestedRowGearTarget([["plug-a"]])).toEqual({ exts: ["plug-a"] });
    expect(readPluginCardGearTarget([["plug-a"]])).toBeUndefined();
  });
});

describe("🔴 单参形状一律判空（2026-10-06 纠正案 V3 的机械判据）", () => {
  // 壳按**展开**喂 handler（`handler(...realArgs)`）⇒ 只有 `(...args)` 形式的 handler 才收得全。
  // 老写法是单参 ⇒ 解析器收到的是**被剥掉一层**的形状：clearRow 拿到「类型数组本身」、
  // clearCard 拿到「context 对象本身」。这两条钉住「那种形状必须判空」——它是实机空转的直接成因。
  it("clearRow：第一枚实参 = 类型数组本身 ⇒ 判空（⛔ 别拿第一个扩展名当目标）", () => {
    expect(readContestedRowGearTarget(["docx", "pdf"])).toBeUndefined();
  });

  it("clearCard：第一枚实参 = context 对象本身 ⇒ 判空（同一种剥层）", () => {
    expect(readPluginCardGearTarget({ pluginId: "plug-a" })).toBeUndefined();
  });

  it("正控：壳展开后的形状照旧成立（竞争行还带一枚菜单 context，不影响读 args[0]）", () => {
    expect(readContestedRowGearTarget([["docx"], { pluginId: "plug-a" }])).toEqual({ exts: ["docx"] });
    expect(readPluginCardGearTarget([{ pluginId: "plug-a" }])).toEqual({ pluginId: "plug-a" });
  });
});

describe("planCardClear——只清「真的有键」的类", () => {
  const declared = ["docx", "xlsx", "pdf"];

  it("有键的留下、没键的不进清单（⛔ 不为空键惊动一次写盘＋广播）", () => {
    expect(planCardClear(declared, { ".docx": "plug-b", ".pdf": "plug-a" })).toEqual(["docx", "pdf"]);
  });

  it("按**声明序**输出，并去重（同一类声明两次只清一次）", () => {
    expect(planCardClear(["pdf", "DOCX", ".docx", "docx"], { ".docx": "x", ".pdf": "y" })).toEqual([
      "pdf",
      "docx",
    ]);
  });

  it("键在、值非法（空串 / 非串）⇒ 视同没键（宿主读面也是这么判的）", () => {
    expect(planCardClear(declared, { ".docx": "", ".xlsx": 3 })).toEqual([]);
  });

  it("覆盖表缺 / 空 ⇒ 空清单（卡齿轮据此不出「清除」项）", () => {
    expect(planCardClear(declared, undefined)).toEqual([]);
    expect(planCardClear(declared, {})).toEqual([]);
    expect(planCardClear([], { ".docx": "x" })).toEqual([]);
  });

  it("⛔ 不清不在本插件名下的键（那是别家的选择）", () => {
    expect(planCardClear(declared, { ".docx": "plug-b", ".mp4": "plug-a" })).toEqual(["docx"]);
  });
});
