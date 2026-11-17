/**
 * resolveGroupIconManifest 单测（05 settings-侧栏入口图标）——fixture 一律虚构值（硬约束 21）：
 * 虚构插件清单、虚构图标地址；不引用任何真实插件 id / 真实 UI 文案。
 */
import { describe, expect, it } from "vitest";
import { resolveGroupIconManifest } from "../../../views/SettingsView/groupIcon";

describe("resolveGroupIconManifest（导航行图标来源裁决）", () => {
  it("① 有 manifest → 恒返 descriptor：marketIcon 优先、icon 回退", () => {
    expect(
      resolveGroupIconManifest({ marketIcon: "https://market.example/demo-art.png" }, undefined)?.icon,
    ).toBe("https://market.example/demo-art.png");
    expect(resolveGroupIconManifest({ icon: "icons/demo-icon.svg" }, undefined)?.icon).toBe(
      "icons/demo-icon.svg",
    );
  });

  it("② 有 manifest 但无任何图标字段 → 默认彩色块 descriptor（不空位）", () => {
    const out = resolveGroupIconManifest({}, undefined);
    expect(typeof out?.icon === "string" && out.icon.length > 0).toBe(true);
  });

  it("③ 本体组空消费：codicon 全名 → 剥前缀＋iconSource:codicon（防共享件双前缀）", () => {
    expect(resolveGroupIconManifest(null, "codicon-demo-gear")).toEqual({
      icon: "demo-gear",
      iconSource: "codicon",
    });
  });

  it("③b 本体组空消费：绝对 URL → 原样＋iconSource:url（跳过插件相对路径拼接）", () => {
    expect(resolveGroupIconManifest(null, "linkdesk://demo-art/icon.svg")).toEqual({
      icon: "linkdesk://demo-art/icon.svg",
      iconSource: "url",
    });
    expect(resolveGroupIconManifest(null, "https://assets.example/demo.svg")).toEqual({
      icon: "https://assets.example/demo.svg",
      iconSource: "url",
    });
  });

  it("④ 契约外形态或都缺 → undefined（行维持纯文字，不预留空槽）", () => {
    expect(resolveGroupIconManifest(null, undefined)).toBeUndefined();
    expect(resolveGroupIconManifest(null, "")).toBeUndefined();
    expect(resolveGroupIconManifest(null, "   ")).toBeUndefined();
    expect(resolveGroupIconManifest(null, "icons/relative.svg")).toBeUndefined(); // 相对路径拼了必破，拒绝
    expect(resolveGroupIconManifest(null, 42)).toBeUndefined();
    expect(resolveGroupIconManifest(null, null)).toBeUndefined();
  });

  // ④bis 共享图标名（04 内置配置组图标 2026-11-18）——裸串按名查快照，url 默认项才接
  it("④a 共享图标名在快照且有 url 默认项 → 原样＋iconSource:shared", () => {
    expect(
      resolveGroupIconManifest(null, "demo.group-x", { "demo.group-x": { url: "https://assets.example/demo.svg" } }),
    ).toEqual({ icon: "demo.group-x", iconSource: "shared" });
  });

  it("④b 快照缺省 / 名字不在 / 纯字体默认项 → undefined（宁缺毋滥）", () => {
    expect(resolveGroupIconManifest(null, "demo.group-x")).toBeUndefined(); // 无快照
    expect(resolveGroupIconManifest(null, "demo.group-x", {})).toBeUndefined(); // 名字不在
    expect(
      resolveGroupIconManifest(null, "demo.group-x", { "demo.group-x": { fontPath: "icons.woff", fontCharacter: "\e001" } }),
    ).toBeUndefined(); // 池侧不渲染字体
  });
});
