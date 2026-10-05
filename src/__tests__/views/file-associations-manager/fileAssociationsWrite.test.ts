/**
 * fileAssociationsWrite 单测——写口的**旧壳退化**守卫。
 *
 * ## 为什么这条判据值得测
 *
 * 它是**新旧壳之间的岔路口**，而两条路在界面上看起来一模一样：
 *   · 新壳（0.2.48+ 有 bulk 口）⇒ 一次调用写 N 类（**一次写盘、一次广播**，E31/E32 的账在这里）；
 *   · 旧壳（无 bulk 口）⇒ 逐类退化成 N 次 `setDefault`（结果相同，代价更大，但**绝不能静默失败**）。
 * 写错的表现是「某个版本的用户点按钮没反应」或「一次写入惊动 N 次广播」——两种都不会报错。
 *
 * 纯逻辑：`fa` 从参数进来（不读 `window.linkdesk`）⇒ 传一个记账用的替身即可，不碰真 IPC。
 */

import { describe, expect, it, vi } from "vitest";
import {
  writeDefaults,
  type BulkWriteApi,
} from "../../../views/file-associations-manager/fileAssociationsWrite";

/** 记账替身——两个口的调用序列都留痕（判据看的就是这个序列） */
function spyApi(hasBulk: boolean) {
  const calls: Array<[string, string | null]> = [];
  const bulkCalls: Array<[string[], string | null]> = [];
  const api: BulkWriteApi = {
    setDefault: vi.fn(async (ext: string, pluginId: string | null) => {
      calls.push([ext, pluginId]);
    }),
  };
  if (hasBulk) {
    api.setDefaultBulk = vi.fn(async (exts: string[], pluginId: string | null) => {
      bulkCalls.push([[...exts], pluginId]);
    });
  }
  return { api, calls, bulkCalls };
}

describe("writeDefaults", () => {
  it("新壳：一次 bulk 调用写 N 类（⛔ 不逐类细写——那会变成 N 次广播）", async () => {
    const { api, calls, bulkCalls } = spyApi(true);
    await writeDefaults(api, ["docx", "xlsx", "pptx"], "plug-a");
    expect(bulkCalls).toEqual([[["docx", "xlsx", "pptx"], "plug-a"]]);
    expect(calls).toEqual([]);
  });

  it("旧壳（无 bulk 口）：逐类退化写，顺序照清单", async () => {
    const { api, calls, bulkCalls } = spyApi(false);
    await writeDefaults(api, ["docx", "xlsx"], "plug-a");
    expect(calls).toEqual([
      ["docx", "plug-a"],
      ["xlsx", "plug-a"],
    ]);
    expect(bulkCalls).toEqual([]);
  });

  it("`pluginId: null` 原样透传（＝恢复自动，两条路都不许把它改写成空串）", async () => {
    const bulk = spyApi(true);
    await writeDefaults(bulk.api, ["docx"], null);
    expect(bulk.bulkCalls[0]![1]).toBeNull();

    const legacy = spyApi(false);
    await writeDefaults(legacy.api, ["docx"], null);
    expect(legacy.calls[0]![1]).toBeNull();
  });

  it("入参先归一化去重（`.MX` 与 `mx` 只写一次——避免同一键写两遍、广播两遍）", async () => {
    const { api, bulkCalls } = spyApi(true);
    await writeDefaults(api, [".MX", "mx", " PDF "], "plug-a");
    expect(bulkCalls[0]![0]).toEqual(["mx", "pdf"]);
  });

  it("空清单 / 全非法 ⇒ 一次调用也不发（托盘里那种「清了个空的」是噪声）", async () => {
    const { api } = spyApi(true);
    await writeDefaults(api, [], "plug-a");
    await writeDefaults(api, ["", "a/b", "  "], "plug-a");
    expect(api.setDefault).not.toHaveBeenCalled();
    expect(api.setDefaultBulk).not.toHaveBeenCalled();
  });

  it("写失败**不吞**（调用方要据此回滚乐观值并弹错误 toast）——bulk 与逐类两条路都如此", async () => {
    const boom = new Error("disk busy");
    const bulk: BulkWriteApi = {
      setDefault: vi.fn(async () => undefined),
      setDefaultBulk: vi.fn(async () => {
        throw boom;
      }),
    };
    await expect(writeDefaults(bulk, ["docx"], "plug-a")).rejects.toThrow("disk busy");

    let n = 0;
    const legacy: BulkWriteApi = {
      setDefault: vi.fn(async () => {
        n += 1;
        if (n === 2) throw boom;
      }),
    };
    await expect(writeDefaults(legacy, ["docx", "xlsx"], "plug-a")).rejects.toThrow("disk busy");
    expect(n).toBe(2); // 第 1 类写过、第 2 类失败即中断（⛔ 不继续假装成功）
  });
});
