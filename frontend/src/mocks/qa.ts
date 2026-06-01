/**
 * 智能问答模块 Mock
 * 严格对齐 docs/api-contracts.md 与 docs/prototypes/qa.html / qa-styles.html：
 *   - POST /api/qa/ask     → 按问题关键词路由到 12+ flow，产出 QaAnswerScript（驱动 SSE）
 *   - GET  /api/qa/sessions→ 历史会话（时间分组 + 置顶）
 *   - GET  /api/qa/sources/{id} → 来源抽屉详情（SOURCE_MAP，原文 chunk + 元数据）
 * 关键词路由逻辑对齐 qa.html 的 replyFor + INTENT_MAP。
 * 所有展示型 Mock 数据带 [Mock] 标识（见会话标题），接真实接口后移除。
 */
import type { ApiResponse } from '@/types/auth'
import type {
  OutputBlock,
  QaAnswerScript,
  QaFlow,
  QaSession,
  QaSessionsData,
  SourceDetail,
  SourceRef,
} from '@/types/qa'

/* ============================================================
 * 关键词 → flow 路由（对齐 qa.html replyFor 正则）
 * ============================================================ */

/** 将一个用户问题归类到 flow（顺序敏感：先判边界，再判主场景） */
export function routeFlow(qRaw: string): QaFlow {
  const q = qRaw.trim()
  if (!q) return 'vague'
  // 边界：视频上传兜底（文字里提到「视频/录屏」+ 看/审核）—— 实际上传由前端拦截，这里兜底文字提问
  if (/视频|录屏|短片/.test(q) && /过审|审核|看[一下]*|能不能|帮我看/.test(q)) return 'video'
  // 边界：不合规请求
  if (/绕过审核|擦边|规避审核|钻空子|违规创意|怎么过审不被发现/.test(q)) return 'refuse'
  // 边界：危险操作（全部暂停 / 删除 / 清空）
  if (/(全部|所有|批量).{0,4}(暂停|停投|关停|删除)|清空|一键停/.test(q)) return 'confirm'
  // 操作流程引导：怎么设置 / 怎么做 / 怎么配
  if (/怎么设置|如何设置|怎么配|怎么做|定向怎么|版位怎么|步骤/.test(q)) return 'guide'
  // 主场景：复盘归因（为什么掉 / 下降）
  if (/复盘|归因|为什么.*(掉|低|降)|怎么掉|下降|跌了|掉了|涨了/.test(q)) return 'review'
  // 主场景：素材审核 / 合规
  if (/审核|拒审|过审|违规|合规|能不能投|敏感词|擦不擦边/.test(q)) return 'reject'
  // 主场景：起量提速
  if (/起量|跑不动|学不出|学习期|不消耗|提速|放量|拿量|投不出/.test(q)) return 'growth'
  // 主场景：出价策略
  if (/出价|ocpm|调价|roi ?目标|出多少|报价|cpa/i.test(q)) return 'bid'
  // 边界：实时数据查询
  if (/消耗|花了多少|多少钱|实时|转化数|今天.*数据|roi.*怎么样|看.*数据/i.test(q)) return 'data'
  // 边界：知识库命中（问规则条款）
  if (/规则.*\d|第.*条|条款|规范.*说|什么意思|是什么/.test(q)) return 'knowledge'
  // 边界：模糊提问
  if (q.length <= 6 && /帮我看|看看|怎么样|咋样|看下|分析下/.test(q)) return 'vague'
  return 'fallback'
}

/* ============================================================
 * 各 flow 的答案脚本（blocks 提取自 qa-styles.html）
 * ============================================================ */

const SRC = (id: string, title: string): SourceRef => ({ id, title })

/** 通用 metaBar */
function metaBar(meta: string, adopt = true, dislike = true): OutputBlock {
  return { kind: 'metaBar', adopt, dislike, meta }
}

/** flow → 脚本工厂（部分 flow 含多轮，step 决定渲染哪一段） */
const SCRIPTS: Record<QaFlow, () => QaAnswerScript> = {
  /* ASK-01 规则 / 出价咨询 —— 结论卡 + 价格三栏 + 步骤 + 注意 + 来源 */
  bid: () => ({
    intent: { intent: '出价策略咨询', style: 'ASK-01', layer: 'L2' },
    steps: ['解析意图：现言短剧 · OCPM 起量出价', '召回：贵司 SOP v2.0 + Q1 复盘 + 行业 benchmark', '结合 8 个账户近 30 天数据测算区间'],
    blocks: [
      { kind: 'text', text: '基于您 8 个账户近 30 天数据 + 行业 benchmark，建议如下：', tone: 'default' },
      {
        kind: 'ansCard',
        icon: 'bid',
        head: '出价建议',
        detail: '现言短剧巨量引擎付费（有效）模式下，OCPM 起量建议区间：',
      },
      {
        kind: 'priceGrid',
        cells: [
          { label: '最低保起量', value: '18-25 元', level: 'low' },
          { label: '推荐区间 ⭐', value: '22-35 元', level: 'mid' },
          { label: '行业均值', value: '28 元', level: 'high' },
        ],
      },
      {
        kind: 'steps',
        title: '📈 调价节奏',
        items: [
          { title: '首日以 18 元起步学习', desc: '2 小时内消耗低于 200 元则提价至 25 元' },
          { title: '小时维度观测', desc: '日消 1000+ 且转化稳定后调整至 22-35 元区间，ROI＞1.2 时加速放量' },
          { title: '放量阶段缓步加价', desc: '每天调整不超过 2 元，每日预算同步放宽 10-15%' },
        ],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '注意事项',
        detail:
          '以上仅供同类项目 3 个月经验数据中位数估算，不同题材可能略有差异，建议结合自身投手实操经验调整。如出现"投不出去"建议先放宽人群包测试。',
      },
      {
        kind: 'sources',
        refs: [
          SRC('sop-v2', '📘 贵司投放SOP v2.0'),
          SRC('q1-report', '📘 贵司Q1复盘报告'),
          SRC('bench-2024q4', '📊 行业benchmark 2024Q4'),
          SRC('rt-8accounts', '⚡ 实时数据 · 8账户'),
        ],
      },
      metaBar('⏱ 3.2 秒 · 8 来源 · 置信度 95%'),
    ],
    sources: [
      SRC('sop-v2', '📘 贵司投放SOP v2.0'),
      SRC('q1-report', '📘 贵司Q1复盘报告'),
      SRC('bench-2024q4', '📊 行业benchmark 2024Q4'),
      SRC('rt-8accounts', '⚡ 实时数据 · 8账户'),
    ],
  }),

  /* ASK-02 素材审核 —— 工具调用 + 轻结论 + 跳「素材诊断」 */
  reject: () => ({
    intent: { intent: '素材审核 / 拒答', style: 'ASK-02', layer: 'L1' },
    steps: ['命中审核敏感词库（暴力暗示类）', '比对巨量审核规则 v3.2 + 历史拒审案例'],
    blocks: [
      {
        kind: 'toolCall',
        head: '🔧 已调用「素材诊断」能力…',
        items: ['✓ 命中审核敏感词库（暴力暗示类）', '✓ 比对巨量审核规则 v3.2 + 历史拒审案例'],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '初步结论：拒审风险 **中-高（~70%）**',
        detail:
          '「追凶」属于**暴力暗示词**，凶杀类叙事是巨量高频拒审点（历史此类拒审 487 次）。按建议改造（替换敏感词 + 叙事化转场）后，同类素材通过率约 **88%**。',
      },
      {
        kind: 'gotoButtons',
        buttons: [
          { label: '查看完整诊断报告 →', variant: 'primary', goto: '/diagnose' },
          { label: '直接去改素材', variant: 'outline', goto: '/diagnose' },
        ],
        note: '违规点定位、3 条可执行修改方案、改造前后过审预测，已在「素材诊断」页生成。',
      },
      {
        kind: 'sources',
        refs: [SRC('audit-v3-2', '📘 巨量审核规则 v3.2'), SRC('reject-history', '📊 历史拒审案例库')],
      },
      metaBar('⏱ 4.1 秒 · 置信度 91%'),
    ],
    sources: [SRC('audit-v3-2', '📘 巨量审核规则 v3.2'), SRC('reject-history', '📊 历史拒审案例库')],
  }),

  /* ASK-03 复盘归因 —— Agent 5 步 + 归因摘要 + 跳「投放复盘」 */
  review: () => ({
    intent: { intent: '复盘归因', style: 'ASK-03', layer: 'L2' },
    steps: ['拉取实时数据', '对比昨日 → 检查设置变更', '检索大盘 → 综合归因'],
    blocks: [
      {
        kind: 'agentPlan',
        head: '已调用复盘 Agent · 5 步调研完成',
        items: ['✓ 拉取实时数据 → 对比昨日 → 检查设置变更 → 检索大盘 → 综合归因'],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '初步归因：今日 ROI **0.84 ↓30%**',
        detail:
          '主因：**晚间高价时段消耗下降（-18%）** + **3 条爆款计划被暂停（-10%）**；次因大盘 CPM 上涨（-5%）。预计周止损 **¥12 万**，建议尽快重启计划 + 回补晚间出价。',
      },
      {
        kind: 'gotoButtons',
        buttons: [
          { label: '查看完整复盘报告 →', variant: 'primary', goto: '/review' },
          { label: '⚡ 一键执行止损建议', variant: 'outline', toast: '已加入执行队列，预计 4 小时内完成' },
        ],
        note: '完整 5 步 ReAct 推理、ROI 趋势图、归因因子拆分、分优先级操作建议，已在「投放复盘」页生成。',
      },
      {
        kind: 'sources',
        refs: [
          SRC('rt-a001', '⚡ A001 实时数据'),
          SRC('bench-industry', '📊 行业 benchmark'),
          SRC('a001-history', '📘 A001 历史复盘'),
        ],
      },
      metaBar('⏱ 6.8 秒 · 5 步 Agent · 置信度 93%'),
    ],
    sources: [
      SRC('rt-a001', '⚡ A001 实时数据'),
      SRC('bench-industry', '📊 行业 benchmark'),
      SRC('a001-history', '📘 A001 历史复盘'),
    ],
  }),

  /* ASK-04 策略建议·起量 —— 槽位反问（step1）。多选方案在 step2 由 advanceGrowth 给出 */
  growth: () => ({
    intent: { intent: '起量提速', style: 'ASK-04', layer: 'L2' },
    steps: ['判断学习期阶段', '比对同期客户特征'],
    blocks: [
      { kind: 'text', text: '为了准确诊断，请补充几个关键信息：' },
      {
        kind: 'slotGroup',
        groups: [
          { label: '⏱ 已投放时长', options: ['≤24 小时', '24-48 小时', '48-72 小时', '＞72 小时'] },
          { label: '💰 日消耗', options: ['＜200', '200-500', '500-1000', '＞1000'] },
          { label: '📈 累计转化数', options: ['0', '1-5', '5-20', '＞20'] },
        ],
      },
      { kind: 'metaBar', adopt: false, dislike: false, meta: '↻ 重新理解问题' },
    ],
  }),

  /* ASK-05 实时数据查询 —— 数据卡 + 洞察 + 深入归因 */
  data: () => ({
    intent: { intent: '实时数据查询', style: 'ASK-05', layer: 'L1' },
    steps: ['解析账户 @A001', '拉取巨量本地 SDK 实时快照'],
    blocks: [
      { kind: 'text', text: 'A001 现言旗舰户 · 今日实时（截至刚刚）：', tone: 'muted' },
      {
        kind: 'dataCard',
        title: '实时数据',
        source: '⚡ 巨量 API · 1 分钟前',
        metrics: [
          { label: '今日消耗', value: '¥86,200' },
          { label: 'ROI', value: '0.84', danger: true },
          { label: '转化数', value: '36' },
        ],
      },
      { kind: 'text', text: 'ROI **0.84** 已低于你的达标线 1.2。这是个异常信号 —— 要不要我帮你**归因**看看为什么掉？' },
      { kind: 'followUps', options: [{ label: '深入归因 →', nextFlow: 'review' }] },
    ],
    sources: [SRC('rt-a001', '⚡ A001 实时数据')],
  }),

  /* ASK-06 知识库命中 —— 引用原文 + 来源 */
  knowledge: () => ({
    intent: { intent: '知识查询', style: 'ASK-06', layer: 'L1' },
    steps: ['直接命中规则库'],
    blocks: [
      {
        kind: 'ansCard',
        icon: 'book',
        head: '巨量引擎审核规范 v3.2 · 第 4.1 条',
        detail:
          '「**诱导点击类**」：禁止使用"免费""0 元""点击领取"等绝对化或诱导性词汇；禁止用虚假的系统提示、红点、按钮诱导用户点击。违规将直接拒审。',
      },
      { kind: 'sources', label: '原文来源', refs: [SRC('audit-v3-2', '📘 巨量审核规则 v3.2')] },
      metaBar('⏱ 0.6 秒 · 直接命中规则库', true, false),
    ],
    sources: [SRC('audit-v3-2', '📘 巨量审核规则 v3.2')],
  }),

  /* ASK-07 问题模糊 —— 追问澄清气泡 */
  vague: () => ({
    intent: { intent: '需求澄清', style: 'ASK-07' },
    blocks: [
      { kind: 'text', text: '好的 👀 不过"看看"有点宽泛，你具体想看哪方面？点一个，或直接说账户/计划名：' },
      {
        kind: 'followUps',
        options: [
          { label: '今天哪些账户要紧' },
          { label: '某个计划为什么掉', nextFlow: 'review' },
          { label: '现在该怎么出价', nextFlow: 'bid' },
          { label: '素材能不能过审', nextFlow: 'reject' },
        ],
      },
    ],
  }),

  /* ASK-08 超出能力 —— 诚实说不知道 + 引导 */
  unknown: () => ({
    intent: { intent: '知识盲区', style: 'ASK-08' },
    blocks: [
      {
        kind: 'edgeCard',
        variant: 'unknown',
        icon: 'help',
        head: '暂无相关沉淀',
        body:
          '这块知识库还没收录，我**不会瞎编**。建议你：\n① 查广点通官方文档 ② 问平台对接人。\n我可以把这个问题记下来，等团队补充进知识库后通知你。',
        actions: [
          { label: '记录待补充', variant: 'outline', toast: '已记录，团队补充后将通知你' },
          { label: '去知识库看看', variant: 'ghost', goto: '/knowledge' },
        ],
      },
    ],
  }),

  /* ASK-09 不合规请求 —— 婉拒 + 合规替代 */
  refuse: () => ({
    intent: { intent: '合规拒答', style: 'ASK-09' },
    blocks: [
      {
        kind: 'edgeCard',
        variant: 'refuse',
        icon: 'ban',
        head: '这个我没法帮你',
        body:
          '绕过审核违反平台规则，**账号有封禁风险**，得不偿失。\n但我可以帮你在**合规范围内**做高点击的创意 —— 比如悬念钩子、情绪冲突、反转开场，这些既能过审又有效。',
        actions: [
          { label: '看合规爆款案例', variant: 'primary', goto: '/knowledge' },
          { label: '查审核红线', variant: 'ghost', toast: '已为你定位审核红线清单' },
        ],
      },
    ],
  }),

  /* ASK-10 高风险确认 —— 执行前二次确认 */
  confirm: () => ({
    intent: { intent: '操作确认', style: 'ASK-10' },
    blocks: [
      {
        kind: 'edgeCard',
        variant: 'confirm',
        icon: 'alert',
        head: '请确认这个操作',
        body:
          '将暂停 A001 现言旗舰户的 **全部 12 条计划**，其中包含 **3 条 ROI > 1.5 的爆款**。操作会**立即停止消耗**，可能影响今日跑量。',
        actions: [
          { label: '确认全部暂停', variant: 'danger', toast: '已暂停 A001 全部 12 条计划' },
          { label: '仅暂停 5 条低效的', variant: 'outline', toast: '已暂停 5 条低效计划' },
          { label: '取消', variant: 'ghost', toast: '已取消操作' },
        ],
      },
    ],
  }),

  /* ASK-11 多轮上下文 —— 由 buildContextTurns 单独构造（多轮气泡） */
  context: () => ({
    intent: { intent: '多轮上下文', style: 'ASK-11' },
    blocks: [
      {
        kind: 'contextNote',
        text: '🧠 接着上文 · 已锁定当前对象',
      },
      { kind: 'text', text: '你可以继续追问，我会接着上文理解指代（如「第一个」「那磁力呢」），并在切换话题时提示。' },
    ],
  }),

  /* ASK-12 系统异常 —— 错误提示 + 恢复 */
  error: () => ({
    intent: { intent: '系统异常', style: 'ASK-12' },
    blocks: [
      {
        kind: 'edgeCard',
        variant: 'error',
        icon: 'alert',
        head: '生成失败 · 网络波动',
        body: '刚才回答到一半中断了，**你的问题已保留**，点重新生成就能继续，不用重新输入。',
        actions: [
          { label: '🔄 重新生成', variant: 'primary', toast: 'AI 正在重新生成' },
          { label: '换个问法', variant: 'ghost', toast: '请重新输入问题' },
        ],
      },
    ],
  }),

  /* ASK-13 操作流程引导 —— 分步操作卡 */
  guide: () => ({
    intent: { intent: '操作流程引导', style: 'ASK-13', layer: 'L1' },
    steps: ['解析平台 = 快手磁力', '匹配短剧定向 SOP'],
    blocks: [
      { kind: 'text', text: '快手磁力短剧定向，按这 4 步设置 👇', tone: 'muted' },
      {
        kind: 'stepList',
        items: [
          '**人群定向**：选「短剧兴趣 + 小说阅读」行为标签，年龄锁 18–40',
          '**出价方式**：起量用 OCPM，目标「付费 ROI」，首日出价上浮 15%',
          '**版位**：优先「精选 + 上下滑」，关闭联盟版位防低质流量',
          '**预算**：单计划日预算 ≥ 出价 × 20，给足跑量空间',
        ],
      },
      metaBar('⏱ 1.2 秒 · 命中磁力 SOP', true, false),
    ],
  }),

  /* ASK-15 视频审核兜底 —— 暂不支持，转文字 / 人工 */
  video: () => ({
    intent: { intent: '视频兜底', style: 'ASK-15' },
    blocks: [
      {
        kind: 'edgeCard',
        variant: 'refuse',
        icon: 'video',
        head: '暂不支持上传视频分析',
        body:
          '松鼠目前只做**文字咨询**，还读不了视频画面。你可以：\n① **文字描述**素材内容（如"前 5 秒有追凶对白"），我基于规则 + 历史案例研判；\n② 复杂审核走**人工接入**，我帮你转交内容团队。',
        actions: [
          { label: '转人工审核', variant: 'primary', toast: '已为你转交内容团队，人工会尽快跟进' },
          { label: '查审核红线', variant: 'ghost', toast: '已为你定位审核红线清单' },
        ],
      },
    ],
  }),

  /* 兜底（fallback）—— 对齐 replyFor 默认回复 */
  fallback: () => ({
    intent: { intent: '通用咨询', style: 'ASK-07' },
    blocks: [
      {
        kind: 'text',
        text:
          '收到 👀 基于顶栏所选平台的规则与数据，松鼠来帮你分析。问得再具体些会更准 —— 比如某账户的出价、某条素材能不能过审、某天 ROI 为什么掉。',
      },
      {
        kind: 'followUps',
        prompt: '你可以直接点：',
        options: [
          { label: '现在该怎么出价', nextFlow: 'bid' },
          { label: '某条素材能不能过审', nextFlow: 'reject' },
          { label: '某天 ROI 为什么掉', nextFlow: 'review' },
        ],
      },
    ],
  }),
}

/**
 * 起量 flow 第二轮（用户填完槽位后）→ 诊断结论 + 多选方案（ASK-04 完整态）
 * 由前端在用户点击 slot 后触发。
 */
export function buildGrowthResult(): QaAnswerScript {
  return {
    intent: { intent: '起量提速', style: 'ASK-04', layer: 'L2' },
    steps: ['命中 35% 同期客户特征', '定位学习期-1 关键节点'],
    blocks: [
      {
        kind: 'ansCard',
        icon: 'bid',
        head: '📊 诊断结论：**进度停滞型**',
        detail: '命中 35% 同期客户特征 · 处于"学习期-1 关键节点"，必须立刻干预，否则 12 小时内进度将清零重新学习',
      },
      {
        kind: 'recommendMulti',
        head: '💡 推荐路径（按 ROI 期望排序，可多选）',
        options: [
          { title: '提价 15-20% 强制突破学习期', desc: '预计 4 小时内完成模型学习 · 风险：单次出价上升', badge: 'good', checked: true },
          { title: '新增 2-3 条同题材计划分流', desc: '用同素材测不同人群包，规避单计划被卡死', badge: 'good', checked: true },
          { title: '拓宽人群定向', desc: '去除性别/兴趣限制，扩大候选池' },
          { title: '暂停该计划 / 止损观察', desc: '⚠ 注意：已投入预算无法回收，仅当转化质量明显低于预期时考虑', badge: 'bad', dangerous: true },
        ],
        execLabel: '⚡ 执行所选 2 项',
      },
      metaBar('⏱ 5.3 秒 · 置信度 89%'),
    ],
  }
}

/**
 * 多轮上下文示例（ASK-11）：返回连续 4 轮（user/ai 交替）脚本。
 * 由页面在进入 context flow 时一次性铺开，演示指代消解 + 话题切换。
 */
export interface ContextTurn {
  user: string
  blocks: OutputBlock[]
}
export function buildContextTurns(): ContextTurn[] {
  return [
    {
      user: 'A001 现在 ROI 怎么样？',
      blocks: [{ kind: 'text', text: 'A001 现言旗舰户 ROI **0.84**，低于你的达标线 1.2，今天偏弱。' }],
    },
    {
      user: '那磁力呢？',
      blocks: [
        { kind: 'contextNote', text: '🧠 接着上文 · 你在问「ROI」', variant: 'continue' },
        { kind: 'text', text: '你是想看**磁力账户的 ROI** —— K007 磁力星图户 ROI **1.35**，比巨量这边健康不少。' },
      ],
    },
    {
      user: '第一个为什么低？',
      blocks: [
        { kind: 'contextNote', text: '🧠「第一个」= A001（巨量）', variant: 'continue' },
        { kind: 'text', text: 'A001 掉 ROI 主要两个原因：**支付粉价涨了 32%**（¥18 → ¥24），加上头部素材完读率下滑。要不要我深入归因？' },
        { kind: 'followUps', options: [{ label: '深入归因 →', nextFlow: 'review' }] },
      ],
    },
    {
      user: '对了，今天拒审多吗？',
      blocks: [
        { kind: 'contextNote', text: '🔄 切换话题 · 仍锁定 A001', variant: 'switch' },
        { kind: 'text', text: '切到拒审 —— A001 今天 **2 条拒审**，都是「诱导点击」类文案，其余账户暂无新增。要看拒审详情吗？' },
      ],
    },
  ]
}

/** POST /api/qa/ask 的 Mock：把问题路由到 flow 并产出脚本 */
export function mockAnswerScript(question: string, forceFlow?: QaFlow): QaAnswerScript {
  const flow = forceFlow ?? routeFlow(question)
  return SCRIPTS[flow]()
}

/* ============================================================
 * GET /api/qa/sessions —— 历史会话（时间分组 + 置顶）
 * 标题带 [Mock] 标识，对齐 dev-standards 第 10 节。
 * ============================================================ */

const MOCK_SESSIONS: QaSession[] = [
  { id: 's_001', title: '现言短剧 OCPM 起量出价多少？', timeLabel: '5 分钟前', group: 'today', seedQuestion: '现言短剧 OCPM 出价多少合适？ROI 目标 1.2' },
  { id: 's_002', title: '短剧 A001 ROI 为什么掉了', timeLabel: '1 小时前', group: 'today', seedQuestion: 'A001 户今天 ROI 比昨天掉了 30%，帮我归因一下' },
  { id: 's_003', title: '短剧素材前 5 秒追凶对白能过审吗', timeLabel: '2 小时前', group: 'today', seedQuestion: '短剧素材前 5 秒有追凶对白，能过审吗？' },
  { id: 's_004', title: '快手磁力短剧定向怎么设置', timeLabel: '15:42', group: 'yesterday', seedQuestion: '快手磁力短剧定向怎么设置？' },
  { id: 's_005', title: '计划学习了一天还学不出来', timeLabel: '10:18', group: 'yesterday', seedQuestion: 'A005 户的计划冷启动了一天还学不出来，怎么办？' },
  { id: 's_006', title: 'A001 今日消耗和 ROI', timeLabel: '09:05', group: 'yesterday', seedQuestion: '今天 A001 户消耗多少？ROI 怎么样？' },
  { id: 's_007', title: '古言短剧人群包怎么选', timeLabel: '周二', group: 'week', seedQuestion: '帮我看看古言短剧的人群包怎么选，女性还是全人群？' },
  { id: 's_008', title: '巨量审核规则 4.1 条是什么', timeLabel: '周一', group: 'week', seedQuestion: '巨量审核规则 4.1 条具体是什么内容？' },
]

export function mockSessions(): ApiResponse<QaSessionsData> {
  return {
    code: 200,
    message: 'success',
    data: { sessions: MOCK_SESSIONS.map((s) => ({ ...s })) },
  }
}

/* ============================================================
 * GET /api/qa/sources/{id} —— 来源抽屉详情（SOURCE_MAP）
 * 提取自 qa.html SOURCE_MAP，原文 chunk + 元数据 + 飞轮统计。
 * ============================================================ */

const SOURCE_MAP: Record<string, SourceDetail> = {
  'sop-v2': {
    id: 'sop-v2', icon: '📘', iconClass: 't-doc',
    title: '贵司投放SOP v2.0', subtitle: '私域 · L2 团队战术 · 团队上传',
    tags: [{ cls: 'prv-up', text: '🔒 私域' }, { cls: 'gray', text: 'L2 团队' }, { cls: 'confidence', text: '命中度 92%' }],
    chunkId: 'CHUNK_017', chunkTokens: 412, citedTimes: 38,
    chunk: '现言短剧 OCPM 起量阶段建议出价区间：22-35 元。首日以 1.1× 基础出价测水温，2 小时内消耗低于 200 元则提价至 25 元；日消 1000+ 且转化稳定后，调整至 22-35 元区间，ROI > 1.2 时加速放量。放量阶段缓步加价，每天调整不超过 2 元，每日预算同步放宽 10-15%。',
    meta: { 上传人: '钱晓彤', 上传时间: '2026-05-14（14 天前）', 版本: 'v2.0（v1.0 见历史版本）', 文档大小: '2.4 MB（PDF · 32 页）', 索引模型: 'bge-large-zh-v1.5' },
    stats: { 被引用: 142, 命中率: '92%', 点赞: 98 },
  },
  'q1-report': {
    id: 'q1-report', icon: '📘', iconClass: 't-doc',
    title: '贵司 Q1 复盘报告', subtitle: '私域 · L2 团队战术 · 复盘自动归档',
    tags: [{ cls: 'prv-ai', text: '🤖 AI 沉淀' }, { cls: 'gray', text: 'L2 团队' }, { cls: 'confidence', text: '命中度 88%' }],
    chunkId: 'CHUNK_006', chunkTokens: 388, citedTimes: 21,
    chunk: '2024Q1 共投放 23 个现言短剧账户，OCPM 起量阶段均价 22-30 元，单计划 ROI ≥ 1.2 占比 67%。首日 18 元起步策略在 A001/A003/A005 等账户表现最优，日均消耗稳定上升 25-40%。建议沿用首日低出价试水 + 2 小时观测调价 + 突破后阶梯加价的"三步法"。',
    meta: { 生成方式: 'Agent 自动沉淀（已主管审核）', 原始来源: '12 次复盘对话片段', 归档时间: '2024-04-08', 关联账户: 'A001 / A003 / A005 等 23 个' },
    stats: { 被引用: 78, 命中率: '88%', 点赞: 67 },
  },
  'bench-2024q4': {
    id: 'bench-2024q4', icon: '📊', iconClass: 't-bench',
    title: '行业 benchmark · 短剧 2024 Q4', subtitle: '公域 · L1 平台数据 · API 自动同步',
    tags: [{ cls: 'pub', text: '🌐 公域' }, { cls: 'gray', text: 'L1 平台' }, { cls: 'confidence', text: '命中度 78%' }],
    chunkId: 'CHUNK_002', chunkTokens: 256, citedTimes: 94,
    chunk: '2024 Q4 现言短剧大盘 OCPM 起量阶段平均出价 28 元（中位数 26 元），付费目标平均 ROI 1.15。Top10% 账户出价区间 22-33 元、ROI ≥ 1.4。男频题材出价平均高出 12%，女频虐恋题材高出 8%。冷启动阶段消耗破万天数中位数 3.2 天。',
    meta: { 数据来源: '巨量行业大盘 API', 数据周期: '2024-10-01 至 2024-12-31', 同步时间: '2025-01-08（30 天前）', 样本量: '全行业 12,400 账户' },
    stats: { 被引用: 94, 命中率: '78%', 点赞: 71 },
  },
  'rt-8accounts': {
    id: 'rt-8accounts', icon: '⚡', iconClass: 't-rt',
    title: '实时数据 · 8 个账户', subtitle: '实时查询 · 5 秒前完成',
    tags: [{ cls: 'rt', text: '⚡ 实时' }, { cls: 'gray', text: '8 个账户' }, { cls: 'confidence', text: '数据新鲜度 100%' }],
    table: {
      cols: ['账户', '题材', '出价', 'ROI'],
      rows: [
        { cells: ['A001', '现言', '26', '0.84'] },
        { cells: ['A002', '现言', '22', '1.18'] },
        { cells: ['A003', '都市悬疑', '24', '1.45'] },
        { cells: ['A005', '女频虐恋', '25', '0.92'] },
        { cells: ['A006', '男频爽文', '23', '1.28'] },
        { cells: ['A007', '古言', '21', '1.05'] },
        { cells: ['A008', '都市', '24', '1.15'] },
        { cells: ['A009', '悬疑反转', '26', '1.38'] },
      ],
    },
    meta: { 查询范围: '8 个授权账户', 查询时间: '刚刚（5 秒前）', 'API': '巨量本地 SDK · v2.4', 数据lag: '< 60 秒' },
    stats: { 今日调用: 12, 本月引用: 384, 准确率: '99.9%' },
  },
  'audit-v3-2': {
    id: 'audit-v3-2', icon: '📘', iconClass: 't-rule',
    title: '巨量审核规则 v3.2', subtitle: '公域 · L1 平台规则 · API 自动同步',
    tags: [{ cls: 'pub', text: '🌐 公域' }, { cls: 'gray', text: 'L1 平台' }, { cls: 'confidence', text: '命中度 94%' }],
    chunkId: 'CHUNK_014', chunkTokens: 320, citedTimes: 412,
    chunk: '【规则 #14】短剧广告中禁止出现明显暗示性肢体动作、过度血腥场面（含卡通化呈现）；男女对峙类场景须避免直接喊话挑衅形式。【规则 #08】凶杀类对白须以叙事化呈现，不得直接陈述凶器、行凶对象、伤口部位等具象细节。',
    meta: { 数据来源: '巨量审核中心 API', 版本: 'v3.2（2025-04-12 更新）', 生效时间: '2025-04-15', 关联规则数: '14 / 482 条' },
    stats: { 被引用: 412, 命中率: '94%', 点赞: 305 },
  },
  'reject-history': {
    id: 'reject-history', icon: '📊', iconClass: 't-case',
    title: '历史拒审案例库', subtitle: '私域 · L2 团队战术 · 自动归档',
    tags: [{ cls: 'prv-ai', text: '🤖 AI 沉淀' }, { cls: 'gray', text: 'L2 团队' }, { cls: 'confidence', text: '命中度 91%' }],
    chunkId: 'CHUNK_023', chunkTokens: 286, citedTimes: 67,
    chunk: '本团队累计 1,247 条拒审案例。其中"追凶/凶杀/暴力暗示"类拒审 487 次（39%）—— 该类案例改造后通过率 88%（基于 142 次相似改造）。典型改造路径：①替换敏感词；②叙事化转场；③弱化 BGM 压迫感。',
    meta: { 案例总数: '1,247 条', 时间范围: '近 12 个月', 更新方式: '每条拒审自动归档', 关联规则: '巨量 v3.2 #14, #08' },
    stats: { 被引用: 67, 命中率: '91%', 点赞: 52 },
  },
  'rt-a001': {
    id: 'rt-a001', icon: '⚡', iconClass: 't-rt',
    title: 'A001 户 · 实时数据', subtitle: '实时查询 · 0.8 秒前',
    tags: [{ cls: 'rt', text: '⚡ 实时' }, { cls: 'gray', text: 'A001' }, { cls: 'confidence', text: '数据新鲜度 100%' }],
    table: {
      cols: ['指标', '今日', '昨日', '近 7 日均'],
      rows: [
        { cells: ['ROI', '0.84', '1.20', '1.18'], danger: [1] },
        { cells: ['消耗', '¥86,200', '¥78,400', '¥81,500'] },
        { cells: ['CPM', '¥38', '¥36', '¥35'] },
        { cells: ['转化数', '36', '42', '40'] },
      ],
    },
    meta: { 账户: 'A001 · 现言短剧旗舰户', 查询时间: '0.8 秒前', 'API': '巨量本地 SDK', 权限: '已授权' },
    stats: { '今日 ROI': '0.84', '昨日 ROI': '1.20', 掉幅: '-30%' },
  },
  'bench-industry': {
    id: 'bench-industry', icon: '📊', iconClass: 't-bench',
    title: '行业 benchmark · 短剧大盘', subtitle: '公域 · L1 平台数据',
    tags: [{ cls: 'pub', text: '🌐 公域' }, { cls: 'gray', text: 'L1 平台' }, { cls: 'confidence', text: '命中度 82%' }],
    chunkId: 'CHUNK_009', chunkTokens: 198, citedTimes: 56,
    chunk: '今日大盘短剧 CPM 较昨日上涨 6.8%。Q1 末-Q2 初为传统淡季尾声，行业 ROI 平均值小幅波动 ±5% 属正常区间。建议关注本周末后 3 天反弹趋势。',
    meta: { 数据来源: '巨量行业大盘', 同步时间: '今日 09:00', 题材覆盖: '现言/古言/玄幻/都市' },
    stats: { 被引用: 56, 命中率: '82%', 点赞: 41 },
  },
  'a001-history': {
    id: 'a001-history', icon: '📘', iconClass: 't-doc',
    title: 'A001 户 · 历史复盘', subtitle: '私域 · L3 个人偏好',
    tags: [{ cls: 'prv-up', text: '🔒 私域' }, { cls: 'gray', text: 'L3 个人' }, { cls: 'confidence', text: '命中度 90%' }],
    chunkId: 'CHUNK_004', chunkTokens: 364, citedTimes: 12,
    chunk: 'A001 户最近 30 天 ROI 在晚 21:00-23:00 时段最高（均值 1.45），其中"现言-都市悬疑"题材表现最佳。上月同期出现过类似下滑情况，3 条爆款计划被错误暂停，重启后 ROI 4 小时恢复至 1.2 以上。',
    meta: { 账户: 'A001', 复盘数量: '14 次（近 30 天）', 主要题材: '现言、都市悬疑', 所属投手: '钱晓彤' },
    stats: { 被引用: 12, 命中率: '90%', 点赞: 9 },
  },
}

/** GET /api/qa/sources/{id} —— 取来源详情；不存在返回 404 形态 */
export function mockSourceDetail(id: string): ApiResponse<SourceDetail | null> {
  const data = SOURCE_MAP[id]
  if (!data) return { code: 404, message: '该来源暂无详情', data: null }
  return { code: 200, message: 'success', data: { ...data } }
}
