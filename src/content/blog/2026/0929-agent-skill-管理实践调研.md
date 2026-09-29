---
title: "Agent Skill 管理实践调研：全局、共享库与 Profiles"
date: 2026-09-29
description: "调研 2026 年社区在 AI Agent Skill 管理上的主流实践：skill 该随 artifact 走、package manager 模型、profile 分发、AGENTS.md vs Skill 的评测结论，并给出一套可直接落地的分层方案"
tags:
  - agent
  - skills
  - AGENTS.md
  - 调研
  - AI 工程
  - 最佳实践
  - 工具链
---

> **调研问题**：现在社区对 skill 的组织管理有哪些更好的实践？具体痛点是——**全局 skill 和项目 skill 管理费劲**；某个项目 skill 偶尔别的项目也要用，**放到全局又发现只有少数项目会用到**，白白拉高每个会话的上下文噪音。
>
> **调研范围**：2026 年公开的技术文章、官方规范、论坛实践帖与企业级架构文章共 9 篇（文末列出）。重点看别人**具体怎么做的**，而不是抽象结论。

---

## 结论先行

社区已经基本收敛到一个判断：**"全局 / 项目"这个二分法本身是错误的抽象**。先进做法普遍把它换成两个更贴切的模型：

- **依赖模型**（像 npm 之于 library）——skill 有独立身份、独立版本、有 merge 故事
- **Profiles**（像 dotfiles profile 之于配置）——skill 集按项目显式激活，而不是"全局全在"

于是原始痛点"只被 2/8 个项目用"在新模型里**根本不再是一个问题**——它只是一个"被 N 个项目声明的依赖"，需要被 `enable`，而不是"被所有人无差别加载"。

---

## 一、Skill 该放在哪层：两个直接回答该问题的强方案

### 1.1 Skill 应该跟着它描述的那个 artifact 走

> 来源：[The Right Skills for the Job: Project-Scoped Agent Skills](https://bitsbytesgates.com/fvutils,/ai/2026/06/06/ContextualAgentConfig.html)（2026-06-06）

**核心主张**：skill 应该**跟着它描述的那个 artifact 一起走**。判断归属不看你有几个项目用，看**谁是这个东西的作者**。

**它对"全局污染"的精确描述**：

> 装 skill 到哪都行，但要么你把所有 skill 永远装上，要么你每次新建 workspace 都得记得装一遍。

**四级发现机制**（按优先级）：

| 优先级 | 机制 | 例子 |
| --- | --- | --- |
| 1 | 消费方指定 glob | `ivpm.yaml` 里写 `skills/**/SKILL.md` |
| 2 | 包自己声明 | 依赖方在自己的 `ivpm.yaml` 写 `with.agents.skills` |
| 3 | 自动探测 | 找包根的 `SKILL.md`，扫 `skills/` 目录（**绝大多数包零配置**） |
| 4 | Python entry point | 查 `agent.skills` entry-point group，包可编程注册 |

**中立目录 + 可选镜像**：

- 总是填充 `.agents/skills/`（toolchain-neutral，任何 skills-aware agent 都能读）
- 你要求时才额外镜像到 `.claude/skills/`
- 目标在项目树内用相对链接，树外用绝对链接，不支持 symlink 的平台退回复制
- 每次 update 清理上次残留的 stale link

配置只有这么一小块：

```yaml
package:
  with:
    agents:
      claude: true   # 额外镜像到 .claude/skills/
```

**实际效果例子**：一个 FPGA 项目依赖 yosys / verilator / nextpnr 三个预编译 EDA 工具（从 EDAPack 二进制发行版拉取），每个 tarball **自带 `skills/` 目录**。`ivpm update` 一条命令后：

```text
.claude/skills/
├── yosys-bin-yosys     -> ../../packages/yosys-bin/skills/yosys
├── verilator-verilator -> ../../packages/verilator/skills/verilator
└── nextpnr-bin-nextpnr -> ../../packages/nextpnr-bin/skills/nextpnr
```

然后直接问 agent："用 available skills 在 Verilator 仿真 blink，跑 yosys + nextpnr 综合到 ecp5"——agent 已经知道 `synth_ecp5` 流程，因为**那个 skill 是跟着综合工具的二进制一起发出来的**。没逛目录、没手动装、没全局 catalog，能力**精确跟随依赖图**。

> **对笔者的启发**：`ke-aoe` / `opencli` / `weapons` / `odin` 这类**工具型 skill**，天然就是"跟着 artifact 走"——它们是各个 CLI 的说明书。合理归属是"工具仓库自带 + 按项目装"，而不是全局常驻。

### 1.2 Package manager 模型：npm for skills

> 来源：[How to Share Skills Across Projects (Without Copy-Pasting)](https://happyskills.ai/blog/share-skills-across-projects/)（软文，但模型讲得最透）

**它对四种常见方案的解剖**（这张表值得单独看）：

| 方案 | 稳定身份 | 独立版本 | merge 故事 | 死因 |
| --- | --- | --- | --- | --- |
| copy-paste | ✗ | ✗ | ✗ | **skill drift** |
| git submodule | ✓ | 手动的 | ✗ | pin 是 detached HEAD 指针，跨项目 update 是手工杂务；在消费项目里改 submodule 内容 = 未提交的 detached 变更 |
| monorepo | ✓ | ✓ | ✓ | 前提是你控制所有项目（现实里往往不成立：有 client 的、开源的、别的团队的） |
| gist / Notion | 模糊 | ✗ | ✗ | 换皮复制粘贴，源和拷贝之间无强制关联 |

跨项目共享需要同时满足三件事：**稳定身份**（这是同一个逻辑 skill）、**独立版本**（"A 在 1.2.0，B 在 1.3.0"是能读出来的事实而不是记忆）、**merge 故事**（两边都改了，能调和）。

**skill drift 的具体形态**：一份 `changelog-writer` 复制到 project A 和 B 之后，A 里同事加了"标记安全相关变更"的规则，B 里你修了日期格式。两份同名 skill，各自在不同方向上悄悄错着，**谁都不是 canonical**。

**具体做法**：

```bash
$ npx happyskills publish changelog-writer
	✓ Validated SKILL.md (frontmatter, description, body)
	✓ Hashed 3 files → sha256-9f2c…a17b
	✓ Published acme/changelog-writer@1.0.0
	  source of truth: registry
```

```bash
$ npx happyskills install acme/changelog-writer
	✓ Resolved acme/changelog-writer@1.0.0
	✓ Verified integrity sha256-9f2c4e…
	✓ Linked into .claude/skills/, .cursor/, .codex/
	✓ Updated skills-lock.json
```

```json
{
  "lockfileVersion": 1,
  "skills": {
    "acme/changelog-writer": {
      "version": "1.0.0",
      "resolved": "registry",
      "integrity": "sha256-9f2c4e8b1d…a17b",
      "base_commit": "9f2ca17b"
    }
  }
}
```

`check` / `pull` 两条命令分别回答"我本地改了吗"和"上游动了吗"；`pull` 是三方合并，冲突时**引导你去解决而不是覆盖你的改动**；发布后保留**双 parent 的 merge commit**，让"两条历史汇合"成为历史里的一条事实。

> **对笔者的启发**：已有的 `skills-manage.json` + cache + symlink 已经是这个模型的手写版，**缺的就是 per-project 声明**。

---

## 二、Profile / 作用域：解决"只有几个项目要用"

### 2.1 Profiles、CI 校验与跨 agent 一致性

> 来源：[Enterprise Multi-Agent Skill Management with `gh skill`](https://antigravitylab.net/en/articles/agents/multi-agent-skill-portability-enterprise-guide)

**场景**：20 个工程师 × 4 个 agent。问题清单："谁拥有哪个 skill？前端和后端工程师怎么拿到不同的 skill 集？怎么在部署前发现坏掉的 skill？"

**三条设计原则**：

1. **skill 里只放 AI 指令**，不放代码、不放配置——只放"review 时该看什么""commit 怎么格式化""什么时候该问确认"
2. **一文件一职责**——code review 一个文件、测试标准一个文件、commit 规范一个文件。单体 skill 文件难改难 review
3. **通用 skill 与 agent 专属 skill 分层**

**仓库结构**（这正是缺的那层作用域）：

```text
enterprise-skills/
├── skill.yaml
├── universal/          # 全 agent
│   ├── code-review.md
│   └── commit-conventions.md
├── domain/
│   ├── frontend/{react.md, accessibility.md}
│   └── backend/{api-design.md, database.md}
├── agent-specific/
│   ├── claude-code/{hooks.md, tool-restrictions.md}
│   └── copilot/completion-hints.md
└── profiles/
    ├── frontend.yaml
    └── backend.yaml
```

**profile 定义与继承**：

```yaml
# skill.yaml
name: enterprise-skills
version: 3.0.0
agents: [claude-code, copilot, cursor, gemini-cli]

profiles:
  frontend:
    skills: [universal/code-review.md, universal/commit-conventions.md, domain/frontend/react.md]
    agents: [claude-code, copilot, cursor]
    agent_overrides:
      claude-code:
        append: agent-specific/claude-code/hooks.md   # 同一 profile，不同 agent 追加不同内容
  fullstack:
    extends: [frontend, backend]                      # profile 可以继承
    additional_skills: [universal/security-checklist.md]
```

```bash
# 入职安装
gh skill install company/enterprise-skills --profile frontend

# 多个 profile
gh skill install company/enterprise-skills --profile frontend,backend
```

**三层 agent 兼容架构**（Claude Code 理解复杂条件指令，Copilot 基本不理解）：

Layer 1 · 通用祈使句（给所有 agent，纯直接指令，不写"如果环境是 X 就 Y"）：

```markdown
## Code Review Process

When asked to review code, check:
- Type safety issues and null handling
- Error handling completeness
- Performance concerns (unnecessary allocations)
- Testability of the design

Report each issue with: the problematic code, the specific problem, and a corrected example.
```

Layer 2 · 扩展工作流（只给 Claude Code / Cursor）：

```markdown
Before writing to any of these paths, confirm:
- `production.env`
- `database/migrations/`
- `src/auth/`

After test file changes, run the related test suite and report results.

When the review shows more than 3 issues, ask whether to fix them interactively or report a summary.
```

Layer 3 · 补全提示（只给 Copilot）：

```markdown
Completion priorities:
- TypeScript strict mode compliance
- async/await over Promise chains
- Prefer interfaces over type aliases
- Error handlers must include a log statement
```

设计利用了 agent 的自然行为："它们会忽略自己理解不了的东西"。Claude Code 拿到全部；Copilot 拿到通用层 + 简单提示；两者输出都比没有 skill 定义时更一致。

**CI 校验**：PR 时跑 `gh skill validate --strict`、逐 profile validate、跨 agent dry-run，还有一条**"改了 .md 就必须改 CHANGELOG"** 的强制检查。质量脚本拦太短（<100 字符）、缺 `##` 标题、残留 `TODO/TBD/placeholder` 的文件：

```python
def check_skill(filepath):
    issues = []
    content = Path(filepath).read_text(encoding="utf-8")
    if len(content) < 100:
        issues.append(f"{filepath}: Too short ({len(content)} chars)")
    if not re.search(r'^## ', content, re.MULTILINE):
        issues.append(f"{filepath}: Missing ## headings")
    if re.search(r'TODO|TBD|placeholder', content, re.IGNORECASE):
        issues.append(f"{filepath}: Contains placeholder text")
    return issues
```

**发布通知**：打 tag 后发 Slack，CHANGELOG 里有 `Breaking` 就标 ⚠️ "review before updating"。

> **对笔者的启发**：`ke-*` 那 9 个 skill 就是天然的 profile `ke-team`；`ke/odin`、`ke/weapons` 是 `merchant-work-order` 单项目专用 profile。

### 2.2 "全局默认，项目层只放业务相关的"

> 来源：[Best practices to put skills and sub-agents in projects — Cursor 论坛](https://forum.cursor.com/t/best-practices-to-put-skills-and-sub-agents-in-projects/150329)（论坛域名不可达，仅搜索摘要级证据）

一位工程师的原话总结：

> 我把 skill 和 sub-agent 当成**可复用基础设施，而不是项目配置**。skill 应该**默认全局**。只有当它们编码了业务规则或领域特定流程时，才在项目层定义。否则它们就是噪音，并且抬高维护成本。我的全局 skill 通常来自 Claude Code、Vercel 或社区；**项目层 skill 严格只放业务相关的**。sub-agent 同理。

这条表面上与"2/8 项目用就该下沉"的困境冲突，实际上是同一件事的两面：**"不是通用能力"就是该下沉**，而下沉不等于"复制到每个项目"——它应该走 profile / 依赖声明。

---

## 三、选型决策：什么该是 skill，什么不该

### 3.1 AGENTS.md vs Skill：Vercel 的实测数据

> 来源：[AGENTS.md vs Agent Skills: What Vercel's Evals Actually Prove](https://dreaming.press/posts/agents-md-vs-agent-skills-evals.html)（2026-07-05）

**实测数据**（Vercel 19 个 Next.js 专项 agent eval，判据是 agent 输出能否真跑过 build/lint/test，带重试排除模型方差）：

| 方案 | 通过率 |
| --- | --- |
| 压缩成 8KB 的文档索引直接放 `AGENTS.md` | **100%** |
| Skill 方案 | **79%**（且是在提示词明确要求用 Skill 的配置下） |
| Skill 未被调用的 run 占比 | **56%** |

**为什么**——胜出的 AGENTS.md 本身就是 progressive disclosure：把 40KB 全量文档压成 8KB **索引**，告诉 agent 去读哪个版本匹配的文档文件。它不是"笨文件"，它是"检索触发器住在系统提示里，永远在场"。所以变量不是静态 vs 智能检索（**两边都在检索**），变量是**检索触发器住在哪、模型能不能跳过它**。

Skill 引入了一个决策点：模型得 ① 察觉需要它 ② 决定调用 ③ 在它已经走上错误路线前调用。每个都是一次你往流水线里加的抛硬币。

**措辞脆弱性**（值得警惕的一点）：把"怎么告诉 agent 用 Skill"的措辞从 "invoke the Skill first" 改成 "explore the project first"，在内容完全相同的情况下结果就翻转——某个 eval 里 "invoke first" 生成了正确的 `page.tsx` 但漏了必需的 `next.config.ts` 改动，"explore first" 两个都拿到。

> 一个 skill 不只是它的内容，而是**内容 + 一份脆弱的"什么时候该去找它"的社会契约**，而这份契约用模型可以自由重新解释的自然语言写成。

**作者明确划的范围**：这是"喂给 agent 它正在编辑的代码库的规范"这一类场景，且是造框架的公司在自己的文档上测的，**是方向性证据不是普适判决**；而且压缩索引本身也有尖角（Vercel 自己的 issue tracker 记录过某些 setup 下索引无法可靠重新生成）。

**给的设计规则**（这批文章里最该抄的一句）：

> **把"必须永远生效"的知识放在模型无法跳过的地方，把"按需加载"留给你可以承受模型错过的东西。**

| 场景 | 该放哪 |
| --- | --- |
| lint 规则、文件布局、框架版本 gotcha、代码库不可协商的约定 | **AGENTS.md**（这些不是"偶尔"，把入口做成可选是 bug） |
| 大而自包含、偶尔才需要的能力（整套 PDF 生成工具链、冷门迁移 playbook） | **Skill**（invoke 成本值得付，换来省下的 context） |

### 3.2 Passive context 与 active context 两桶分法

> 来源：[Vercel KB — Agent Skills](https://vercel.com/kb/guide/agent-skills-creating-installing-and-sharing-reusable-agent-context)（域名不可达，搜索摘要级证据）

- **Passive context（永远在）**：`AGENTS.md` —— 安全红线、格式规则、"永远用 strict TS"、"绝不绕过 auth"
- **Active context（按需）**：skill —— 专门的工作流

以及一句定义值得记住：

> skill 是单个文件夹，含一个 `SKILL.md`（+ 可选支撑文件）。**skill package 是一个 repo（或目录），含一个或多个 skills。**

### 3.3 AGENTS.md 与 SKILL.md 的分界线

> 来源：[AGENTS.md and SKILL.md examples — Chrissy Reddington](https://chrisreddington.com/blog/building-your-agent-toolbox/)

> `AGENTS.md` 承载**仓库稳定的事实与期望**，`SKILL.md` 承载**某类特定工作该加载的流程**。

---

## 四、单文件质量：决定 skill 数量的另一半

> 来源：[Best practices for skill creators — Agent Skills 官方规范站](https://agentskills.io/skill-creation/best-practices)

这一节的每一条都能直接减少"你必须保留的 skill 数量"。

**做法 1 — 从真实任务里提取，而不是让 LLM 空想**。常见坑是"只靠 LLM 训练知识生成 skill"，产出的是"处理错误要恰当""认证要遵循最佳实践"这种废话。要喂进去：真正做一遍任务时**你做的纠正**（"用库 X 不用 Y"、"检查边界情况 Z"）、输入输出格式、你提供的项目约定。

**做法 2 — 最有价值的内容是 gotchas**。定义得很准：环境特有的、违反合理假设的事实——不是一般性建议，而是 agent 不被告知就会犯的**具体**错误。放 `SKILL.md` 里（agent 遇到情况前就读），别放 reference（agent 可能认不出触发条件）。

**做法 3 — 精简的判定句**：

> 对每一段内容问："没有这条指令，agent 会做错吗？" 不会 → 删。不确定 → 测。**如果 agent 没你这个 skill 也把整件事做完了，这个 skill 可能没在增值。**

**做法 4 — 规模**：`SKILL.md` 控制在 **500 行 / 5000 token** 以内；细节进 `references/`，并且**明确告诉 agent 什么时候去读**。差别很大：

- ✗ "see references/ for details"
- ✅ "Read `references/api-errors.md` if the API returns a non-200 status code"

**做法 5 — 一个判据**（功能式）：

> 决定一个 skill 覆盖什么，就像决定一个函数该干什么——你想要一个能和其他 skill 良好组合的**内聚工作单元**。范围太窄 → 一个任务要加载多个 skill，开销和冲突指令的风险；范围太宽 → 难以精确激活。

**做法 6 — 详略要匹配脆弱性**。多解法都成立、任务容错 → **给自由**，讲清楚 *why* 反而更有效（理解目的的 agent 能做出更好的上下文相关判断）；操作脆弱、一致性重要、必须按序 → **强规定**。大多数 skill 是混合的，**每一段独立校准**。

**做法 7 — 给默认值，不给菜单**：多个工具都能用时**选一个默认**，替代方案一句带过，别平权罗列。

**做法 8 — 教方法，不教结论**：

> 一个 skill 该教 agent **如何处理一类问题**，而不是**某个具体实例该产出什么**。

**做法 9 — 可复用脚本的信号**：迭代时对比各测试用例的执行 trace，**如果你注意到 agent 每次都在自己重新发明同一段逻辑**（画图、解析某个格式、校验输出），那就是"把它写成测试过的脚本放进 `scripts/`"的信号。

---

## 五、团队治理

> 来源：[Harness Skills Governance: Treat Team Skills as Runtime Dependencies](https://medium.com/@www.402645063/harness-skills-governance-treat-team-skills-as-runtime-dependencies-not-global-or-project-assets-1dff9fa3e083)（域名不可达，搜索摘要级证据）

关键批评（**正好是"用户全局目录"方案的风险**）：

> 用户全局 skill 目录会变成**隐形的依赖面**：无边界、机器相关、难以版本化、容易漂移。两个人跑同一个 agent、同一个仓库，行为不同——不是因为代码变了，而是因为他们的本地配置不同。

框架是：CI 校验 + 基于角色的 skill profile + 三层 agent 兼容设计 + 自动发布通知。

配套：[Red Hat — Building skills for AI agents: pitfalls and best practices](https://next.redhat.com/2026/07/28/building-skills-for-ai-agents-pitfalls-and-best-practices/)（Red Hat ACE 团队在生产级 RCA skill 上的设计/分发/评估经验，搜索摘要级证据）。

---

## 六、汇总：可直接套到现有 manifest 的六条

| # | 做法 | 来源 | 具体动作 |
| --- | --- | --- | --- |
| 1 | manifest 加 `install: global \| project` + `projects: [...]` | IVPM、gh skill profiles | 49 个里只留 10~15 个 `global`（pdf/docx/图片/gitlab 等），其余标 project + 项目列表 |
| 2 | 中立目录 + 多 provider 镜像 | anthropics#166、IVPM | 永远填 `.agents/skills/`，按需镜像 `.claude/`、`.cursor/`、`.codex/` |
| 3 | 加 profile 概念 | gh skill、skills-mgr | `ke-team`、`ke-merchant-work-order`、`content-output`、`dev-tools` 四个 profile，项目声明启用哪些 |
| 4 | 关键内容下沉进 AGENTS.md 索引 | Vercel eval（56% 未调用） | 每次 review 都要用的规范（取数路径、项目路径约定）写成 AGENTS.md 行，别做成 skill |
| 5 | lockfile 钉版本 | HappySkills | 已有 `.lock.json` 加上 `version` / `pinned_ref` 语义，做 `check` 回答"我这份是不是最新的" |
| 6 | 跑一遍"agent 没它也做得对"判定 | agentskills.io | 逐个 skill 问："没有它 agent 会做错吗？" 会答"不会"的直接删 |

**建议的执行顺序**：先做 #4 和 #6（零成本，砍掉伪 skill），再做 #1（解决 90% 的痛点），#3 和 #5 只在需要跨项目 / 跨机器时才做。

---

## 七、参考资料索引

| # | 文章 | 提供了什么 |
| --- | --- | --- |
| 1 | [The Right Skills for the Job: Project-Scoped Agent Skills](https://bitsbytesgates.com/fvutils,/ai/2026/06/06/ContextualAgentConfig.html) | skill 随 artifact 分发、四级发现机制、中立目录 + 镜像、IVPM 完整例子 |
| 2 | [How to Share Skills Across Projects](https://happyskills.ai/blog/share-skills-across-projects/) | drift 机制、git/submodule/monorepo 为何都不行、package manager 模型与 lockfile |
| 3 | [Enterprise Multi-Agent Skill Management with `gh skill`](https://antigravitylab.net/en/articles/agents/multi-agent-skill-portability-enterprise-guide) | profile 定义与继承、三层 agent 兼容、CI 校验脚本、发布通知 |
| 4 | [Best practices to put skills and sub-agents in projects — Cursor 论坛](https://forum.cursor.com/t/best-practices-to-put-skills-and-sub-agents-in-projects/150329) | "全局默认 / 项目层只放业务"的经验法则（弱证据） |
| 5 | [AGENTS.md vs Agent Skills: What Vercel's Evals Actually Prove](https://dreaming.press/posts/agents-md-vs-agent-skills-evals.html) | 100% vs 79%、56% 未调用、措辞脆弱性、"不可跳过"设计规则 |
| 6 | [Vercel KB — Agent Skills](https://vercel.com/kb/guide/agent-skills-creating-installing-and-sharing-reusable-agent-context) | passive / active context 两桶分法、skill vs skill package（弱证据） |
| 7 | [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices) | gotchas、500 行上限、精简判定句、详略匹配脆弱性、脚本打包信号 |
| 8 | [Harness Skills Governance](https://medium.com/@www.402645063/harness-skills-governance-treat-team-skills-as-runtime-dependencies-not-global-or-project-assets-1dff9fa3e083) | 全局目录=隐形依赖面的批评（弱证据） |
| 9 | [Red Hat — Building skills for AI agents](https://next.redhat.com/2026/07/28/building-skills-for-ai-agents-pitfalls-and-best-practices/) | 生产级 skill 的设计/分发/评估（弱证据） |

**延伸阅读**（本次未抓取正文，列标题供追读）：

- [anthropics/skills#166 — Where to place skills to be used in different LLM providers](https://github.com/anthropics/skills/discussions/166) —— 官方讨论：目前**没有统一目录**；实用做法是中性目录 + sync/symlink 脚本分发
- [Leonezz/skills-mgr](https://github.com/Leonezz/skills-mgr) —— profile 制管理器，README 直指同类痛点：*"Context bloat — 加载所有 skill 每次对话浪费 3,000–5,000 token；No profiles；Update friction"*
- [Shen et al., SkillWiki (arXiv:2606.16523)](https://arxiv.org/html/2606.16523) —— skill 复用 / 获取 / 演化的学术综述
- [Chrissy Reddington — AGENTS.md and SKILL.md examples](https://chrisreddington.com/blog/building-your-agent-toolbox/) —— 两类文件的边界与模板
- [Scot Spence — Organising Claude Code Skills Into Plugin Marketplaces](https://scottspence.com/posts/organising-claude-code-skills-into-plugin-marketplaces) —— 动机高度一致：*"我的 skill 散在各个 repo 里，一直在复制粘贴、而且经常过期"*

### 证据强度说明

第 1、2、3、5、7 篇为**抓取到正文**的一手内容；第 4、6、8、9 篇因域名限制仅有**搜索摘要级证据**，结论方向可信但细节（尤其是脚本与配置样例）未经原文核实。
