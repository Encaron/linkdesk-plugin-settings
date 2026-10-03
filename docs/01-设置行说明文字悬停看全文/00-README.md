# 05-插件更新 · 设置（设置行说明文字：悬停看全文）

> 🏠 **本档已归还本插件仓（2026-10-04）**——原住壳仓 `docs/05-插件更新/设置/`，按「主仓代工的插件升级点，收口 ＋ 发版 ＋ 官方目录收录后归还插件仓 `docs/`」的流程搬入（壳仓 skill `plugin-upgrade-return`）。**此后这只插件的专项档案就记在这里**；壳仓 05 只留一行指针。
> ⚠️ 正文里的「本仓 / 壳仓」措辞是立案时（档案住壳仓）的口径：**「本仓」= 壳仓 linkdesk**；壳仓文档入口 = <https://github.com/Encaron/linkdesk/tree/electron/docs>。
> 立案：2026-10-04（用户）。**状态：✅ 已收口**——插件 v1.0.30 已发 Release、官方目录已收录、壳仓出厂种子已刷新、档案已归还（实绩见 §四）。
> 一句话：设置行 label 下面那行**说明**被单行省略号截断（`marketplace.marketplaceSources` 这类长说明**全屏也显示不全**）⇒ 鼠标悬停时把**完整文字**出成提示条。用的是 04「悬停提示系统」的**揭示类**（`data-hint` ＋ `data-hint-delay="0"`），**随壳 v0.2.20 已发布**，本刀**壳侧零改动**，插件侧只有一行声明。

| 项 | 值 |
|:--|:--|
| 类别 | **05-插件更新（设置插件专项）**——为什么不是 04：要改的 DOM/CSS（那句说明的截断三件套）住在设置插件里，而**壳侧揭示机制早已发布**（v0.2.20）⇒ 本刀两仓零壳改。判据出处：2026-10-02 用户拍板「设置页那套内置 UI 也是一台普通『设置插件』，可被第三方整套替换」（CLAUDE.md 硬约束 11） |
| 插件 | `settings`（设置，随包 6 只基础插件之一 · `core: true`） |
| 版本 | 1.0.29 → **1.0.30**（同值改 `plugin.json` ＋ `package.json`——版本真源是 `plugin.json`） |
| 源码仓 | 本仓（`Encaron/linkdesk-plugin-settings`） |
| 壳改动 | **无**（属性式铁律：插件在自己 DOM 上写属性即可，**不 import 壳任何东西**） |
| 依据 | [04「悬停提示系统」](https://github.com/Encaron/linkdesk/blob/electron/docs/04-软件更新/已落地/悬停提示系统/00-README.md)——**揭示类**定义与既有先例见其 [01-设计 §一·1.2 / §四·4.1](https://github.com/Encaron/linkdesk/blob/electron/docs/04-软件更新/已落地/悬停提示系统/01-设计.md)；设置插件本身已在 [v1.0.19 那批收编](https://github.com/Encaron/linkdesk/blob/electron/docs/04-软件更新/已落地/悬停提示系统/00-README.md) 里有 6 处揭示类（`imagePicker` 路径、`renderControl` 色值）——**本刀是同一批的续**，不是新机制 |
| 验收 | dev 实机目视：长说明行悬停 → 出完整文字、**立刻出**（延时 `0`）；短说明行无观感变化；空白说明行**不出空条** |
| 归档去向 | ✅ **已归还本仓 `docs/`**（2026-10-04）；壳仓 05 只留指针 |

## 一、用户原话与边界

> 「我想让设置页内每个配置项下面的文字，鼠标瞄上去时候可以显示为hint-tip，因为很多字很长，后面就显示为三个点了，所以我想让它这么显示。你看看，能否实现，然后这个是属于04-软件更新还是05-插件更新？」
> 「比如 `marketplace.marketplaceSources`，它下面的『商店拉取…』之类的文字后面就是 `...`，哪怕我全屏都无法显示，所以需要 hint-tip。」

**做**：设置行**说明文字**（`.settings-row-desc`）悬停出全文。
**不做**：
- **标签**（`.settings-row-label`，印的是配置键原文如 `marketplace.marketplaceSources`）——它挂着**同一套**截断三件套、同样会被截，属**同类遗留**（既有账：[本仓 `docs/00-README.md` §六·5](../00-README.md)「设置行标签 = 原样配置键」）；本刀按用户原话（「**下面的**文字」）只动说明，标签另议。
- 不给提示加「只在真被截断时才出」的测量——照**揭示类既有 13 处先例一律常挂**（壳侧 `Badge`/色板/侧栏标题、插件侧 `imagePicker`/`renderControl` 都是常挂）。真测量＝新机制，见 §五。

## 二、落点与实现（插件侧三件）

行骨架＝本仓 `src/views/SettingsView/SettingRow.tsx`（行尾说明那行原文：`<span className="settings-row-desc">{t(description ?? prop.description ?? "")}</span>`）；截断三件套在 `src/views/SettingsView-rows.css` 的 `.settings-row-desc`（`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`）——**CSS 不动**（提示条在 `OverlayPortal` 里，不受这行裁切管辖；`HintTip.css` 已是 `max-width: 300px` ＋ `overflow-wrap: anywhere`，长说明自动折行、**夹紧不裁字**）。

| # | 件 | 落点 |
|:--:|:--|:--|
| 1 | 纯函数 `descHintAttrs(text)` | 本仓**新增** `src/views/SettingsView/SettingRow/descHint.ts`——返回 `{ "data-hint": text, "data-hint-delay": "0" }`；**空文案返回 `{}`**（⛔ 不留 `data-hint=""`——虽然壳渲染器的空文案守卫也不会出条，但少一个属性 = 少一处依赖别人的守卫） |
| 2 | 单测 | 本仓**新增** `src/__tests__/views/SettingsView/descHint.test.ts`（纯函数、零 IPC——照同夹 `actionDisabled.test.ts` 先例）；已 **falsify**（把延时改成 `120` ⇒ 判据翻红，改回即绿 ⇒ 判据不是恒绿） |
| 3 | 接线 | `SettingRow.tsx` 把那段文案提成 `const descText = t(description ?? prop.description ?? "")`，同一变量既做**内容**又做**提示文案**（一处真相源，⛔ 不写两遍表达式）⇒ `<span className="settings-row-desc" {...descHintAttrs(descText)}>{descText}</span>` |

**为什么提纯函数而不是内联属性**：内联也成立（本仓已有 10+ 处内联 `data-hint`），但本刀有两个**判据**要在测试里钉住——**揭示类延时必须是 `0`**（「看全被截断的字」不该等 120ms）与**空文案零属性**。提成 `SettingRow/` 下的纯函数与同夹 `actionDisabled.ts`／`gearMenu.ts` 同款，判据可跑、可回归。

## 三、判据（机械证据）

| # | 判据 | 证据 |
|:--:|:--|:--|
| ① | 揭示类属性正确（延时 `0`） | `descHint.test.ts`：非空文案 ⇒ `data-hint` = 原文 ＋ `data-hint-delay` = `"0"` |
| ② | 空文案零属性（负控） | 同上：`""` / 空白 ⇒ 结果**无** `data-hint` 键（`{}`） |
| ③ | 文案**单源** | 内容与提示同取一个 `descText` 变量（接线即判据，肉眼可查） |
| ④ | 本仓三门 | `npm run test` / `npm run verify`（严格腿）/ `npm run build` 全绿 |
| ⑤ | 壳侧零改动 | 壳仓 `src/` `electron/` 零改动（本刀只刷出厂种子 `bundled-plugins/`） |
| ⑥ | 包内不进 `docs/` | `npm run build` 后列 zip 条目 = **15 条**（含 `i18n/` `resources/` `views/` 三个目录条目），`docs/` 命中 **0**；包内 `plugin.json` = 1.0.30、`data-hint` 出现 21 次（打包红线，实列非推理） |

## 四、发版链与归还（实绩，2026-10-04）

| # | 环节 | 结果 |
|:--:|:--|:--|
| 1 | 本仓改码＋版本 | `plugin.json` ＋ `package.json` → **1.0.30**；`CHANGELOG.md` 加 `## v1.0.30（2026-10-04）` 段；`test` / `verify` / `build` 全绿 ⇒ 提交 `4c1344f`，带代理推 |
| 2 | Release ＋ 资产 | `npm run build` **先于** `npm run publish`（SDK publish 复用 dist）；`publish -- --yes` 建 **Release `v1.0.30`** ＋ 资产 `settings.linkdesk-plugin`（**30,382 B**）。⚠️ 当日 GitHub API 抖动（建 Release `504`、传资产 `502`）⇒ `gh release upload --clobber` 补资产，第三步（本仓根 `marketplace.json`，走 Contents API）用 SDK 自身导出的纯函数离线补写 ⇒ 本仓根目录 catalog 追平 1.0.30，提交 `c7e64dc` |
| 3 | **官方目录收录** | `E:\linkdesk-plugins\linkdesk-marketplace\marketplace.json` **只动 settings 一行**（版本／直链／体积／发布时间／版本历史），其余 17 行逐字节原样 ⇒ 提交 `a1f7584`（另一会话同刻在收录 lang-defaults ⇒ 先 `reset --hard origin/main` 再重跑「只合并本插件一行」脚本，脚本内含其余行同字节断言）。收录后 settings = **1.0.30**、下载直链 `…/releases/download/v1.0.30/settings.linkdesk-plugin`、体积 30,382 B |
| 4 | 壳仓刷种子 | `npm run sync:bundled -- --latest` ⇒ `bundled-plugins/settings.linkdesk-plugin`（sha256 `dd45157a885aa8a84d647f0f46724db5e0269a6c0c05b4ea03729c6181b13d62`）＋ `bundled-plugins.lock.json`（**只 settings 一条动**）；门禁 `check-bundled-freshness` 守 |
| 5 | 归还 | 本档搬入 `docs/01-设置行说明文字悬停看全文/` ＋ 顶部归还横幅 ＋ 壳仓相对链改 GitHub 绝对链；壳仓 `git rm docs/05-插件更新/设置/` ＋ 05 索引行改指针 |
| 6 | 复核 | 本地种子 sha256 **== Release 资产 digest**（逐字节同，同一份包）；官方目录 raw CDN 与 API 双侧均报 1.0.30；包内 `plugin.json` = 1.0.30、`data-hint` 出现在发货产物中 |

## 五、遗留（记账，不在本刀）

| # | 事项 | 说明 |
|:--:|:--|:--|
| 1 | **标签也截断** | `.settings-row-label` 挂着同一套截断三件套，长键名同样显示不全；本刀按「下面的文字」只动说明 ⇒ 标签那半待用户点单（同批可顺手，但会扩大验收面） |
| 2 | **「只在真被截断时出」** | 常挂 = 短说明悬停也出一条内容重复的提示。真测量（`scrollWidth > clientWidth` 才挂属性）＝**新机制**（要 ResizeObserver ＋ 值与挂载时机两处判据），壳侧 `HintTip` 与 13 处先例都没做 ⇒ 本刀跟随现状；用户若嫌噪点，另立 |
| 3 | 延时/位置体感 | 揭示类延时 `0` 与 `top` 落点属体感项，dev 实机试过才算数（同 [04 设计 §十一·3](https://github.com/Encaron/linkdesk/blob/electron/docs/04-软件更新/已落地/悬停提示系统/01-设计.md) 的口径）。⚠️ 本刀**未跑真机目视**，交用户 dev 版验收 |
| 4 | 本仓 `AGENTS.md` | 原账 =「版本行停在 1.0.25、§3 仍说本仓没有 `i18n/`」。**版本行已修**：2026-10-04 壳仓 `scripts/sync-plugin-agents.mjs` 重生（1.0.29→1.0.30），提交 `10c7790`。该文件由壳仓 FACTS 表渲染 ⇒ 描述性内容若仍有偏差，改壳仓表、不在本仓手改 |
