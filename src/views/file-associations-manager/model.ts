/**
 * file-associations-manager/model——「默认打开方式」管理器的**纯模型**。
 *
 * 零 React、零 `window.linkdesk`、零 i18n：所有「谁是当前默认 / 这一格该怎么并 / 搜索命不命中」
 * 的判据都在这里，视图只做渲染与转发。摘出来的理由与 `keybindingGearTarget.ts` 同款——
 * 聚合法则（E32「候选集合签名 × 当前生效值」）与六态徽标（09 图 C5）是本案最容易出错的窄事实，
 * 埋在 JSX 里只能靠目视。
 *
 * ## 三份输入从哪来（判定归壳，管理器只聚合）
 *
 * | 输入 | 面 | 为什么是它 |
 * |:--|:--|:--|
 * | 谁声明了哪些类型 | `pluginManager.list()` → `manifest.contributes.fileAssociations` | 池内可达的**唯一**插件清单面（`plugins.listAll()` 是壳 preload 独有，池里拿不到） |
 * | 每类的候选与**当前默认** | `fileAssociation.listHandlersFor(ext)` | 「谁是默认」的判据在宿主（覆盖表 → 声明序 → 角色兜底）——管理器**不自己算**，只消费 `isCurrent` |
 * | 覆盖表 | `configuration.get("workbench.fileAssociations")` | 覆盖表是配置项、写面唯一（`fileAssociation.setDefault[Bulk]`）⇒ 与文件树选择器同一真源（E31）；也是「有没有被用户改过」的唯一事实 |
 *
 * ## 三条刻意写死的口径（与 08/09 图逐字对齐）
 *
 * 1. **禁用插件不出现**：`pluginManager.list()` 只列启用插件，`getDisabled()` 的条目**不带
 *    `contributes`**（`PluginInfoEntry` 无该字段）⇒ 取不到声明、画不出卡。与 E5「禁用＝不存在
 *    （不参选解析、选择器不列）」同向。
 * 2. **失效覆盖（E6）是「类型」的属性、不是某一行的属性**：覆盖表指向不在册插件时，该类的
 *    **每一行**都挂红点「失效覆盖」（09 图 `pillFor` 里 `d` 追加在三个分支之后），而不只挂在
 *    生效行——用户扫哪一行都该看到「这个键是死的」。
 * 3. **下拉显示覆盖态、徽标显示生效态**（03 §4「本轮正名点」）：一侧答「你设了什么」（键还在不在
 *    ⇒ 下拉选中值），一侧答「现在实际谁上」（宿主 `isCurrent`）。两者在写后刷新窗口里可以短暂不一致，
 *    由 hook 的乐观覆盖兜住（见 `useFileAssociationsModel`），不在这里摆平。
 */

import type { ManifestIconShape } from "@linkdesk/ui";

/* ── 扩展名归一（与宿主 `normalizeExtension` 同口径：小写、去前导点） ── */

/** 归一化扩展名——非法（非字符串 / 空 / 带分隔符）一律 `""`（调用方据此跳过）。 */
export function normalizeExt(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const ext = raw.trim().toLowerCase().replace(/^\.+/, "");
  if (!ext || /[\s/\\]/.test(ext)) return "";
  return ext;
}

/** 归一化扩展名 → 覆盖表存储键（`.ext` 带点小写——宿主 `normalizeAssociationOverrideKey` 同形）。 */
export function overrideKeyOf(ext: string): string {
  const normalized = normalizeExt(ext);
  return normalized ? `.${normalized}` : "";
}

/** 覆盖表里该类的覆盖值——无键 / 非法值 → `undefined`（＝「自动」）。 */
export function readOverride(
  table: Readonly<Record<string, unknown>> | undefined,
  ext: string,
): string | undefined {
  const key = overrideKeyOf(ext);
  if (!key) return undefined;
  const v = table?.[key];
  return typeof v === "string" && v ? v : undefined;
}

/** 原始扩展名串列表 → 归一化去重清单（顺序照原）——命令入参的守卫，见 `fileAssociationsGearTarget`。 */
export function normalizeExtList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const ext = normalizeExt(item);
    if (!ext || seen.has(ext)) continue;
    seen.add(ext);
    out.push(ext);
  }
  return out;
}

/* ── 声明面解析 ── */

/** 一条挂牌声明——`contributes.fileAssociations[]` 的一项。 */
export interface DeclaredExtension {
  /** 归一化扩展名（无点小写）——行标签照抄它（E10/E34：声明 `MX` → 显示 `.mx`） */
  ext: string;
  /** 声明原文（未归一）——只在「与归一结果不同」时作悬停提示（说明这行为什么是这个样子） */
  raw: string;
}

/**
 * 解析 `manifest.contributes.fileAssociations`（形状 = `{extension, displayName?, role?}`）。
 * `contributes` 过 IPC 是 `Record<string, unknown>`（契约有意开放式）⇒ 这里逐项收窄，
 * 非法项静默跳过；**同一插件的重复扩展名只留首次声明**（后声明不覆盖，与宿主注册序一致）。
 */
export function extractDeclaredExtensions(contributes: unknown): DeclaredExtension[] {
  const raw = (contributes as { fileAssociations?: unknown } | null | undefined)?.fileAssociations;
  if (!Array.isArray(raw)) return [];
  const out: DeclaredExtension[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const entry = item as { extension?: unknown } | null | undefined;
    const declRaw = typeof entry?.extension === "string" ? entry.extension.trim() : "";
    const ext = normalizeExt(entry?.extension);
    if (!ext || seen.has(ext)) continue;
    seen.add(ext);
    out.push({ ext, raw: declRaw });
  }
  return out;
}

/** 参与管理器的一位插件（＝声明了至少一类文件类型的**启用**插件）。 */
export interface DeclaredPlugin {
  pluginId: string;
  /** 显示名（manifest.name ?? pluginId）——**i18n 原文**，渲染前由视图 `t()` */
  name: string;
  version?: string;
  /** 图标裁决结果（`pickIdentityArt`）——透传 PluginCard，管理器不管图标链 */
  manifest?: ManifestIconShape;
  /** 声明序（插件自己的声明序，不是字典序——卡内行的顺序照它） */
  exts: DeclaredExtension[];
}

/** 宿主只读面快照——`listHandlersFor(ext)` 的一项（`displayName` 是**插件**显示名）。 */
export interface HandlerSnapshot {
  pluginId: string;
  displayName: string;
  /** 宿主算出的「当前生效」（覆盖 → 声明序 → 角色兜底）——管理器**只信这个** */
  isCurrent: boolean;
}

/* ── 模型输出 ── */

/**
 * 卡内一行的状态——**六态**（09 图 C5：四态 ＋ 单家可锁 ＋ 无人处理兜底）：
 *   `lock` 当前默认（用户锁定）／`override` 当前默认（用户指定）／`auto` 默认（自动）／
 *   `lost` 候选 · 默认：X／`sole` 唯一处理者（自动）／`orphan` 无人处理 · 角色兜底（X）。
 * 文案由视图给（i18n 归视图），模型只给枚举。失效覆盖**不在这六态里**——它是类的属性，走 `dangling`。
 */
export type RowState = "lock" | "override" | "auto" | "lost" | "sole" | "orphan";

/** 行内下拉的候选（**不含**「自动」项——那一项是视图拼的 i18n 标签）。 */
export interface RowOption {
  value: string;
  label: string;
}

/** 卡内一行（一类扩展名）。 */
export interface ExtRowModel {
  /** 归一化扩展名（无点） */
  ext: string;
  /** 覆盖表存储键（`.ext`） */
  key: string;
  state: RowState;
  /** 失效覆盖：覆盖键仍在、指向的插件却已不在册（E6 惰性——重装即复活）。挂在该类**每一行**上 */
  dangling: boolean;
  /** `lost` 时「默认：X」的 X；其余态是当前生效者（悬停说明用） */
  currentName?: string;
  /** 声明原文——仅在 `raw !== ext` 时给出（悬停提示「声明串 X → 归一键 Y」） */
  rawDeclaration?: string;
  /** 下拉选中值——**覆盖态**：仅当覆盖指向的就是宿主认可的那家才给它，否则 `""`（＝自动） */
  value: string;
  /** 候选（宿主激活序） */
  options: RowOption[];
}

/** 「按插件浏览」的一张卡。 */
export interface CardModel {
  pluginId: string;
  name: string;
  version?: string;
  manifest?: ManifestIconShape;
  /** 卡内行（声明序） */
  rows: ExtRowModel[];
  /** 摘要三数（09 图 `summaryOf`）：声明 N 类 · 竞争 M 类 · 默认持有 K 类 */
  declaredCount: number;
  contestedCount: number;
  holdCount: number;
  /** 本插件声明范围内**有覆盖键**的类（声明序）——卡齿轮「清除相关默认覆盖（N 类）」的 N */
  overrideExts: string[];
  /** 本次是否因搜索才留下（E38 命中卡自动展开） */
  matchedSearch: boolean;
}

/** 竞争区一行（E32 聚合格）。 */
export interface ContestedRowModel {
  /** 格内成员（归一化扩展名，字典序） */
  exts: string[];
  /** 同候选集合签名的**全组**类数（本次搜索过滤后）——用来判断这一格是不是「拆出来的」 */
  groupExtsCount: number;
  /** 格的候选（同一签名 ⇒ 签名内所有类的候选一致） */
  handlers: RowOption[];
  /** 当前生效者显示名（「当前单击打开：X」） */
  effectiveName: string;
  /** 生效词法口径：自动 / 用户指定 / 含用户指定（＝格内是否有人键在生效） */
  source: "auto" | "user" | "partial";
  /** 下拉选中值——整格成员**统一**指向在册候选才是它，否则 `""`（＝自动） */
  value: string;
  /** 格内有覆盖键的类数（菜单「恢复自动」项出不出，看它） */
  overrideCount: number;
  /** 候选家数（「N 家」徽标） */
  handlerCount: number;
}

export interface ManagerModel {
  /** 「需要你做选择的类型」区 */
  contested: ContestedRowModel[];
  /** 「按插件浏览」区 */
  cards: CardModel[];
  /**
   * 导航计数徽标——口径照 08/09 图 `renderNav`：**竞争类型数 ＋ 卡片数**（⛔ 不是聚合行数：
   * 图的 `contested.length` 数的是扩展名，一格含 6 类就计 6——用户关心的是「多少类要我看」）。
   */
  navCount: number;
  /** 参与计数与聚合的竞争类型数（搜索过滤后）——空态判定用 */
  contestedExtCount: number;
}

export interface BuildInput {
  plugins: readonly DeclaredPlugin[];
  /** 归一化 ext → 候选快照（无声明者缺省） */
  handlersByExt: Readonly<Record<string, HandlerSnapshot[] | undefined>>;
  /** 覆盖表原文（键 `.ext`） */
  overrideTable?: Readonly<Record<string, unknown>>;
  /** 搜索词（空 = 不过滤） */
  search?: string;
}

/** 行标签最多列出几个类型——超出走「等 N 类」（08/09 图：`.a / .b / .c 等 6 类`）。 */
export const EXT_LABEL_MAX = 3;

/** 行标签的类型串前缀（`.a / .b / .c`）——`等 N 类` 后缀由视图拼 i18n。 */
export function extLabelHead(exts: readonly string[]): string {
  return exts
    .slice(0, EXT_LABEL_MAX)
    .map((e) => `.${e}`)
    .join(" / ");
}

/* ── 构建 ── */

/** 一类的三问解读：候选是谁、键在不在、生效者是谁。 */
interface ExtFacts {
  handlers: HandlerSnapshot[];
  /** 覆盖值（原始，可能指向不在册的插件） */
  override?: string;
  /** 覆盖值指向**在册候选**（＝真的改了生效结果） */
  overrideInRegistry: boolean;
  /** 当前生效插件 id（宿主 `isCurrent`；宿主没给就退回覆盖/首候选） */
  currentId: string;
}

function factsOf(ext: string, input: BuildInput): ExtFacts {
  const handlers = input.handlersByExt[ext] ?? [];
  const override = readOverride(input.overrideTable, ext);
  const overrideInRegistry = !!override && handlers.some((h) => h.pluginId === override);
  const currentId =
    handlers.find((h) => h.isCurrent)?.pluginId ?? override ?? handlers[0]?.pluginId ?? "";
  return { handlers, override, overrideInRegistry, currentId };
}

/** 卡内一行——状态判据，顺序即优先级（照 09 图 `pillFor` 逐支对译）。 */
function rowFor(pluginId: string, decl: DeclaredExtension, input: BuildInput): ExtRowModel {
  const { handlers, override, overrideInRegistry, currentId } = factsOf(decl.ext, input);
  const dangling = !!override && !overrideInRegistry;

  let state: RowState;
  if (handlers.length === 0) state = "orphan";
  else if (handlers.length === 1) {
    state = currentId === pluginId && overrideInRegistry ? "lock" : "sole";
  } else if (currentId === pluginId) state = overrideInRegistry ? "override" : "auto";
  else state = "lost";

  return {
    ext: decl.ext,
    key: overrideKeyOf(decl.ext),
    state,
    dangling,
    currentName: handlers.find((h) => h.pluginId === currentId)?.displayName,
    ...(decl.raw && decl.raw !== decl.ext ? { rawDeclaration: decl.raw } : {}),
    // 下拉显示**覆盖态**（03 §4）：覆盖值不在册（浮幽灵）或压根没覆盖 ⇒ 一律回「自动」
    value: overrideInRegistry && override === currentId ? override! : "",
    options: handlers.map((h) => ({ value: h.pluginId, label: h.displayName })),
  };
}

/** 「按插件浏览」的卡（声明序；搜索只整卡过滤，⛔ 不切碎卡内行）。 */
function buildCards(plugins: readonly DeclaredPlugin[], input: BuildInput, q: string): CardModel[] {
  const hit = (s: string) => !q || s.toLowerCase().includes(q);
  const cards: CardModel[] = [];
  for (const p of plugins) {
    if (p.exts.length === 0) continue;
    const rows = p.exts.map((decl) => rowFor(p.pluginId, decl, input));
    if (q && !hit(p.name) && !hit(p.pluginId) && !p.exts.some((decl) => hit(`.${decl.ext}`))) continue;
    cards.push({
      pluginId: p.pluginId,
      name: p.name,
      ...(p.version ? { version: p.version } : {}),
      ...(p.manifest ? { manifest: p.manifest } : {}),
      rows,
      declaredCount: rows.length,
      contestedCount: rows.filter((r) => (input.handlersByExt[r.ext]?.length ?? 0) >= 2).length,
      holdCount: rows.filter((r) => factsOf(r.ext, input).currentId === p.pluginId).length,
      overrideExts: p.exts
        .filter((decl) => readOverride(input.overrideTable, decl.ext) !== undefined)
        .map((decl) => decl.ext),
      matchedSearch: !!q,
    });
  }
  return cards;
}

/**
 * 竞争区（E32 聚合，照 08 图 `renderGroup` 逐行对译）：
 * ① 取候选 ≥2 的类（E29：单 handler 不进此区——没有选择可言）；② 按搜索过滤（类型串或任一候选名）；
 * ③ 按**候选集合签名**（激活序 id 串）分组；④ 签名内再按**当前生效值**分格。
 * 于是「同一批候选 × 同一生效值」并成一行——下拉整格生效；任何一类被单独设置就按生效值
 * 自然分出独立格，恢复自动后并回（`groupExtsCount > exts.length` 时视图给出「整组 M 类中 K 类单独设置」）。
 */
function buildContested(
  plugins: readonly DeclaredPlugin[],
  input: BuildInput,
  q: string,
): { rows: ContestedRowModel[]; extCount: number } {
  const allExts = new Set<string>();
  for (const p of plugins) for (const decl of p.exts) allExts.add(decl.ext);

  const candidates = [...allExts]
    .filter((ext) => (input.handlersByExt[ext]?.length ?? 0) >= 2)
    .sort()
    .filter((ext) => {
      if (!q) return true;
      if (`.${ext}`.includes(q)) return true;
      return (input.handlersByExt[ext] ?? []).some(
        (h) => h.displayName.toLowerCase().includes(q) || h.pluginId.toLowerCase().includes(q),
      );
    });

  const signatures = new Map<string, string[]>();
  for (const ext of candidates) {
    const sig = (input.handlersByExt[ext] ?? []).map((h) => h.pluginId).join("|");
    const bucket = signatures.get(sig);
    if (bucket) bucket.push(ext);
    else signatures.set(sig, [ext]);
  }

  const rows: ContestedRowModel[] = [];
  for (const members of signatures.values()) {
    const handlers = input.handlersByExt[members[0]] ?? [];
    const handlerOptions: RowOption[] = handlers.map((h) => ({ value: h.pluginId, label: h.displayName }));

    const byValue = new Map<string, string[]>();
    for (const ext of members) {
      const { override, overrideInRegistry, currentId } = factsOf(ext, input);
      const value = overrideInRegistry ? override! : currentId;
      const bucket = byValue.get(value);
      if (bucket) bucket.push(ext);
      else byValue.set(value, [ext]);
    }

    for (const [effectiveId, group] of byValue) {
      const exts = [...group].sort();
      const perExt = exts.map((ext) => factsOf(ext, input));
      // 只有**在册**覆盖才算「用户指定」——指向不在册插件的键已回声明序，说用户指定是撒谎
      const strong = perExt.filter((f) => f.overrideInRegistry).length;
      const anyKey = perExt.filter((f) => f.override !== undefined).length;
      const uniform =
        strong === exts.length && new Set(perExt.map((f) => f.override)).size === 1
          ? perExt[0].override!
          : "";

      rows.push({
        exts,
        groupExtsCount: members.length,
        handlers: handlerOptions,
        effectiveName: handlers.find((h) => h.pluginId === effectiveId)?.displayName ?? effectiveId,
        source: strong === 0 ? "auto" : strong === exts.length ? "user" : "partial",
        value: uniform,
        overrideCount: anyKey,
        handlerCount: handlers.length,
      });
    }
  }
  return { rows, extCount: candidates.length };
}

/** 组装管理器模型（纯函数）。 */
export function buildManagerModel(input: BuildInput): ManagerModel {
  const q = (input.search ?? "").trim().toLowerCase();
  const cards = buildCards(input.plugins, input, q);
  const { rows: contested, extCount } = buildContested(input.plugins, input, q);
  return {
    contested,
    cards,
    navCount: extCount + cards.length,
    contestedExtCount: extCount,
  };
}
