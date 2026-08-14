---
title: DeepSeek Harness 架构研究报告（含与 opencode / pi 的对比）
date: 2026-08-14
description: DeepSeek 开源 agent 框架 DSH 的深度架构剖析：Cordis 插件框架、事件源会话日志、能力缝三角，并与 opencode / pi 的架构思想对比；附逐项对比表与可借鉴的设计原则
tags:
  - 架构
  - agent
  - harness
  - deepseek
  - opencode
  - pi
  - 架构对比
  - AI 工程
  - 插件架构
  - 调研
---

> **研究主体**：deepseek-ai/deepseek-harness（GitHub 源码 master 分支，commit 基于 2026-08-13 快照）
>
> **研究方式**：拉取源码 tarball + 阅读仓库文档（README / docs/architecture.md / 各包 README / Agent Notes）与核心源码（`packages/core/agent-loop` 等）
>
> **对比对象**：opencode（anomalyco/opencode，原 sst/opencode）与 pi（earendil-works/pi），由两个后台子代理独立抓取源码研究，主代理交叉验证

## 一、项目概览

| 项 | 值 |
| --- | --- |
| 定位 | DeepSeek 官方开源的 agent harness（智能体框架），口号 "Everything is a Plugin." |
| 语言/运行时 | TypeScript（ESM），Node.js ≥ 22.19，pnpm monorepo |
| 规模 | 49 个包分组、约 219 个 @deepseek-ai/dsh-* 包、约 2085 个 TS 源文件、约 45 万行 TS；215 篇文档；387 篇架构决策记录（Agent Notes） |
| 状态 | Developer Preview（0.1.0-rc），明示"未来有破坏性变更"；代码仓库 2026-08-13 公开，约 3.5 万 stars |
| 许可证 | MIT |
| 运行形态 | dsh web（浏览器 GUI，默认 http://127.0.0.1:3080）、dsh --profile headless "task"（一次性任务）、dsh plugin（插件管理） |
| 核心依赖 | Cordis（vendored 插件框架，源自 Koishi 生态的 cordiverse/cordis）+ Schemastery（配置 schema） |

一句话概括：**DSH 把"一个 agent 产品"拆成一张由插件组成的配置树（profile），一切能力（模型适配、工具、会话日志、甚至 agent 主循环本身）都是可被配置替换的插件**，并围绕"会话事件日志"这一唯一事实来源构建了严格的扩展契约。

## 二、总体架构：一切皆插件

### 2.1 Cordis：插拔式运行时框架（vendored）

Cordis 是 DSH 的地基，五个核心概念（[`docs/cordis-primer.md`](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md)）：

1. **插件（Plugin）**：一个实现 `Service` 的对象——可以是带 `inject`/`apply(ctx)` 的函数插件，也可以是 `Service` 子类；Cordis 把它挂载进当前上下文。
2. **上下文（Context）= 服务仓库**：服务以稳定的 `ctx.<key>`（如 `ctx.tools`、`ctx.llm`、`ctx.sessions`）注册，插件按 key 取服务，而不是 import 具体实现。
3. **依赖声明靠 `inject`**：插件声明需要的服务，加载顺序由"服务可用性"驱动而非手工编排，天然支持热插拔（HMR）。
4. **类型化事件**：通过 TS declaration merging 声明事件，按 `emit`（观察）/ `waterfall`（环绕中间件，可短路）/ `parallel`（并行）/ `serial`（有序）四种模式分发。
5. **注册即可逆副作用（effects）**：提示词 section、工具 schema、适配器、provider、监听器都通过 `ctx.effect()`/`ctx.on()` 安装，插件卸载时自动回滚。

### 2.2 Profile / Bundle / Patch：三层配置组合

一个运行中的 `dsh` 是**从空根开始、按顺序叠加配置层**长成的插件树：

- **Profile（档案）**：存放在 Harness home（`~/.dsh/profiles/<name>`），内含 `dsh.profile` 清单（列出要叠加的 bundles）、`cordis.patch.yml`（用户自己的覆盖层）。`web`、`headless` 随安装自带模板。
- **Bundle（组合包）**：Cordis 配置行 + 其装载代码的发行格式。`dsh-base` 是每个 profile 的第一层（模型适配器、工具、持久化、沙箱/审批策略、设置、凭据、遥测等全部基础行）；`dsh-web-app` 叠加浏览器应用；`dsh-headless` 叠加无服务器的单发 runner。
- **Patch（补丁）**：按行 id 定位、**整行替换 config**（不做深合并）或插入新行。层级顺序：bundles（按 profile 清单顺序）→ profile 的 `cordis.patch.yml` → home 级 → `--patch` 覆盖层。因此"模式差异"（如 web 与 headless 的 persona）放在模式 bundle 里，基础行保持中性默认。

`dsh --profile web --dump-config` 可打印本机实际组合出的整棵配置树；**任何一行都可被用户 patch 替换**。这就是"没有特权核心"的落地方式——连 `agent-loop`（`@deepseek-ai/dsh-agent-loop`，第 436 行）都是 patch 里的一行配置，可被上层禁用或替换。

> 精确性注记：主循环"可替换"是**架构取向**而非**开箱能力**——仓库只有一个具体实现（`ReactLoopAgent`），`ctx.agents.setFactory()` 运行时只允许注册一个 factory（第二个直接 throw）；替换主循环需要自行实现 `Agent` 接口并维持整套 `agent/*` 事件与 turn/step 语义契约。它真实差异于 opencode/pi 的地方在于：**循环被当作普通服务对待**（有接口、有注册点、有配置行、可 patch），而不是不可触碰的特权核心。

### 2.3 事件 = 扩展点，且分领域

事件是 DSH 的第一扩展机制，选对领域是改动的第一步：

| 领域 | 语义 | 例子 |
| --- | --- | --- |
| Session events（持久） | 追加到会话日志、经 session/event 广播，必须能跨重启存活 | turn/*、step/*、user/message、assistant/*、tool/* |
| Agent events（agent/*，实时） | 携带活体 Agent，观察/拦截进行中的工作 | agent/pre-step、agent/request、agent/request-error、agent/turn-stopping、agent/inbox/* |
| Capability events（能力缝） | 给能力缝挂策略/适配器，不 import 主循环 | fs/*、tools/*、telemetry/*、hook/* |

`waterfall` 监听器必须调用 `next()` 委托；不调用即短路（这是策略插件的标准写法）。事件签名/载荷由代码生成目录（`docs/subsystems/*.md` 的 cordis-surface 区域）机器校验，防声明与分发点漂移。

## 三、核心运行时（Core spine）

### 3.1 会话 = 追加式事件日志（`dsh-session`，`ctx.sessions`）

DSH 最具标志性的设计：**`Session` 是一个 append-only 的事件日志，是 agent 全部交互历史的唯一事实来源；模型消息历史是从日志 *派生* 的（`deriveMessages()`）**。

- 事件类型通过 merge-extensible 的 `SessionEventMap` 声明合并扩展：插件声明自己的持久事件类型（如 `compaction/*`、`plan/mode`、`goal/change`、`hook/*`），同样进入统一目录。
- 日志之上维护一层 **surface（投影层）**：只有 `user/message`、`assistant/message`、`tool/result` 三种事件可携带 `surfaceOp` 进入模型可见面；**compaction 就是追加一条带 `surfaceOp: {op:'replace', start, end}` 的摘要消息，把旧区间从派生历史中"遮住"，原始日志保持不变** → 重放完全确定。
- **"模型可见 ⟺ 已入日志"（model-visible ⟺ logged）是硬性不变量**：任何进入模型请求的内容必须能从日志重建，运行时 invariant 强制断言。这也是为什么新模型可见输入必须先扩展 `SessionEventMap`。
- 每条 `assistant/message` 记录 provider/model 与精确的 `sourceEventSeqs`（原始 chunk 序号），支撑 replay、KV-cache 友好与崩溃修复（合成 `TOOL_NOT_STARTED` / `TOOL_OUTCOME_UNKNOWN` 结果）。
- 提供 `fork()`（按边界切分带血缘的子会话）、`flush()`（显式持久化屏障）。持久化由插件订阅 `session/event` 写穿（write-behind）+ `session/flush` 落盘实现（`dsh-session-persistence-jsonl` 为默认 JSONL 后端）。

### 3.2 Agent 接口与注册表（`dsh-agent`，`ctx.agents`）

- **`Agent` 接口**是每个插件（UI、hooks、编排器）编程的对象，**零循环依赖**——主循环可替换。
- 消息进入**一个 inbox**，三种投递语义：`followup()`（排入 next-turn FIFO 并唤醒）、`steer()`（排入 next-step 并唤醒）、`inject()`（排入 next-step 不唤醒，等下一次 step 边界被认领）。
- 活体注册表：`register/get/list/roots`，工厂 API `ctx.agents.create()/resume()`（创建/恢复都是"私有作用域+session+driver"的**回滚覆盖事务**，先 unpublished setup 再发布）。
- **进程内 initiator 作用域**：`withInitiator(agent, op)` 基于 `AsyncLocalStorage` 传播"当前发起者 Agent"，让异步驱动链携带身份；子代理的驱动延续带着子身份，父延续自动恢复。这是进程内"谁是谁"的身份基础设施。
- 全生命周期事件词汇（`agent/*`）：created/disposed、status、pre-step、request、request-error、turn-stopping、inbox/inserted|claimed|discarded 等，全部在 `dsh-agent` 声明，不依赖具体循环实现。

### 3.3 Agent 主循环（`dsh-agent-loop`，`ctx.agentLoop`）

README 直言：**"这是 harness 里唯一包含具体循环逻辑的包。其他一切都是抽象服务或挂在扩展点上的插件——新行为进插件，不改循环。"** 实现是 `ReactLoopAgent`（`src/agent.ts` 仅约 500 行 + `tool-calls.ts` 约 290 行）。

- **Turn / Step 模型**：step = 一次模型请求 + 其调用的工具；turn = 0..n 个 step（打开于首次输入被认领，关闭于"不再欠任何东西"）。turn/step 边界都是持久事件。
- 每 step：从日志派生历史 → 组装系统提示词 + 工具 schema → `agent/pre-step`（可 reject 或进入消息批）→ `step/start` → 追加 `user/message` → `agent/request`（可改 provider/model/cwd 变量）→ `llm/stream`（chunk 流，逐块入日志）→ `assistant/message` → 工具调用管线 → `step/end`；若工具请求更多轮或新输入到达则继续下一 step。
- **并行工具调用**：相邻 `parallel` 分类的调用进入有界滚动池（默认上限 10，`maxParallelToolCalls`），`exclusive` 调用是顺序屏障；只有 dispatch/body 重叠，策略、持久结果、上下文保持模型序。并发安全由工具自声明 `isConcurrencySafe(args)`。
- **协作式取消**：整个循环/回合共享一个 `AbortSignal`；`cancel(cause, {keepInbox})` 清空待办/保留下次；取消后的未派发工具调用获得合成 `ABORTED_BEFORE_DISPATCH` 结果入日志。
- 重试策略走 `agent/request-error` waterfall（`dsh-llm-retry` 是可选实现），插件失败只终结当前 turn 而非整个循环。

### 3.4 工具注册表与执行管线（`dsh-tools`，`ctx.tools`）

工具是"模型可见能力"的登记处 + 受管执行管线：

```text
tools/pre-execute（可重排的 allow/deny/ask 闸门）
  → ctx.tools.guard()（单调 owner 策略，之后无法翻案）
  → tools/execute（环绕 wrapper：超时/重试/指标）
  → tools/post-execute（可替换 content/value、block 带反馈、附加上下文）
  → 定义方 finalizeContent（最后的内容不变量，同步且全量）
  → tools/result（只读观察；随后 loop 追加持久 tool/result）
```

关键点：

- `ToolDefinition` 强制声明 **canonical output**（schema + render + 可选 presentationMeta）；body 只返回声明过的 JSON 值，注册时校验。
- **作用域（scope）**：普通插件上下文注册全局工具；`agent.ctx` 注册仅该 agent 可见（shadow 同名全局工具）；`restrict()` 做 agent 级 allow/deny 掩码。
- **Code Mode**（DeepSeek 的招牌能力之一）：`mode: native | code | both`。code 模式只暴露保留的 `run_code` 传输，并在加载的运行时语言里（TypeScript 走 worker-thread 运行时、Python 内置渲染器）**生成确定性 SDK**（精确的 `ToolArgsMap`/`ToolOutputMap` 类型与 `tools` 命名空间）；程序内每次 binding 调用都走完整工具管线，只有外层日志和返回值回到模型上下文；并发调度沿用并行分类契约（子池默认 10）。
- 工具可以自带 **UI 呈现意图**（`presentCall`/`presentResult` 返回 `card: terminal|diff|read|search|web|generic` 卡片），UI 不按工具名特判。
- 错误码体系：`HarnessError` 基类 → `ToolArgsError`（INVALID_ARGS）、`LlmError`（NO_ADAPTER、AUTH、RATE_LIMIT…）等，稳定 `code` 字符串用于路由。

### 3.5 LLM 适配层（`dsh-llm`，`ctx.llm`）

- Provider 中立的流式协议：`stream()` 返回 token 级 chunk 流（`block-start`/`text-delta`/`reasoning-delta`/`tool-call-delta`/`block-end`/`usage`/`finish`），**所有失败归一化为唯一的终结形态 `finish {kind:'error'|'aborted'}`**，消费方用共享的 `BlockAssembler` 组装。
- `LlmAdapter` 抽象基类，唯一必需方法是 `stream()`；`registerAdapter(providers, adapter)` 注册路由，支持 `replace()` 原子换路（HMR 安全：prepared call 绑定精确的适配器注册，防止热替换混用）。
- 适配器能力元数据：`listModels()` / `resolveModelInfo()`（context 窗口、默认 maxTokens、reasoning effort 方言——effort 是适配器所有的不透明字符串，不是核心枚举）。
- **错误分类共享**：`CONTEXT_WINDOW_EXCEEDED` / `QUOTA_EXCEEDED` / `EMPTY_RESPONSE` / `INVALID_CREDENTIAL` 等 provider 中立的稳定 code，两个适配器共用。
- 自带两个真适配器：`dsh-llm-deepseek`（直连 DeepSeek 官方 SSE）与 `dsh-llm-pi-ai`（基于 `@earendil-works/pi-ai` 的通用多 provider 适配器——注意这恰好是 pi 项目的库）；Codex/Claude Code provider 也以 dormant（休眠）方式内置。
- 请求配置 `LlmCallConfig` 是会话级状态，`request/header` 事件把"实际发出的完整请求信封"（含 adapter 默认值标记）记入日志，支持精确重建与 KV-cache 前缀稳定性分析。

### 3.6 系统提示词组装（`dsh-system-prompt`，`ctx.systemPrompt`）

- 插件注册有序 **section**（`order` 排序：-100 是 harness 身份、0 是 deployment persona、100-199 工具指导带）、命名 **variable**（`{{model}}`、`{{cwd}}`，严格插值、未知引用 fail loud）、工具 schema provider、动态 **context**（渲染为有来源的 user-role 快照）。
- `system-prompt/assemble` waterfall 是权威组装点；一个 `complete: true` section 可声明"整个提示词就这个"（兼容性部署用）。
- 工具顺序可显式配置（`toolOrder`，含 `<unlisted-tools>` 余位），把"插件加载顺序伪影"从确定性中剔除。

### 3.7 作用域原语（`dsh-scope`）

`agent.ctx` 的一切注册（工具、section、变量、监听器、guard）都落到该 agent 的 scope 层，视图解析链 `agent → preset → global`，最近层遮蔽最远层；agent 销毁时全部回滚。这是"同一进程跑多个 agent 而互不污染"的关键机制（对比子代理、preset 组合都建立在其上）。

## 四、能力缝（Capability Seams）：Definition / Provider / Consumer 三角

DSH 的**能力缝**模式是仅次于"一切皆插件"的第二大架构思想：一个可替换能力拆成三份——**Service Definition**（声明接口，只依赖 cordis）、**Service Provider**（实现）、**Consumer**（通常是模型可见工具）。"一个缝 = 三角齐全"；一个 provider 替换可以换掉整个产品面的行为。

| 能力缝 | Service Definition（ctx key） | Provider 实现 | Consumer |
| --- | --- | --- | --- |
| 文件系统 | dsh-fs（ctx.fs） | dsh-fs-local（+ 远程/e2b 变体） | dsh-tool-fs（read/write/edit/read_image）、dsh-tool-fs-search（glob/grep） |
| Shell/bash | dsh-shell（ctx.shell） | dsh-bash-local、dsh-bash-sandbox；win32 用 pwsh 对 | dsh-tool-bash、dsh-tool-bash-persistent、dsh-tool-pwsh |
| 子进程 | dsh-subprocess（ctx.subprocess） | dsh-subprocess-local（进程树管理） | shell/fs 缝内部 |
| 沙箱 | dsh-sandbox（ctx.sandbox） | dsh-sandbox-local（Linux bwrap / Landlock、macOS Seatbelt、Windows ACL restricted-token） | dsh-bash-sandbox 等包装 argv |
| 终端 PTY | dsh-terminal（ctx.terminals） | local 实现 | dsh-tool-terminal（terminal_open/read/send/…） |
| LSP | dsh-lsp | 通用 stdio provider | dsh-tool-lsp |
| Web | dsh-web（ctx.web） | search: Exa/Perplexity；fetch: HTTP | dsh-tool-web（web_search/web_fetch） |
| 技能 | dsh-skill（ctx.skills） | dsh-skill-filesystem | dsh-tool-skill + skill-badge |
| Compaction | dsh-compaction（ctx.compaction） | dsh-compaction-basic、dsh-compaction-tool-result-pruner | dsh-command-compact（/compact） |
| 子代理 | dsh-subagent（ctx.subagents） | in-process（fork/spawn）、ACP 等 | dsh-tool-subagent、dsh-tool-subagent-control、dsh-tool-subagent-report |
| 后台任务 | dsh-jobs（ctx.jobs） | dsh-jobs-local | dsh-tool-jobs（job_* 工具） |
| 工作流 | dsh-workflow（ctx.workflowEngine） | dsh-workflow-worker-thread | dsh-tool-workflow、dsh-tool-ralph |
| 代码执行 | dsh-code-runtime（ctx.codeRuntime） | dsh-code-runtime-worker-thread（+ Python） | Code Mode（run_code） |
| Web GUI | — | host 半（apiproxy/webserver/frontend-static）+ client 半（浏览器） | apps/web |

**沙箱策略词汇**（`dsh-sandbox-policy`）：`read-only` / `workspace-write` / `danger-full-access`（只约束文件副作用；网络/进程/syscall 不在词汇内——同世界沙箱，非容器）。`ctx.fs` 之上还有 `dsh-fs-observation-policy`（文件观察策略，也就是本会话里我读文件前要先 read 的那套）与审批（`ctx.approval`，`ask→deny` 降级）与权限预设（`dsh-permission-presets`）。**子代理委托时把策略钉死在委托边界**（`approval: never` + 继承的沙箱 override 写入子日志），防"没人看的审批弹窗"。

## 五、多代理与编排

- **子代理缝（`ctx.subagents`）**：一个服务 API、多个命名 provider（同进程/异进程/未来传输）。两类子代理：**one-shot**（一次性前台委托，`SubagentRun.result` 取最终输出）与 **continuable**（持久化可续子代理：一个持久 Session + 至多一个进程内 Activation；父用 `Agent.followup()` 发消息，冷启动从持久 Session 恢复；settlement 时管理器把"子代理已结束"通知投递给父的 turn 流——由运行时代写、带 `subagent-settled` 来源，不会冒充子代理发言）。depth 单调、策略继承、`listChildren`/`listDescendants` 枚举齐全。
- **后台任务（`ctx.jobs`）**：长任务注册表（bash 持久调用、subagent 后台收集等），job id + owner 隔离 + 流式读取/等待/取消/完成通知，`job_*` 工具组管理。
- **工作流（`ctx.workflowEngine`）**：模型写一段编排脚本（`agent()` / `pipeline()` / `parallel()` hooks），引擎（worker-thread）隔离执行并扇出子代理；`dsh-tool-ralph` 提供 fresh-agent 循环（Ralph 迭代）。
- **目标（`ctx.goals`）**：同会话单一完成目标的事件溯源状态（goal/change 事件、compare-and-set revision、round 预算），`goal-round-driver` 负责跨轮自动继续；激活态（continuation authority）是进程内不持久化的。
- **调度（`dsh-schedule`）**：会话内定时跟进（schedule_create/list/delete）。

## 六、状态、持久化与查询

- 会话持久化：`dsh-session-persistence-jsonl`（默认 JSONL 写穿）；`dsh-session-query-sqlite`（node:sqlite，含全文搜索，可 `openAt: never` 惰性）；`dsh-session-projection`（跨事件的派生投影，供 host/UI 查询与缓存）；`dsh-session-telemetry-otel`（OpenTelemetry）。
- 非会话存储：`dsh-storage`（hub + JSON 后端 + domain 形态）。
- 附件：`dsh-attachment`（内容寻址、不可变身份、本地存储）。
- Spill：`dsh-spill`（超大工具结果溢出到存储，日志里留 preview + locator）。
- 会话标题：LLM 生成（首提示词 / 通用）。
- **Compaction 的三段式**：`compaction/start`（日志锁）→ 摘要 → 一条 `user/message` + `surfaceOp replace`（唯一 surface 突变，锁内）→ `compaction/end`；崩溃留下可检测的孤儿锁。

## 七、安全与策略层

- 沙箱（上文 4 节）：Linux bwrap / Landlock、macOS Seatbelt、Windows ACL restricted-token；无后端时 **fail-closed**（`SANDBOX_UNAVAILABLE`，拒绝裸跑）。
- 审批：`ctx.approval`（ask → 超时 deny 降级）、权限预设、plan mode（软引导；exit 需用户确认）、fs 观察策略。
- 委托策略固定（子代理继承沙箱 + approval never）。
- 错误即类型：`HarnessError` 稳定 code 体系贯穿 LLM/工具/沙箱/工作流。

## 八、前端 / 宿主 / 外部协议

- **Web GUI 双半结构**：Host 半（`packages/host`：`apiproxy` 共享 API 网关、`webserver` HTTP 载体、`frontend-static` SPA 服务、plugin-inventory、directory-picker 缝）+ Client 半（`packages/client`：浏览器侧 shell、连接、对象服务、slots、数十个 `ui-*` 插件如 ui-conversation/ui-tool/ui-trajectory/ui-jobs/ui-subagent/ui-plan/ui-settings）。**Typert** 是一套"类型图"系统：从源码类型生成运行时工件，经 loader/registry 支撑类型化的远程 API（BFF）——客户端与宿主共享类型契约。
- **Headless**：`dsh --profile headless "task"` 单发模式，无监听端口，任务作为普通 user message 提交，等 quiescence，打印最后一条助手文本，退出码由最终 turn 状态决定。
- **外部协议面**：MCP client（stdio/streamable-http，工具以 `mcp__<server>__<name>` 命名并入 `ctx.tools`）、ACP server（自动化 Agent Client Protocol，JSON-RPC stdio）、SDK（out-of-process JSON-RPC + TS client）、hooks 桥（**兼容 Claude Code 与 Codex 的 hook 配置**：`hooks.json` 的 command hook 子集映射到 harness 的类型化拦截点）。
- **自我修改（`packages/extensions`）**：`cordis_*` 工具集（cordis_inspect_self/query/list、cordis_define/undefine/run/stop）让 agent 检查并**挂载/卸载自己的插件**——结合 HMR，agent 可以热改自己的运行时（demo:cordis）。
- **Python SDK**：`python/` 提供 Python 侧 SDK 与内置运行时。
- 工作区实体（`dsh-workspace`）、家目录（`dsh-home-paths`）、匿名身份（`dsh-anonymous-user-id`）、设置（`dsh-settings-file`，`~/.dsh/settings.yaml` 热重载）与凭据（`dsh-credentials-local`，env/.env 引用，密钥不进配置文件）。

## 九、设计原则与工程实践（值得借鉴的部分）

1. **"模型可见 ⟺ 已入日志"**：把不可变性放在最底层，派生一切（历史、replay、UI、遥测、持久化、fork）。
2. **没有特权核心（架构取向）**：主循环也走"接口 + 注册点 + 配置行"的普通服务待遇（唯一交付实现，见 §2.2 注记）；新行为一律挂在文档化的扩展点上（architecture.md 有一张"目标 → 机制"映射表）。
3. **能力缝三角**：Definition/Provider/Consumer 解耦，单点替换换全产品行为。
4. **注册即副作用**：一切贡献返回 disposer，HMR/teardown 可预测回滚。
5. **进程内身份**（initiator scope）与**作用域注册**（agent.ctx）让"多 agent 同进程"成为一等公民。
6. **KV-cache 意识**：每个包的 README 都有"Model Experience"（模型看到什么/Token 成本/KV Cache 影响）三件套——系统提示词与工具 schema 保持 prefix-stable、历史追加式增长、compaction 明确失效点。这是面向生产成本的设计纪律。
7. **机器校验的文档**：事件目录、工具目录、配置目录、模块图全部从源码生成并由 CI 保鲜；包级 invariant companion 在运行时断言关系不变量（如工具 call/result 配对）。
8. **决策记录（Agent Notes）**：387 篇架构决策笔记（implemented/ 描述现状、archived/ 冻结），把"为什么"沉淀在仓库里。
9. **fail loud**：错误配置在加载或最早可判定点炸掉，绝不静默跳过。
10. **HMR 优先**：几乎每个注册点都要求"dispose 后消失"的测试；配置热重载（settings.yaml）。

## 十、局限与风险（批判性视角）

1. **学习曲线极陡**：Cordis、scope 链、能力缝三角、事件领域（session/agent/capability）选择、schemastery 配置——一个新贡献者需要消化大量概念才能动手；文档体系（215 篇）本身也是一座山。
2. **Developer Preview**：`0.1.0-rc` 明示破坏性变更随时来；`SESSION_FORMAT_VERSION` 停在 0、无兼容承诺——不适合急于上生产/存长期数据的场景。
3. **包粒度过细**：219 个 npm 包，依赖图复杂（有自动生成的 module-graph 与 CI 保鲜，但安装/升级/发布成本高）；"一切皆插件"带来大量间接层，阅读调用链成本高。
4. **同世界沙箱的边界**：沙箱只约束文件副作用（read-only/workspace-write/full），网络/进程/syscall 不在词汇内；容器/microVM/远程执行（E2B 目前是 POC）才覆盖，而 E2B 明确标注"不是完整 harness 运行时"。
5. **"模型可见 ⟺ 已入日志" 的代价**：一切模型输入都要过日志 → 新增模型可见能力必须设计新 session 事件并承担持久化/重放成本；轻量实验场景显得笨重。
6. **进程内模型**：initiator scope、scope 注册、子代理 Activation 都是进程内的——跨进程/分布式（多机器共享一个持久存储）仍需邮件信箱/租约等未实现协议（README 自述）。
7. **循环极薄 vs 功能外置**：把"调用模型、跑工具、循环"以外的一切交给插件意味着行为分散在几十个包里，靠事件顺序与 waterfall 纪律维系，调试时心智负担不小。
8. **面向 DeepSeek 自家模型默认**：默认 provider 是 deepseek-official + deepseek-v4-flash；虽然后端适配是开放的（pi-ai 通用适配器等），但"开箱即用"的体验默认绑定自家服务。

## 十一、与 opencode / pi 的对比

> 说明：本节基于对三个项目的源码/文档研究。pi 指 [earendil-works/pi](https://github.com/earendil-works/pi)（AI agent toolkit，~8.9 万 stars，TypeScript）；opencode 指 [anomalyco/opencode](https://github.com/anomalyco/opencode)（原 sst/opencode，"The open source coding agent"，~19.7 万 stars，TypeScript/Bun）。

### 11.1 三方定位速览

| 维度 | DeepSeek Harness (dsh) | pi | opencode |
| --- | --- | --- | --- |
| 定位 | 平台化的 agent harness/框架："一切皆插件"，研究+产品双用 | 极简 harness + 终端工具链："最小内核 + 激进可扩展" | 终端 coding agent 产品，TUI 优先，兼有云服务/桌面端 |
| 形态 | Web GUI（默认 3080 端口）、headless CLI、ACP/SDK 服务端 | CLI + TUI + 可嵌入 SDK + RPC 服务器 | CLI + 全功能 TUI + IDE 插件（VSCode/JetBrains/Zed）+ HTTP server/SDK + Web 控制台/桌面端 |
| 语言/运行时 | TypeScript ESM，Node ≥ 22 | TypeScript，Node ≥ 22（可擦除 TS） | TypeScript，Bun（workspace 单仓库，~66.7 万行 TS） |
| 规模 | ~219 个 npm 包 / ~45 万行 TS | 10 个包（ai/agent/coding-agent/tui/…） | 25+ 包：opencode（V1 主程序）、core（V2 Effect 内核）、tui、llm、plugin、sdk、app/web/desktop 等 |
| 许可证 | MIT | MIT | MIT |
| 核心框架 | Cordis 插件框架（vendored） | 自研分层（ai → agent-core → coding-agent） | 自研：Effect 全栈 DI/并发（V2 内核）+ 事件 manifest 驱动的 client/server 协议 |
| 多代理 | 一等公民：子代理缝（one-shot/continuable）、jobs、workflow、goal、subagent 工具 | 官方明确不做子代理（"No sub-agents"，推荐扩展/tmux 多开） | 子代理：task 工具按 subagent_type 建 child session（parentID 链、深度限制、后台子代理实验性） |

### 11.2 架构思想对比

**DSH：平台化插件 OS。** 最接近"为 agent 而生的操作系统"：插件树 + 事件总线 + 能力缝三角 + 事件源会话日志，219 个包各自小而专。代价是学习曲线陡峭（Cordis、scope、seam、事件领域四选一……），文档体系庞大；换来的是**任意层可替换**（连 agent 主循环都是插件）、热重载、多 agent 同进程隔离、以及"模型可见 ⟺ 已入日志"的强不变量。

**pi：分层倒置的极简内核。** 作者（badlogic）的哲学是"harness 而非功能堆叠"：核心只有 4 个工具（bash/read/write/edit）与约千 token 系统提示，**没有 MCP、没有子代理、没有权限弹窗、没有 plan mode、没有后台 bash**（隔离交给容器/Gondolin 扩展）。三层 `ai → agent-core → coding-agent` 依赖全部倒置（StreamFn、ToolContext、SessionStorage 接口），每层可独立复用；会话是 JSONL 追加写 + `id/parentId` 的**树结构**（支持原地分支/跨模型续跑）。安全模型是"默认信任、边界外置"（无内置权限系统，建议容器）。

**opencode：事件驱动的产品化 coding agent。** 以"好用"为目标：Bun 单二进制、极速启动、**类型即协议**（30+ 事件命名空间的 EventManifest 同时驱动 HTTP API 路由、生成式 TS 客户端与 TUI 订阅）、V2 内核全面 Effect 化（Context/Service/Layer DI + Schema 编解码 + 结构化并发）。模型 provider 走 models.dev 目录 + 按模型**动态 npm 安装 `@ai-sdk/*` 包** + openai-compatible profiles；工具经统一 `Tool.define` + 通配符权限规则（allow/deny/ask，阻塞式审批）+ 输出截断。会话存 SQLite（bun:sqlite + drizzle + Effect SqlClient，WAL，40+ 迁移），消息按 part 粒度流式落库；快照基于 git 索引支持 revert；压缩用 LLM 生成结构化摘要 + context-epoch 基线。IDE 集成走 client/server 分离：VSCode 扩展是薄封装（拉起 TUI + IPC 注入文件路径），任何客户端经 server/SDK 复用核心。当前处于 **V1 → V2（Effect 内核）渐进迁移期**，两套会话实现并存。

### 11.3 逐项对比（DSH vs opencode vs pi）

| 能力/机制 | DSH | pi | opencode |
| --- | --- | --- | --- |
| 会话事实来源 | 事件源日志（append-only + surface 投影派生消息历史，强不变量） | JSONL 会话树（每行带 type，id/parentId 支持分支） | SQLite（WAL，message/part 表，part 粒度流式 delta 落库；session_input 事件收件箱） |
| 历史压缩 | compaction 缝：summary 替换 surface 区间，原始日志保留、可重放 | harness 自动压缩（文件操作摘要 + 分支总结） | LLM 结构化摘要（Objective/Details/WorkState/NextMove 模板 + 旧摘要合并）+ context-epoch 基线快照 |
| 系统提示组装 | 插件 section/variable/tools 注册 + 组装 waterfall | 基于 prompt templates/扩展注入，可裁剪 | 环境+指令+MCP 说明+skills 组装；plugin chat.params 钩子可改 |
| 工具执行管线 | pre-execute→guard→execute→post-execute→finalize→result，含 allow/deny/ask | AgentTool 接口 + TypeBox 参数校验，串行化文件修改 | 统一 Tool.define + Effect Schema 校验 + 权限规则评估 + 输出截断；doom-loop 检测；并行 tool call 由 AI SDK 负责 |
| 权限/审批 | 沙箱模式（read-only/workspace-write/full）+ 审批服务 + 权限预设 + fs 观察策略 | 无内置（建议容器化） | permission 规则（{permission, pattern, action: allow/deny/ask} 通配符 + findLast）；阻塞式 ask + CorrectedError 反馈回喂模型 |
| 沙箱 | bwrap/Landlock/Seatbelt/Windows ACL，fail-closed | 无（Gondolin/容器扩展） | 无进程沙箱内置；shell 工具用 tree-sitter 解析命令树识别文件系统副作用以匹配权限规则 |
| 代码执行 | Code Mode（run_code + 生成的 SDK，TS/Python） | 无（bash 即执行） | 通过 bash；另有 codemode/containers 方向 |
| 多 agent/编排 | 子代理（one-shot + continuable）、jobs、workflow 脚本、goal 轮次、ralph | 无子代理；RPC 多会话 | task 工具（subagent_type、parentID 链、深度限制、后台子代理实验性）；server 模式多会话 |
| 模型 provider | 适配器缝 + DeepSeek 官方；pi-ai 通用适配器；Codex/Claude dormant | pi-ai：30+ provider、模型目录代码生成、订阅 OAuth | models.dev 目录（上百家）+ 按模型动态安装 @ai-sdk/* + openai-compatible profiles + 插件 provider/auth hook |
| 外部协议 | MCP client、ACP server、JSON-RPC SDK、Claude Code/Codex hook 兼容 | RPC（CBOR+长度前缀帧）；无 MCP | MCP 客户端（stdio/streamable HTTP/SSE + 远程 OAuth）；opencode serve HTTP server + 生成式 TS client/SDK |
| 扩展机制 | 插件树（配置即组合）+ HMR + 自修改（cordis_* 工具） | extensions/skills/prompt templates/pi packages | plugin hooks（chat.message/params/headers、permission.ask、tool.execute.before/after、tool.definition…） |
| 自我修改 | 支持（agent 挂载/卸载自己的插件） | 无 | 无 |
| Web/IDE | 自带完整 Web GUI（host/client 双半 + Typert 类型化 RPC） | TUI 为主；无官方 IDE 插件 | TUI + VSCode/JetBrains/Zed 集成（client/server 复用核心）+ Web 控制台/桌面端 |
| 评测/研究 | BENCHMARK、ACP、Python SDK、e2e 快照测试体系 | evals 包（模型驱动行为评测） | 无专门评测框架 |

### 11.4 架构思路的异同与借鉴

**共同点（2026 年 agent 框架的共识）**：

1. **结构化会话/消息** 作为第一公民：三家的消息都带类型化块与来源，UI、日志、传输、持久化共用一份协议（DSH 的 `Message`/`ContentBlock`、pi 的 `AgentMessage`/`AssistantMessageEvent`、opencode 的消息类型）。
2. **UI 与核心解耦**：DSH 的 host/client 双半、pi 的 interactive mode 只渲染、opencode 的 client/server 分离——都是同一思路：核心可被任何前端复用。
3. **KV-cache/成本意识**：DSH 每个 README 的 Model Experience 三件套、pi 的 Usage 统一核算、opencode 的 cache 感知 compaction——大模型成本直接进架构。
4. **兼容既有生态**：DSH 的 MCP + Claude Code/Codex hook 桥、pi-ai 内置 opencode-zen/opencode-go provider、opencode 的 MCP——互操作是标配。

**关键差异（设计哲学分叉）**：

- **框架 vs 产品**：DSH 是"可组装的平台"（配置树决定一切，研究/评测/自修改皆可），pi/opencode 是"开箱即用的工具"（默认配置少、上手快）。DSH 的 219 包/文档体系对普通用户是负担，但换来的是三家里最强的可替换性与同进程多 agent 能力。
- **安全模型**：DSH 把沙箱+审批做进内核（fail-closed）；pi 明确"默认信任、边界外置"；opencode 居中（permission 预设，无进程沙箱）。
- **极简 vs 完备**：pi 主动砍掉 MCP/子代理/plan mode（哲学选择）；DSH 全部做成一等能力；opencode 按产品需求取舍。
- **执行模型**：DSH 的 turn/step 事件源模型可完全重放与审计（适合评测/安全敏感场景）；pi/opencode 的会话模型更轻、更适合日常交互开发。

**若要在自己项目里借鉴**：

- 借鉴 DSH 的 **"模型可见 ⟺ 已入日志"** 与事件源会话：复杂/长程/需审计的 agent 值得这个代价；
- 借鉴 pi 的 **依赖倒置分层**（内核不 import provider、宿主注入流式函数）快速搭出可复用内核；
- 借鉴 opencode 的 **client/server 分离 + 单一 TUI** 做出产品感；
- 三者共同点——**先定消息/事件协议，再写循环**，是 agent 项目最划算的第一笔投资。

## 十二、结论

DeepSeek Harness 的架构思路可以浓缩为三句话：

1. **把"产品"降维成"配置树"**：通过 Cordis 插件框架 + Profile/Bundle/Patch 分层组合，DSH 做到了没有特权核心——模型适配、工具、会话、乃至 agent 主循环都走"配置行 + 接口 + 注册点"的普通服务待遇（注意：主循环仅有一个交付实现，"可替换"是架构取向而非开箱能力，见 §2.2 注记）。这是"一切皆插件"的真正含义，也是它与 opencode/pi 最大的分野：后者把扩展点设计在**接口层**（provider、工具、插件钩子），DSH 把扩展点设计在**组合层**（整棵运行时都可重组、热重载、自我修改）。
2. **用事件源会话日志当唯一的真**："模型可见 ⟺ 已入日志"让历史派生、重放、持久化、UI、遥测、fork、compaction 全部收敛到一个 append-only 日志上，换来极强的一致性与可审计性（代价是复杂性与学习成本）。
3. **能力缝三角让单点替换换全产品行为**：Definition/Provider/Consumer 的解耦（bash、fs、sandbox、subagent、workflow……）使 DSH 能"换一个 provider 就换掉整个产品面的行为"，这也是它适合做研究/评测/平台化场景的原因。

与 opencode（产品化、Effect 化、类型即协议的终端 agent）和 pi（依赖倒置的极简 harness）相比，DSH 是三家中最"重"也最"平台化"的一个：适合需要深度定制、多 agent 同进程、可审计/可评测的场景；而日常终端编码、追求开箱即用体验的场景，opencode/pi 的轻量路线仍更顺手。三者不约而同地把**结构化消息/事件协议**与 **UI 与核心解耦**作为第一性设计，这可以视为 2026 年 agent 框架的行业共识。

