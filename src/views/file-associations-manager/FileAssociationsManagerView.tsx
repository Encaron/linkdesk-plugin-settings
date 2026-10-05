/**
 * FileAssociationsManagerView——「默认打开方式」管理器（设置页第二入口）的整组视图。
 *
 * 权威图：`docs/04-软件更新/待抉择池/文件打开方式与贡献点/mockups/08-设计图-设置页-默认打开方式-整页拟真.html`
 * （整页结构/交互）＋ `09-…-插件卡共享件.html`（卡与行的逐元素规格）。本件把两图翻译成真件：
 *
 * | 图上的东西 | 真件 | 备注 |
 * |:--|:--|:--|
 * | 「需要你做选择的类型」区（聚合格 ＋ 下拉 ＋ 「N 家」徽标） | 本文件 `ContestedRow`（私有 `.settings-*` 行） | 下拉＝第三个写入面，与选择器/卡行同一真源（E31） |
 * | 「按插件浏览」区的卡 | 共享件 `PluginCard`（`@linkdesk/ui`） | 卡头身份/展开/齿轮/停用态随件；**卡体行清单由本文件组装**（D10：行的徽标与下拉是「文件关联」专属词汇，⛔ 不进共享包） |
 * | 行内下拉 | 共享件 `SelectBox`（OverlayPortal 渲染，卡体滚动不被裁剪 E37） | 候选 = 「自动」＋全部候选插件（宿主激活序，显示名由宿主给） |
 * | 状态徽标 | 本文件自己的胶囊（六态 ＋ 失效覆盖红点 C5） | 文案逐字照 09 图 `pillFor` |
 *
 * ## 两处「不做什么」的硬口径
 *
 * - ⛔ **不自己算谁是默认**：一律读宿主 `listHandlersFor` 的 `isCurrent`（判定归壳）。管理器只负责
 *   「把宿主给的候选与生效值摆出来」，以及把用户的选择经 `setDefault[Bulk]` 交回去。
 * - ⛔ **不自造长尾列表**（E30）：本页只出「需要你选择的」与「按插件浏览」两区，
 *   上百个扩展名靠**搜索**（复用设置页既有搜索框，E38）＋展开摊开，永不平铺全量。
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, ContextMenu, HintTip, PluginCard, SelectBox } from "@linkdesk/ui";
import type { MenuItemDescriptor } from "@linkdesk/contracts";
import { extLabelHead, type CardModel, type ContestedRowModel, type ExtRowModel, type ManagerModel } from "./model";
import { FILE_ASSOC_GEAR_COMMANDS, OPEN_WITH_COMMAND_ID } from "./fileAssociationsGearTarget";
// 本管理器私有样式（族段 `settings-assoc-*`）——只本件用，就地 import（⛔ 不并进设置页那三件）
import "./file-associations-manager.css";

/** 卡体行高/体限高的尺寸纪律住 CSS（`.settings-assoc-row` 30px、卡体 280px 滚动——09 图 §尺寸表） */

interface Props {
  /** 设置页既有搜索框的词——⛔ 不另造第二把检索（E30） */
  search: string;
  model: ManagerModel;
  loading: boolean;
  ready: boolean;
  error: string | null;
  /** E39：`file-tree.openWith` 是否在册——不在则「在文件树中打开选择器」整条不出现 */
  openWithAvailable: boolean;
  /** 写入面（hook 提供）：`pluginId: null` = 恢复自动 */
  onPick(exts: readonly string[], pluginId: string | null, label?: string): void;
}

export default function FileAssociationsManagerView({
  search,
  model,
  loading,
  ready,
  error,
  openWithAvailable,
  onPick,
}: Props) {
  const { t } = useTranslation();
  const q = search.trim();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // C6 搜索联动：命中（本卡在当前搜索结果里）⇒ 自动展开。清空搜索**不收回**（用户自己收——
  // 展开态是受控的、策略归管理器，见 PluginCard 的 expanded 契约）。
  const matchedIds = model.cards.map((c) => c.pluginId).join("|");
  useEffect(() => {
    if (!q) return;
    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const c of model.cards) {
        if (!next[c.pluginId]) {
          next[c.pluginId] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [q, matchedIds, model.cards]);

  const toggleCard = useCallback((pluginId: string, next: boolean) => {
    setExpanded((prev) => ({ ...prev, [pluginId]: next }));
  }, []);

  if (error && !ready) {
    return <div className="settings-assoc-empty">{t("加载默认打开方式失败：{{msg}}", { msg: error })}</div>;
  }
  if (loading && !ready) {
    return <div className="settings-assoc-empty">{t("加载中…")}</div>;
  }

  const nothing = model.contested.length === 0 && model.cards.length === 0;
  // 搜索无匹配 —— 独立一句（第三处空态）：两区都空且是搜索造成的，说「没有匹配」而不是
  // 分别对用户说「没有竞争类型」「没有声明插件」（那两句在搜索态下是误导：明明有，只是没匹配上）
  if (q && nothing) {
    return <div className="settings-assoc-empty">{t("没有匹配的类型或插件")}</div>;
  }

  return (
    <div className="settings-assoc">
      <div className="settings-subsection">
        <h3 className="settings-subsection-title">{t("需要你做选择的类型")}</h3>
        {model.contested.length === 0 ? (
          <div className="settings-assoc-empty">{t("（当前没有多家竞争的类型）")}</div>
        ) : (
          model.contested.map((row) => (
            <ContestedRow
              key={row.exts.join("|")}
              row={row}
              openWithAvailable={openWithAvailable}
              onPick={onPick}
            />
          ))
        )}
      </div>

      <div className="settings-subsection">
        <h3 className="settings-subsection-title">{t("按插件浏览")}</h3>
        {model.cards.length === 0 ? (
          <div className="settings-assoc-empty">{t("（没有声明了文件类型的插件）")}</div>
        ) : (
          model.cards.map((card) => (
            <AssocCard
              key={card.pluginId}
              card={card}
              expanded={!!expanded[card.pluginId]}
              onToggle={toggleCard}
              onPick={onPick}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ── 竞争区一行（08 图 `rowHTML` ＋ `renderGroup` 的聚合格） ── */

function ContestedRow({
  row,
  openWithAvailable,
  onPick,
}: {
  row: ContestedRowModel;
  openWithAvailable: boolean;
  onPick(exts: readonly string[], pluginId: string | null, label?: string): void;
}) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  // 行标签：最多 3 类直列，超出走「等 N 类」（08：`.a / .b / .c 等 6 类`）
  const label = extLabelHead(row.exts);
  const more = row.exts.length > 3 ? t(" 等 {{count}} 类", { count: row.exts.length }) : "";
  const sourceWord =
    row.source === "user" ? t("（用户指定）") : row.source === "partial" ? t("（含用户指定）") : t("（自动）");
  // 「拆格提示」：本格是签名组的一部分时才说（E32：单类被单独设置 ⇒ 按生效值分出新格）
  const splitHint =
    row.exts.length < row.groupExtsCount
      ? t(" · 整组 {{total}} 类中 {{count}} 类单独设置", { total: row.groupExtsCount, count: row.exts.length })
      : t(" · 下拉＝整格生效");

  // 菜单项：零覆盖不给「恢复自动」（点了什么也不会发生——ContextMenu 的 items **没有置灰能力**，
  // 无 disabled 态，所以「零覆盖」的表达只能是**不出这一项**；02 E39 同款取舍）。
  const items: MenuItemDescriptor[] = [];
  if (row.overrideCount > 0) {
    items.push({
      command: FILE_ASSOC_GEAR_COMMANDS.clearRow,
      label: t("恢复自动（本格 {{count}} 类）", { count: row.exts.length }),
      commandArgs: [row.exts],
    });
  }
  if (openWithAvailable) {
    items.push({ command: OPEN_WITH_COMMAND_ID, label: t("在文件树中打开选择器") });
  }

  const openGear = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ x: rect.left, y: rect.bottom + 4 });
  };

  return (
    <div className="settings-row settings-assoc-contested">
      <div className="settings-row-info">
        <span className="settings-assoc-row-label">
          {label}
          {more}
        </span>
        <span className="settings-row-desc">
          {/* 显示名走 <b>：08 图 desc 里生效者是加粗的（一眼看到「现在是谁」） */}
          {t("当前单击打开：")}
          <b>{row.effectiveName}</b>
          {sourceWord}
          {t(" · 候选 {{count}} 家", { count: row.handlerCount })}
          {splitHint}
        </span>
      </div>
      <div className="settings-row-control">
        <Badge>{t("{{count}} 家", { count: row.handlerCount })}</Badge>
        <SelectBox
          className="settings-assoc-select"
          value={row.value}
          options={[{ value: "", label: t("自动") }, ...row.handlers]}
          title={t("{{types}} 的默认打开方式", { types: label })}
          onChange={(v) => {
            const picked = row.handlers.find((h) => h.value === v);
            onPick(row.exts, v || null, picked?.label);
          }}
        />
        {items.length > 0 && (
          <button
            type="button"
            className="settings-row-gear"
            aria-label={t("更多操作")}
            onClick={openGear}
          >
            <span className="codicon codicon-gear" aria-hidden="true" />
          </button>
        )}
      </div>
      {anchor && items.length > 0 && (
        <ContextMenu
          menuId="fileAssociationsRowGear"
          anchor={anchor}
          items={items}
          onClose={() => setAnchor(null)}
          variant="non-modal"
        />
      )}
    </div>
  );
}

/* ── 「按插件浏览」一张卡（09 图 `cardHTML`；卡壳走共享件，卡体行清单在此） ── */

function AssocCard({
  card,
  expanded,
  onToggle,
  onPick,
}: {
  card: CardModel;
  expanded: boolean;
  onToggle(pluginId: string, next: boolean): void;
  onPick(exts: readonly string[], pluginId: string | null, label?: string): void;
}) {
  const { t } = useTranslation();

  const gearItems: MenuItemDescriptor[] = [];
  if (card.overrideExts.length > 0) {
    gearItems.push({
      command: FILE_ASSOC_GEAR_COMMANDS.clearCard,
      label: t("清除相关默认覆盖（{{count}} 类）", { count: card.overrideExts.length }),
    });
  }
  // 复制 id 与「清除」不同：**恒在**（没有覆盖也总有 id 可复制）
  gearItems.push({ command: FILE_ASSOC_GEAR_COMMANDS.copyPluginId, label: t("复制插件 ID") });

  return (
    <PluginCard
      pluginId={card.pluginId}
      {...(card.manifest ? { manifest: card.manifest } : {})}
      title={t(card.name)}
      {...(card.version ? { version: card.version } : {})}
      summary={
        // 09 图 `summaryOf`：三数、「数字加粗」（那是扫一眼就够的信息，别让它在小字里淹掉）
        <>
          {t("声明")} <b>{card.declaredCount}</b> · {t("竞争")} <b>{card.contestedCount}</b> ·{" "}
          {t("默认持有")} <b>{card.holdCount}</b>
        </>
      }
      expanded={expanded}
      onToggle={(next) => onToggle(card.pluginId, next)}
      gearItems={gearItems}
    >
      {card.rows.map((row) => (
        <CardRow key={row.ext} row={row} onPick={onPick} />
      ))}
    </PluginCard>
  );
}

/** 卡体一行：`.ext` ＋ 状态徽标 ＋ 行内下拉（09 图 `.crow` 三段式）。 */
function CardRow({
  row,
  onPick,
}: {
  row: ExtRowModel;
  onPick(exts: readonly string[], pluginId: string | null, label?: string): void;
}) {
  const { t } = useTranslation();

  // 六态文案——逐字照 09 图 `pillFor`。⛔ 字面量必须留在 t() 调用点：本仓字典门禁（ci-verify ⑧）
  // 按 t() 的中文字面量收词，挪进常量表就收不到了，英文界面会漏出中文。
  const pill = (() => {
    switch (row.state) {
      case "lock":
        return {
          tone: "user",
          label: t("当前默认（用户锁定）"),
          hint: t("显式锁定：其他插件后续声明此类亦不漂移"),
        };
      case "override":
        return { tone: "user", label: t("当前默认（用户指定）") };
      case "auto":
        return { tone: "auto", label: t("默认（自动）") };
      case "lost":
        return { tone: "cand", label: t("候选 · 默认：{{name}}", { name: row.currentName ?? "—" }) };
      case "sole":
        return { tone: "auto", label: t("唯一处理者（自动）") };
      case "orphan":
        return {
          tone: "cand",
          label: t("无人处理 · 角色兜底（{{name}}）", { name: row.currentName ?? "—" }),
        };
    }
  })();

  const extText = <span className="settings-assoc-ext">.{row.ext}</span>;

  return (
    <div className="settings-assoc-row">
      {/* 声明原文 ≠ 归一键时才挂提示（「声明串 MX → 归一存储键 mx」，E10/E34）——同值时不挂，免得噪声 */}
      {row.rawDeclaration ? (
        <HintTip
          label={t("声明串 {{raw}} → 归一存储键 .{{ext}}", { raw: row.rawDeclaration, ext: row.ext })}
        >
          {extText}
        </HintTip>
      ) : (
        extText
      )}
      <span className={`settings-assoc-pill settings-assoc-pill--${pill.tone}`} {...("hint" in pill && pill.hint ? { "data-hint": pill.hint } : {})}>
        {pill.label}
      </span>
      {row.dangling && (
        <span className="settings-assoc-pill settings-assoc-pill--dang">
          {t("失效覆盖")}
        </span>
      )}
      <SelectBox
        className="settings-assoc-select"
        value={row.value}
        options={[{ value: "", label: t("自动") }, ...row.options]}
        title={t(".{{ext}} 的默认打开方式", { ext: row.ext })}
        onChange={(v) => {
          const picked = row.options.find((o) => o.value === v);
          onPick([row.ext], v || null, picked?.label);
        }}
      />
    </div>
  );
}
