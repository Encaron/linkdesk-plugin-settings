# settings · 设置页左侧导航入口加图标（插件组 manifest 图 ＋ 本体组声明 icon 空消费）

> 🏠 **本档已归还本插件仓（2026-11-07）**——原住壳仓 `docs/05-插件更新/settings-侧栏入口图标/`，按「主仓代工的插件升级点，收口 ＋ 发版 ＋ 官方目录收录后归还插件仓 `docs/`」的流程搬入（壳仓 skill `plugin-upgrade-return`）。**此后这只插件的专项档案就记在这里**；壳仓 05 只留一行指针。
> ⚠️ 正文里的「本仓 / 本刀」措辞是立案时（档案住壳仓）的口径：**「本仓」= 壳仓 linkdesk**；壳仓文档入口 = <https://github.com/Encaron/linkdesk/tree/electron/docs>。
> 立案：2026-11-07（用户点名）。**状态：✅ 已收口**——随 settings **1.0.41** 已发 Release ＋ 官方目录已收录 ＋ 壳仓出厂种子已刷；**2026-11-07 用户 dev 实机看屏通过**（插件组显市场同款图标、本体组维持纯文字、左缘参差接受）；档案同日归还本仓。
> 🔄 **同日二次拍板（用户）**：本体组不配临时图标——「图标是需要设计的，到时候专门开任务」；临时 codicon 映射表整个砍掉，本体组过渡期维持现状；壳侧拆归 04 任务（[内置配置组图标声明](https://github.com/Encaron/linkdesk/tree/electron/docs/04-软件更新/待抉择池/内置配置组图标声明/00-README.md)），本档只做插件侧。
> 归属：**05**（砍临时表后两刀无交织：本刀纯 settings 仓）。案档史：原立 04 待抉择池「设置页入口图标」整夹（两仓交织）→ 拆 05＋04，原夹删除。

## 一、目标与心智模型

- 入口行加 16px 图标＋文字，快速定位。
- 用户拍板的心智模型：**「本质就是调用图标」**——图标栏/标签栏/欢迎页/[+]菜单/市场卡片已是同一台共享件 `PluginIcon`（E2c#19j 统一图标来源），设置侧栏 = 又一个消费方，喂 manifest 即可：零新 API、零新图标资产。

## 二、现状（2026-11-07 侦察，已核实）

- 导航渲染点：`src/views/SettingsView.tsx:225-257`（`<nav class=settings-nav>`，行 = `settings-nav-item` ＋ 右侧计数徽标）。
- 组数据自带 `pluginId`（`src/views/SettingsView/types.ts:12-14` `GroupInfo`，类型层本仓自持）⇒ 加可选 `iconManifest?` 字段零壳依赖。
- 插件组 ⇒ 来源插件必已装（组从其声明长出）⇒ `pluginManager.list()` manifest 必可达；marketIcon publish 时已 URL 化——`PluginIcon` 已封装两条路径解析＋无图默认块。
- 本体组（通用/主题/AI接入/默认打开方式）无 manifest——**本刀不管它的显示**（过渡期维持今天纯文字样），只带「声明 icon 到位自动亮」的空消费。
- 本仓已在用 codicon（`codicon-search` 等）⇒ 池内字体可达（备用信息，本期不用）。

## 三、修法（数据驱动：无映射表、无 id 硬编码）——✅ 已按此落地

1. **对货**：本仓 `@linkdesk/ui`（`^0.2.52`，实解 0.2.52）已导出 `PluginIcon` ＋ `pickIdentityArt`（marketIcon 链齐全）——零 bump。
2. `loadSettingsData` 装配处建 pluginId→manifest 映射（`pluginManager.list()` 一次拉齐，零新 IPC；契约缺省/失败静默空表不阻塞设置页）。
3. 纯裁决器 `src/views/SettingsView/groupIcon.ts`：有 manifest → `pickIdentityArt`（marketIcon ?? icon → 无图默认彩色块，共享件 E6#69a 兜底）；无 manifest 且组声明带 `icon` → 空消费；都没有 → undefined ⇒ 行维持现状（**不预留空槽**——「没有」≠「空着」）。渲染能力全在共享件，本仓只喂数据（判据 A 落位）。
   🔴 **声明 icon 形态归一**（对齐共享件 `resolvePluginIcon` 分发——iconSource 未设时裸词自动拼 `codicon-` 前缀、含 `/`/`.` 一律当插件相对路径拼 linkdesk://，本体组没有插件目录两态都破）：codicon 全名 → 剥前缀＋`iconSource:"codicon"`（防双前缀）；绝对 URL → 原样＋`iconSource:"url"`（跳过相对拼接）；相对路径等契约外形态 → 拒绝（宁缺毋滥）。
4. CSS：`.settings-nav-label`（flex＋8px gap）＋ `.settings-nav-icon`（16px、`--radius-sm`、codicon 形 `--font-size-lg` 满格——PluginCard glyph 同款 token）。无图组不渲染 ⇒ 无空槽。
5. 真机环：`LINKDESK_CDP_PORT=9333 npm run dev:real`——**2026-11-07 用户看屏裁决通过**。
6. 发版链（已走完）：bump（1.0.41 PATCH）→ CHANGELOG → 三门（verify 九段／test 194 例／build 全绿）→ commit `9f3f92b`+push → publish（Release v1.0.41）→ 官方目录收录（`9d7c8b0`）→ 出厂种子刷新。

## 四、契约（05/04 唯一接缝，双向钉死）

- 组声明可选字段 `icon`；值 = **codicon 全名**（`codicon-xxx`）**或绝对 URL**（linkdesk:// / https://）。消费端形态归一见 §三③。
- 声明方 = 壳仓 04 任务（随 0.2.53）；消费方 = 本文 §三③ 空消费，**已随 1.0.41 上线等字段**。改字段名/值形态必须两案同笔。
- 04 出货后已装插件**零再发版自动亮**——空消费的全部意义。

## 五、验收判据（全过，2026-11-07）

1. ✅ 插件组行显该插件市场图标（marketIcon 优先、icon 回退、无图默认块）——dev 实机看屏通过。
2. ✅ 本体组四行过渡期维持现状（纯文字、无空槽）；空消费分支 6 例单测（虚构值，硬约束 21）。
3. ✅ 亮/暗主题＋`--ui-scale` 不破格（token 化尺寸语言）；选中态/搜索过滤态不抖动。
4. ✅ 零新 IPC/零新契约；三门全绿。

## 六、待办（全部收口）

- [x] 对货 `@linkdesk/ui` PluginIcon 导出（0.2.52 已含，零 bump）
- [x] manifest 映射＋导航行 PluginIcon＋空消费（含 6 例单测）
- [x] CSS（设计 skill `ui-ux-pro-max` 门禁前置——既有界面照真件画，尺寸语言对齐 PluginCard）
- [x] dev:real 真机环 → 用户看屏裁决（左缘参差接受）
- [x] 三门 → 1.0.41 发版 → 目录收录（`9d7c8b0`）→ 种子刷新
- [ ] （随壳仓 04 任务）0.2.53 出货后实机复核本体组自动亮——**唯一余项，住壳仓侧**
