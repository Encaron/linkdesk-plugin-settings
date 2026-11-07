/**
 * 导航行图标来源裁决（05 settings-侧栏入口图标）——纯函数，loadSettingsData 逐组调用，单测覆盖分支。
 *
 * 数据驱动（无映射表、无 id 硬编码）：
 *   1. 有 manifest（插件贡献组——组从已装插件声明长出 ⇒ pm.list 必命中）→ pickIdentityArt
 *      （marketIcon ?? icon → 无图统一默认彩色块，共享件 E6#69a 兜底）；
 *   2. 无 manifest（本体组）且组声明带 icon → 空消费——🔴 前向消费：契约 0.2.53 才带该字段
 *      （壳仓 04「内置配置组图标声明」），未到前本分支不触发 ⇒ 行维持纯文字；
 *   3. 都没有 → undefined ⇒ 不渲染图标位、不预留空槽（2026-11-07 用户拍板：图标需设计，宁缺毋滥）。
 *
 * 声明 icon 契约形态与归一（对齐共享件 resolvePluginIcon 分发：iconSource 未设时裸词自动拼
 * `codicon-` 前缀、含 `/`/`.` 一律当插件相对路径拼 linkdesk://——本体组没有插件目录，两态都破）：
 *   - codicon 全名（`codicon-xxx`）→ 剥前缀 ＋ iconSource:"codicon"（共享件再拼回，避免双前缀）；
 *   - 绝对 URL（linkdesk:// 或 https:// 等带 scheme）→ 原样 ＋ iconSource:"url"（跳过相对路径拼接）；
 *   - 其他形态（相对路径等）→ 拒绝返回 undefined（宁缺毋滥，不猜）。
 */
import { pickIdentityArt } from "@linkdesk/ui";

type IdentityCandidate = Parameters<typeof pickIdentityArt>[0];

/** GroupInfo.iconManifest 形状——pickIdentityArt 返回的 descriptor（与其同构，直作 PluginIcon manifest 入参） */
export type GroupIconSource = ReturnType<typeof pickIdentityArt>;

export function resolveGroupIconManifest(
  manifest: IdentityCandidate,
  declaredIcon: unknown,
): GroupIconSource | undefined {
  if (manifest) return pickIdentityArt(manifest);
  if (typeof declaredIcon === "string" && declaredIcon.trim() !== "") {
    const declared = declaredIcon.trim();
    if (declared.startsWith("codicon-")) {
      return { icon: declared.slice("codicon-".length), iconSource: "codicon" };
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(declared)) {
      return { icon: declared, iconSource: "url" };
    }
    return undefined; // 契约外形态（相对路径等）——本体组无插件目录，拼了必破，宁缺毋滥
  }
  return undefined;
}
