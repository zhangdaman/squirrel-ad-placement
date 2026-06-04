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
  if (/怎么设置|如何设置|怎么配|怎么做|怎么新建|怎么建|新建.*计划|怎么上传|上传.*文档|怎么用|定向怎么|版位怎么|步骤/.test(q)) return 'guide'
  // 主场景：复盘归因（为什么掉 / 下降）
  if (/复盘|归因|为什么.*(掉|低|降)|怎么掉|下降|跌了|掉了|涨了/.test(q)) return 'review'
  // CHK：跨平台规则对比（比 reject 更具体，先判）
  if (/巨量.*广点通|广点通.*巨量|两.*平台.*(差异|过.*拒|不一样)|跨平台.*(规则|对比)|A.*过.*B.*拒/.test(q)) return 'cross_platform'
  // CHK：拒审趋势
  if (/最近.*(审核|拒审).*(严|多)|审核.*变严|老被拒|拒审.*(变多|趋势|高)/.test(q)) return 'reject_trend'
  // CHK：账户诊断
  if (/账户.*(限流|花不出去|跑不出|资质)|限流|消耗.*不出去|账户.*异常/.test(q)) return 'account_diag'
  // 主场景：素材审核 / 合规
  if (/审核|拒审|过审|违规|合规|被拒|拒了|没通过|审核失败|能不能投|能不能(出现|放|用|有)|敏感词|擦不擦边/.test(q)) return 'reject'
  // 主场景：止损决策（含「亏/该不该关」，在起量/出价前判）
  if (/止损|该不该关|亏.{0,4}(还跑|继续投|要不要)|亏损.{0,4}(多少|止损|该)|要不要.{0,4}(关|停).{0,4}计划/.test(q)) return 'shutdown'
  // 主场景：定向策略（放宽/收紧 定向，人群包，兴趣定向；排在 guide 之后，避免「定向怎么设置」被抢走）
  if (/定向|人群包?|地域定向|兴趣.*定向|(放宽|收紧).*定向|定向.*(宽|窄|放|收)/.test(q)) return 'targeting'
  // 主场景：预算策略（日预算/时段分配；「日预算」不含「出价」，安全）
  if (/预算.{0,4}(分配|怎么|多少|配|花)|日预算|什么时段投|时段.{0,4}(分配|预算)/.test(q)) return 'budget'
  // 主场景：素材策略（问效果/起量，排在 reject 审核合规之后）
  if (/什么.*素材.*(好|起量|类型)|素材.*类型.*(好|起量)|口播.*还是.*剪辑|封面.*优化|标题.*(优化|怎么写)/.test(q)) return 'creative'
  // RPT：素材诊断（素材级，含「M789 跑不动」，必须在 growth「跑不动」之前判，否则被抢）
  if (/M\d+.{0,6}(为什么|跑不|怎么|没量|效果)|素材.{0,4}(跑不动|效果差|没量|疲劳)/.test(q)) return 'material_diag'
  // RPT：策略复盘（调整前后效果对比，含「调了出价之后效果」，必须在 bid「出价」之前判）
  if (/调.{0,4}(之后|后).{0,4}效果|操作.*前后|调整.{0,4}(出价|预算|定向).{0,4}(效果|后)|改.{0,4}之后.*怎么样|调.{0,2}(出价|预算|定向).{0,4}(之后|后).{0,4}(效果|怎么样)/.test(q)) return 'strategy_review'
  // 主场景：起量提速
  if (/起量|跑不动|学不出|学习期|不消耗|提速|放量|拿量|投不出/.test(q)) return 'growth'
  // 主场景：出价策略
  if (/出价|ocpm|调价|roi ?目标|出多少|报价|cpa/i.test(q)) return 'bid'
  // 边界：实时数据查询
  // 数据类宽泛词（只说「数据」没说账户/指标）→ 专属引导，必须在 data 之前判
  if (/数据/.test(q) && q.length <= 6 && !/消耗|roi|转化|今天|昨天|账户|计划|a\d/i.test(q)) return 'data_pick'
  if (/消耗|花了多少|多少钱|实时|转化数|今天.*数据|昨天.*(数据|情况|投放)|投放情况|整体.*(情况|怎么样)|roi.*怎么样|看.*数据/i.test(q)) return 'data'
  // 边界：知识库命中（问规则条款）
  if (/规则.*\d|第.*条|条款|规范.*说|什么意思|是什么/.test(q)) return 'knowledge'
  // RPT：周报 / 月报生成
  if (/生成.*(报告|周报|月报|日报)|要.*(周报|月报)|投放报告/.test(q)) return 'report_gen'
  // RPT：素材排行（关键词不与 growth/bid 冲突，保留原位）
  if (/哪.{0,4}素材.{0,4}(好|跑得|最)|素材排行|跑得最好|素材.*对比.*(好|排)|哪条.*跑得/.test(q)) return 'material_rank'
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

  /* CHK：跨平台规则对比 —— 巨量过了广点通被拒 */
  cross_platform: () => ({
    intent: { intent: '跨平台规则对比', style: 'ASK-02', layer: 'L1' },
    steps: ['命中跨平台审核差异知识库', '比对巨量 v3.2 与广点通审核规范 v2.1 对应条款'],
    blocks: [
      {
        kind: 'toolCall',
        head: '🔧 已调用「跨平台规则对比」能力…',
        items: [
          '✓ 拉取巨量审核规则 v3.2 与广点通审核规范 v2.1',
          '✓ 命中资质要求差异（现言短剧·特定内容类目）',
        ],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '差异定位：**广点通对该类目有额外资质门槛**',
        detail:
          '巨量对现言短剧广告不强制要求平台方提供《网络视听节目许可证》副证或广告审查表；而广点通针对涉及网络视听节目内容的推广，**要求主体通过 SC 认证并提交广告审查表**（或备案截图），缺少该资质直接触发平台合规拦截，与创意内容无关。',
      },
      {
        kind: 'steps',
        title: '📋 建议处理路径',
        items: [
          { title: '路径 A：补资质（推荐）', desc: '联系广点通商务，提交 SC 认证材料 + 广告审查表，通过后原素材可直接重提审，无需改内容' },
          { title: '路径 B：分平台版本', desc: '广点通素材回避触发资质校验的类目标签（如标签选「应用推广」而非「影视娱乐」），仅适合短期过渡，存在再次被拒风险' },
        ],
      },
      {
        kind: 'sources',
        refs: [
          SRC('audit-v3-2', '📘 巨量审核规则 v3.2'),
          SRC('gdt-audit', '📘 广点通审核规范 v2.1'),
        ],
      },
      metaBar('⏱ 3.8 秒 · 置信度 90%'),
    ],
    sources: [
      SRC('audit-v3-2', '📘 巨量审核规则 v3.2'),
      SRC('gdt-audit', '📘 广点通审核规范 v2.1'),
    ],
  }),

  /* CHK：拒审趋势 —— 最近审核是不是变严了 */
  reject_trend: () => ({
    intent: { intent: '拒审趋势分析', style: 'ASK-02', layer: 'L1' },
    steps: ['拉取团队近 7 天拒审数据', '对比平台近期规则更新记录', '归因拒审率上升结构'],
    blocks: [
      {
        kind: 'toolCall',
        head: '🔧 已调用「拒审趋势」能力…',
        items: [
          '✓ 拉取 A001 等 8 个账户近 7 天拒审记录',
          '✓ 比对巨量审核规则近期变更日志（最近一次 2025-04-15）',
        ],
      },
      {
        kind: 'dataCard',
        title: '近 7 天拒审率趋势',
        source: '⚡ 历史拒审案例库 · 刚刚',
        metrics: [
          { label: '7 天前拒审率', value: '8%' },
          { label: '今日拒审率', value: '15%', danger: true },
          { label: '暴力暗示类占比', value: '41%', danger: true },
        ],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '结论：平台**近期确实收紧**，主要在 2 个方向',
        detail:
          '① **暴力暗示 / 凶杀叙事**：规则 v3.2（2025-04-15 生效）新增"凶器具象描述"等 3 个子条款，贵司该类拒审率从 8% 升至 15%；② **诱导点击文案**：平台 AI 审核模型升级，对"立即领取""点击解锁"等文案识别更严。建议本周优先审查在投素材中含上述关键词的计划，提前替换或申诉。',
      },
      {
        kind: 'sources',
        refs: [
          SRC('reject-history', '📊 历史拒审案例库'),
          SRC('audit-v3-2', '📘 巨量审核规则 v3.2'),
        ],
      },
      metaBar('⏱ 4.5 秒 · 置信度 88%'),
    ],
    sources: [
      SRC('reject-history', '📊 历史拒审案例库'),
      SRC('audit-v3-2', '📘 巨量审核规则 v3.2'),
    ],
  }),

  /* CHK：账户诊断 —— 我的账户为什么被限流了 */
  account_diag: () => ({
    intent: { intent: '账户限流诊断', style: 'ASK-02', layer: 'L2' },
    steps: ['拉取 A001 账户近 7 天消耗 + 违规记录', '比对账户健康度阈值', '归因限流触发原因'],
    blocks: [
      {
        kind: 'toolCall',
        head: '🔧 已调用「账户诊断」能力…',
        items: [
          '✓ 拉取 A001 账户近 7 天消耗曲线与违规积累记录',
          '✓ 检测资质有效期 + 账户健康度评分',
          '✓ 比对平台限流触发条件（消耗异常波动 / 违规阈值）',
        ],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '诊断结论：命中 **3 项限流触发条件**',
        detail:
          '**① 资质待补**：营业执照副本已过期（2026-04-30），平台已发送提醒 2 次，账户进入观察期；**② 违规积累达阈值**：近 30 天拒审累计 9 次（巨量阈值 10 次触发限流），距限流仅剩 1 次缓冲；**③ 消耗异常波动**：昨日消耗较上周均值暴跌 62%（¥84,000 → ¥31,900），触发平台异常消耗检测模型。',
      },
      {
        kind: 'steps',
        title: '🔧 排查清单 & 建议',
        items: [
          { title: '立即更新营业执照副本', desc: '后台 > 账户资质 > 重新上传，通常 1 个工作日审核通过，账户恢复正常投放' },
          { title: '申诉近期拒审中误判的计划', desc: '若有被误判的，在「审核中心 > 申诉」提交，减少违规计数' },
          { title: '检查昨日计划是否被手动暂停', desc: '消耗暴跌可能是操作原因而非限流，确认后重启爆款计划' },
        ],
      },
      {
        kind: 'sources',
        refs: [
          SRC('rt-a001', '⚡ A001 实时数据'),
          SRC('reject-history', '📊 历史拒审案例库'),
        ],
      },
      metaBar('⏱ 5.1 秒 · 置信度 87%'),
    ],
    sources: [
      SRC('rt-a001', '⚡ A001 实时数据'),
      SRC('reject-history', '📊 历史拒审案例库'),
    ],
  }),

  /* 策略咨询：定向策略 —— RAG 经验检索 + 建议卡 + 来源（ASK-01） */
  targeting: () => ({
    intent: { intent: '定向策略咨询', style: 'ASK-01', layer: 'L2' },
    steps: [
      '解析意图：现言短剧巨量 · 定向放宽 vs 收紧',
      '召回：贵司 SOP v2.0 + Q1 复盘 + L2 公域经验',
      '结合近 30 天 8 个账户定向效果数据测算',
    ],
    blocks: [
      { kind: 'text', text: '基于贵司 8 个账户近 30 天定向数据 + L2 公域经验，建议如下：', tone: 'default' },
      {
        kind: 'ansCard',
        icon: 'bid',
        head: '定向策略建议',
        detail:
          '**起量期（前 3 天）放宽探量**：关闭性别/年龄硬限，兴趣标签保留「短剧 + 小说阅读」，人群包不超过 3 层，让模型自由探索受众池；**稳定期（ROI 连续 3 天 ≥ 1.2 后）收窄提效**：锁定高转化年龄段（通常 25–40 女性），叠加付费行为包，CPM 可降低 8–12%。',
      },
      {
        kind: 'steps',
        title: '📌 执行路径',
        items: [
          { title: '起量期：宽定向 + 兴趣词', desc: '「短剧兴趣 + 小说阅读」+ 全年龄，不加行为包；单计划候选人群 ≥ 5,000 万' },
          { title: '稳定期：叠加付费行为包', desc: 'CPM 小幅上升但转化率可提升 15-20%，整体 ROI 预计改善 0.1-0.2' },
          { title: '达人定向作为辅助', desc: '锁定同赛道 TOP 达人粉丝，用于跑量瓶颈期补量，不作为主力' },
        ],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '注意事项',
        detail:
          '不同题材受众差异较大：现言女频建议 18-35 岁女性优先，男频爽文可全人群探量。收窄定向前务必确认消耗已稳定（日消 ≥ 2,000 元），否则可能导致跑量停止。',
      },
      {
        kind: 'sources',
        refs: [
          SRC('sop-v2', '📘 贵司投放SOP v2.0'),
          SRC('q1-report', '📘 贵司Q1复盘报告'),
          SRC('exp-targeting', '📊 L3 定向经验库'),
        ],
      },
      metaBar('⏱ 2.8 秒 · 6 来源 · 置信度 91%'),
    ],
    sources: [
      SRC('sop-v2', '📘 贵司投放SOP v2.0'),
      SRC('q1-report', '📘 贵司Q1复盘报告'),
      SRC('exp-targeting', '📊 L3 定向经验库'),
    ],
  }),

  /* 策略咨询：素材策略 —— RAG 经验检索 + 建议卡 + 来源（ASK-01） */
  creative: () => ({
    intent: { intent: '素材策略咨询', style: 'ASK-01', layer: 'L2' },
    steps: [
      '解析意图：现言短剧 · 素材类型 / 起量',
      '召回：L3 素材经验 + L3 个人爆款素材沉淀',
      '结合贵司近 90 天爆款素材特征归纳',
    ],
    blocks: [
      { kind: 'text', text: '基于贵司近 90 天爆款素材分析 + L3 素材经验，建议如下：', tone: 'default' },
      {
        kind: 'ansCard',
        icon: 'bid',
        head: '起量素材策略',
        detail:
          '**前 3 秒钩子决定完读率**：悬念冲突型（"她以为他死了，却在三年后出现在她婚礼上"）平均完读率 **38%**，高于平淡叙事型 **22%**；**口播 vs 剪辑**：剪辑版起量更快（学习期平均缩短 1.2 天），但口播版 ROI 更稳（周 ROI 均值高 0.15）；建议 **2:1 比例**（2 条剪辑探量 + 1 条口播保稳）。',
      },
      {
        kind: 'steps',
        title: '📌 素材优化方向',
        items: [
          { title: '封面：大字幕 + 情绪脸部特写', desc: '封面 CTR 目标 ≥ 3.5%；避免风景/物件封面，人脸封面 CTR 均值高 40%' },
          { title: '标题：悬念 + 身份冲突', desc: '「打工妹 vs 总裁」「前妻回来了」类标题 CTR 高出普通标题 28%' },
          { title: '题材适配', desc: '现言女频：虐恋反转；男频爽文：升职/逆袭；古言：宫斗/穿越，不同题材素材钩子差异大' },
        ],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '注意事项',
        detail:
          '素材上新后建议 48 小时内不调价，给模型学习空间。每周保持上新 3-5 条新素材，防止老素材衰退导致 ROI 下滑。',
      },
      {
        kind: 'sources',
        refs: [
          SRC('exp-creative', '📊 L3 素材经验库'),
          SRC('q1-report', '📘 贵司Q1复盘报告'),
        ],
      },
      metaBar('⏱ 3.1 秒 · 5 来源 · 置信度 90%'),
    ],
    sources: [
      SRC('exp-creative', '📊 L3 素材经验库'),
      SRC('q1-report', '📘 贵司Q1复盘报告'),
    ],
  }),

  /* 策略咨询：预算策略 —— RAG 经验检索 + 建议卡 + 来源（ASK-01） */
  budget: () => ({
    intent: { intent: '预算策略咨询', style: 'ASK-01', layer: 'L2' },
    steps: [
      '解析意图：现言短剧 · 预算分配 / 时段',
      '召回：贵司 SOP v2.0 + Q1 复盘 + L3 预算经验',
      '结合 A001 近 30 天消耗曲线与时段 ROI 分布',
    ],
    blocks: [
      { kind: 'text', text: '基于贵司近 30 天预算消耗节奏 + L2 公域经验，建议如下：', tone: 'default' },
      {
        kind: 'ansCard',
        icon: 'bid',
        head: '预算分配建议',
        detail:
          '**日预算阶梯**：单计划日预算建议 = 出价 × 20（最低保跑量线）；起量期可先设 500 元观察，连续 2 天日消 ≥ 400 元后放开至 2,000 元；**晚间倾斜**：18:00–23:00 是现言短剧消耗高峰，该时段 ROI 均值 **1.45**，高于白天 **0.92**，建议在此时段不限速，允许超出日预算 10%。',
      },
      {
        kind: 'steps',
        title: '📌 预算执行节奏',
        items: [
          { title: '起量期（前 3 天）', desc: '单计划 500–1,000 元/天，优先保学习期跑通，不压预算' },
          { title: '稳定期（ROI 达标后）', desc: '逐步放量：每 2 天预算上浮 10-15%，不超过当前消耗的 1.5×' },
          { title: '高价时段策略', desc: '晚 20:00–22:00 为 ROI 峰值段，可临时上调出价 5-8%，抢占优质曝光' },
        ],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '注意事项',
        detail:
          '避免在凌晨 0:00–6:00 大量消耗，该时段 CPM 虽低但转化率偏低，ROI 约 0.6–0.8。如预算有限，建议设置时段投放集中在 10:00–23:00。',
      },
      {
        kind: 'sources',
        refs: [
          SRC('sop-v2', '📘 贵司投放SOP v2.0'),
          SRC('a001-history', '📘 A001 户 · 历史复盘'),
          SRC('exp-budget', '📊 L3 预算经验库'),
        ],
      },
      metaBar('⏱ 2.5 秒 · 5 来源 · 置信度 92%'),
    ],
    sources: [
      SRC('sop-v2', '📘 贵司投放SOP v2.0'),
      SRC('a001-history', '📘 A001 户 · 历史复盘'),
      SRC('exp-budget', '📊 L3 预算经验库'),
    ],
  }),

  /* 决策类：止损决策 —— 拉数据 + 止损阈值判断 + gotoButtons（参考 review/error，ASK-03） */
  shutdown: () => ({
    intent: { intent: '止损决策', style: 'ASK-03', layer: 'L2' },
    steps: [
      '拉取 A001 户近 7 天消耗 + ROI 曲线',
      '比对止损阈值（贵司 SOP：周亏损 ≥ ¥12 万触发预警，≥ ¥18 万强止）',
      '综合判断：继续 / 止损 / 观察',
    ],
    blocks: [
      {
        kind: 'agentPlan',
        head: '已调用止损评估 Agent · 3 步完成',
        items: [
          '✓ 拉取 A001 近 7 天消耗 + ROI 趋势',
          '✓ 对比贵司止损阈值（SOP：¥12–18 万/周）',
          '✓ 综合大盘波动给出决策建议',
        ],
      },
      {
        kind: 'dataCard',
        title: '本周亏损预估',
        source: '⚡ A001 实时数据 · 刚刚',
        metrics: [
          { label: '本周已亏损', value: '¥14.3 万', danger: true },
          { label: '当前周 ROI', value: '0.79', danger: true },
          { label: '止损阈值（SOP）', value: '¥12–18 万/周' },
        ],
      },
      {
        kind: 'ansCard',
        variant: 'warn',
        icon: 'alert',
        head: '决策建议：**进入预警区间，建议观察 + 部分止损**',
        detail:
          '本周已亏损 **¥14.3 万**，已超「预警线 ¥12 万」，但尚未触达「强止线 ¥18 万」。主因：ROI **0.79**（目标 1.2），晚间高价时段消耗下降 -18%，3 条爆款计划被暂停。\n\n建议：**先暂停 ROI < 0.6 的 4 条低效计划**（预计本周止血 ¥4–5 万），重启 3 条已暂停爆款 + 回补晚间出价后，再观察 24 小时决定是否全停。若 24 小时后 ROI 仍 < 0.8，执行全面止损。',
      },
      {
        kind: 'gotoButtons',
        buttons: [
          { label: '查看完整复盘报告 →', variant: 'primary', goto: '/review' },
          { label: '去实时监控 →', variant: 'outline', goto: '/monitor' },
          { label: '⚡ 暂停低效计划', variant: 'ghost', toast: '已加入执行队列：暂停 ROI < 0.6 的 4 条计划' },
        ],
        note: '完整 ROI 趋势图、计划级止损拆分、分优先级操作建议，已在「投放复盘」页生成。',
      },
      {
        kind: 'sources',
        refs: [
          SRC('rt-a001', '⚡ A001 实时数据'),
          SRC('sop-v2', '📘 贵司投放SOP v2.0'),
          SRC('a001-history', '📘 A001 户 · 历史复盘'),
        ],
      },
      metaBar('⏱ 5.6 秒 · 3 步 Agent · 置信度 88%'),
    ],
    sources: [
      SRC('rt-a001', '⚡ A001 实时数据'),
      SRC('sop-v2', '📘 贵司投放SOP v2.0'),
      SRC('a001-history', '📘 A001 户 · 历史复盘'),
    ],
  }),

  /* RPT：周报生成 —— toolCall + dataCard + ansCard + gotoButtons + sources */
  report_gen: () => ({
    intent: { intent: '周报生成', style: 'ASK-05', layer: 'L2' },
    steps: ['拉取本周全账户消耗 + ROI + 转化数据', '汇总亮点与问题方向', '生成投放周报摘要'],
    blocks: [
      {
        kind: 'toolCall' as const,
        head: '🔧 已调用「周报生成」能力…',
        items: [
          '✓ 拉取 A001 等 8 个账户本周（5/26–6/1）消耗 / ROI / 转化数据',
          '✓ 与上周均值对比，识别亮点账户与问题账户',
          '✓ 自动归纳本周投放结论',
        ],
      },
      {
        kind: 'dataCard' as const,
        title: '本周投放概览',
        source: '⚡ 巨量 API · 刚刚',
        metrics: [
          { label: '本周消耗', value: '¥86,200' },
          { label: '周 ROI', value: '0.84', danger: true },
          { label: '总转化数', value: '212' },
          { label: '粉价均值', value: '¥24 / 粉' },
        ],
      },
      {
        kind: 'ansCard' as const,
        icon: 'bid' as const,
        head: '📝 本周周报摘要',
        detail:
          '**亮点**：A008 都市悬疑户 ROI **1.45**，晚间时段消耗持续高于上周 +22%，素材 M301「前妻回来了」完读率 **42%**，为本周最佳单条素材。\n\n**问题**：A001 现言旗舰户 ROI **0.84**（目标 1.2），主因 3 条爆款计划被误暂停导致晚间消耗缺口；A005 学习期超时（>72h），需干预出价。\n\n**建议**：重启 A001 三条爆款计划 + 调价 +15%；A005 提价突破学习期；本周预计止损 **¥12–18 万** 区间，需尽快执行。',
      },
      {
        kind: 'gotoButtons' as const,
        buttons: [
          { label: '导出周报 PDF', variant: 'primary' as const, toast: '正在生成 PDF，预计 10 秒后下载' },
          { label: '跳至投放复盘 →', variant: 'outline' as const, goto: '/review' },
        ],
        note: '完整周报含 ROI 趋势图、账户明细、计划级止损建议，已在「投放复盘」页生成。',
      },
      {
        kind: 'sources' as const,
        refs: [
          SRC('rt-a001', '⚡ A001 实时数据'),
          SRC('rt-8accounts', '⚡ 本周 8 账户数据'),
          SRC('a001-history', '📘 A001 历史复盘'),
        ],
      },
      metaBar('⏱ 4.8 秒 · 3 步 · 置信度 91%'),
    ],
    sources: [
      SRC('rt-a001', '⚡ A001 实时数据'),
      SRC('rt-8accounts', '⚡ 本周 8 账户数据'),
      SRC('a001-history', '📘 A001 历史复盘'),
    ],
  }),

  /* RPT：素材排行 —— rankList（Top5 按 ROI 倒序）+ ansCard + sources */
  material_rank: () => ({
    intent: { intent: '素材排行', style: 'ASK-05', layer: 'L2' },
    steps: ['拉取近 14 天所有在投素材 CTR / ROI 数据', '按 ROI 倒序排列', '标记衰退素材'],
    blocks: [
      { kind: 'text' as const, text: 'A001 账户近 14 天在投素材 · Top 5（按 ROI 倒序）：', tone: 'muted' as const },
      {
        kind: 'rankList' as const,
        title: '素材 ROI 排行榜',
        items: [
          { rank: 1, name: 'M301 · 前妻回来了', roi: '1.72', ctr: '4.8%', tag: '爆款' },
          { rank: 2, name: 'M215 · 总裁的秘密', roi: '1.45', ctr: '4.1%', tag: '稳定' },
          { rank: 3, name: 'M198 · 消失的她', roi: '1.28', ctr: '3.9%', tag: '稳定' },
          { rank: 4, name: 'M789 · 重生之路', roi: '0.61', ctr: '1.2%', tag: '衰退', declining: true },
          { rank: 5, name: 'M402 · 都市赘婿', roi: '0.54', ctr: '1.0%', tag: '衰退', declining: true },
        ],
      },
      {
        kind: 'ansCard' as const,
        variant: 'warn' as const,
        icon: 'alert' as const,
        head: '结论：M789 / M402 已进入衰退期，建议及时处理',
        detail:
          '**Top 3 素材（M301/M215/M198）** 表现健康，ROI 均超达标线 1.2，建议维持出价并持续放量。\n\n**M789 / M402** ROI 已跌至 0.54–0.61，CTR 下滑超 60%，素材衰退信号明确。建议：① 暂停这 2 条计划止血；② 参考 M301 前 3 秒悬念钩子结构，本周上新 2–3 条替代素材。',
      },
      {
        kind: 'sources' as const,
        refs: [
          SRC('rt-a001', '⚡ A001 实时数据'),
          SRC('exp-creative', '📊 L3 素材经验库'),
        ],
      },
      metaBar('⏱ 3.4 秒 · 5 素材 · 置信度 90%'),
    ],
    sources: [
      SRC('rt-a001', '⚡ A001 实时数据'),
      SRC('exp-creative', '📊 L3 素材经验库'),
    ],
  }),

  /* RPT：策略复盘 —— toolCall + dataCard（调整前 vs 后）+ ansCard + sources */
  strategy_review: () => ({
    intent: { intent: '策略复盘', style: 'ASK-05', layer: 'L2' },
    steps: ['拉取出价调整前后 7 天消耗 + ROI 对比', '识别调整效果显著性', '给出策略结论'],
    blocks: [
      {
        kind: 'toolCall' as const,
        head: '🔧 已调用「策略复盘」能力…',
        items: [
          '✓ 拉取 A001 出价调整前 7 天（5/19–5/25）与调整后 7 天（5/26–6/1）数据',
          '✓ 对比消耗 / ROI / CPM / 转化数各维度变化',
          '✓ 判断出价调整效果显著性',
        ],
      },
      {
        kind: 'dataCard' as const,
        title: '出价调整前 → 后对比',
        source: '⚡ A001 实时数据 · 刚刚',
        metrics: [
          { label: '调整前 ROI（均值）', value: '0.84', danger: true },
          { label: '调整后 ROI（均值）', value: '1.05' },
          { label: '消耗变化', value: '+18%' },
          { label: '转化数变化', value: '+34%' },
        ],
      },
      {
        kind: 'ansCard' as const,
        icon: 'bid' as const,
        head: '结论：本次出价调整**有效**，ROI 由 0.84 → 1.05',
        detail:
          '调整出价（+15%）后，A001 ROI 从 **0.84 提升至 1.05**，转化数增加 34%，消耗扩大 18%，方向正确。\n\n但当前 ROI **1.05 仍低于目标 1.2**，建议：① 继续维持当前出价 3 天，让模型充分学习；② 晚间高价时段（20:00–23:00）可再上调 5%，抢占优质曝光；③ 同时重启被暂停的 3 条爆款计划，补足消耗缺口。',
      },
      {
        kind: 'sources' as const,
        refs: [
          SRC('rt-a001', '⚡ A001 实时数据'),
          SRC('sop-v2', '📘 贵司投放SOP v2.0'),
          SRC('a001-history', '📘 A001 历史复盘'),
        ],
      },
      metaBar('⏱ 4.1 秒 · 3 来源 · 置信度 88%'),
    ],
    sources: [
      SRC('rt-a001', '⚡ A001 实时数据'),
      SRC('sop-v2', '📘 贵司投放SOP v2.0'),
      SRC('a001-history', '📘 A001 历史复盘'),
    ],
  }),

  /* RPT：素材诊断（素材级）—— agentPlan + ansCard + gotoButtons */
  material_diag: () => ({
    intent: { intent: '素材级诊断', style: 'ASK-03', layer: 'L2' },
    steps: ['拉取 M789 素材近 14 天 CTR / 完读率 / ROI 曲线', '对比同类爆款素材', '查合规风险', '归因跑不动原因'],
    blocks: [
      {
        kind: 'agentPlan' as const,
        head: '已调用素材诊断 Agent · 4 步完成',
        items: [
          '✓ 拉取 M789「重生之路」近 14 天 CTR / 完读率 / ROI 数据',
          '✓ 对比同类爆款素材（M301 / M215）表现基准',
          '✓ 查审核合规风险（无新增违规）',
          '✓ 综合归因：素材疲劳 + CTR 衰退',
        ],
      },
      {
        kind: 'ansCard' as const,
        variant: 'warn' as const,
        icon: 'alert' as const,
        head: 'M789「重生之路」跑不动原因：**素材疲劳 + CTR 衰退**',
        detail:
          '**主因 1 · CTR 衰退**：M789 入投第 10 天，CTR 从首日 **3.8% 跌至当前 1.2%**，素材衰退信号明确；同类素材（M301）在同阶段 CTR 仍维持 4.5%，说明是素材本身问题而非大盘波动。\n\n**主因 2 · 素材疲劳**：已曝光 **420 万次**，目标受众重叠率 62%，受众池基本触达，边际效果持续下降。\n\n**次因 · 开头钩子偏弱**：前 3 秒无明确冲突 / 悬念，相比 M301「前妻回来了」悬念开场，完读率低 18%。\n\n**建议**：立即暂停 M789，按 M301 结构（悬念冲突 + 大字幕封面）上新替代素材，预计 5 个工作日可完成新素材起量。',
      },
      {
        kind: 'gotoButtons' as const,
        buttons: [
          { label: '查看素材诊断详情 →', variant: 'primary' as const, goto: '/diagnose' },
          { label: '跳至投放复盘 →', variant: 'outline' as const, goto: '/review' },
        ],
        note: '素材衰退曲线、受众重叠率分析、替换素材建议，已在「素材诊断」页生成。',
      },
      {
        kind: 'sources' as const,
        refs: [
          SRC('rt-a001', '⚡ A001 实时数据'),
          SRC('exp-creative', '📊 L3 素材经验库'),
          SRC('reject-history', '📊 历史拒审案例库'),
        ],
      },
      metaBar('⏱ 7.2 秒 · 4 步 Agent · 置信度 92%'),
    ],
    sources: [
      SRC('rt-a001', '⚡ A001 实时数据'),
      SRC('exp-creative', '📊 L3 素材经验库'),
      SRC('reject-history', '📊 历史拒审案例库'),
    ],
  }),

  /* 兜底（fallback）—— 对齐 replyFor 默认回复 */
  /* 数据类宽泛词（只说「数据」）→ 专属引导：选账户 + 指标，不瞎猜账户 */
  data_pick: () => ({
    intent: { intent: '数据查询引导', style: 'ASK-12', layer: 'L1' },
    steps: [],
    blocks: [
      { kind: 'text', text: '想查**哪个账户**的**什么数据**？点一下就给你拉实时的 👇' },
      {
        kind: 'followUps',
        prompt: '常用查询：',
        options: [
          { label: 'A001 今天消耗 / ROI', nextFlow: 'data' },
          { label: '全平台今日汇总消耗', nextFlow: 'data' },
          { label: 'A001 近 7 天 ROI 趋势', nextFlow: 'data' },
          { label: '某计划转化数', nextFlow: 'data' },
        ],
      },
    ],
    sources: [],
  }),

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
        { kind: 'text', text: '你是想看**磁力账户的 ROI** —— K001 快手短剧主户 ROI **1.22**，比巨量这边健康不少。' },
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
    title: '贵司投放SOP v2.0', subtitle: '私域 · L3 团队战术 · 团队上传',
    tags: [{ cls: 'prv-up', text: '🔒 私域' }, { cls: 'gray', text: 'L3 团队' }, { cls: 'confidence', text: '命中率 92%' }],
    chunkId: 'CHUNK_017', chunkTokens: 412, citedTimes: 38,
    chunk: '现言短剧 OCPM 起量阶段建议出价区间：22-35 元。首日以 1.1× 基础出价测水温，2 小时内消耗低于 200 元则提价至 25 元；日消 1000+ 且转化稳定后，调整至 22-35 元区间，ROI > 1.2 时加速放量。放量阶段缓步加价，每天调整不超过 2 元，每日预算同步放宽 10-15%。',
    meta: { 上传人: '钱晓彤', 上传时间: '2026-05-14（14 天前）', 版本: 'v2.0（v1.0 见历史版本）', 文档大小: '2.4 MB（PDF · 32 页）', 索引模型: 'bge-large-zh-v1.5' },
    stats: { 被引用: 142, 命中率: '92%', 点赞: 98 },
  },
  'q1-report': {
    id: 'q1-report', icon: '📘', iconClass: 't-doc',
    title: '贵司 Q1 复盘报告', subtitle: '私域 · L3 团队战术 · 复盘自动归档',
    tags: [{ cls: 'prv-ai', text: '🤖 AI 沉淀' }, { cls: 'gray', text: 'L3 团队' }, { cls: 'confidence', text: '命中率 88%' }],
    chunkId: 'CHUNK_006', chunkTokens: 388, citedTimes: 21,
    chunk: '2024Q1 共投放 23 个现言短剧账户，OCPM 起量阶段均价 22-30 元，单计划 ROI ≥ 1.2 占比 67%。首日 18 元起步策略在 A001/A008/A005 等账户表现最优，日均消耗稳定上升 25-40%。建议沿用首日低出价试水 + 2 小时观测调价 + 突破后阶梯加价的"三步法"。',
    meta: { 生成方式: 'Agent 自动沉淀（已主管审核）', 原始来源: '12 次复盘对话片段', 归档时间: '2024-04-08', 关联账户: 'A001 / A008 / A005 等 23 个' },
    stats: { 被引用: 78, 命中率: '88%', 点赞: 67 },
  },
  'bench-2024q4': {
    id: 'bench-2024q4', icon: '📊', iconClass: 't-bench',
    title: '行业 benchmark · 短剧 2024 Q4', subtitle: '公域 · L2 行业基准 · API 自动同步',
    tags: [{ cls: 'pub', text: '🌐 公域' }, { cls: 'gray', text: 'L2 公域' }, { cls: 'confidence', text: '命中率 78%' }],
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
        { cells: ['A005', '古言', '24', '1.05'] },
        { cells: ['A006', '男频爽文', '23', '1.28'] },
        { cells: ['A008', '都市悬疑', '24', '1.15'] },
        { cells: ['K001', '快手短剧', '25', '1.22'] },
        { cells: ['K002', '快手测试', '21', '0.92'] },
        { cells: ['T001', '腾讯短剧', '26', '1.10'] },
      ],
    },
    meta: { 查询范围: '8 个授权账户', 查询时间: '刚刚（5 秒前）', 'API': '巨量本地 SDK · v2.4', 数据lag: '< 60 秒' },
    stats: { 今日调用: 12, 本月引用: 384, 准确率: '99.9%' },
  },
  'audit-v3-2': {
    id: 'audit-v3-2', icon: '📘', iconClass: 't-rule',
    title: '巨量审核规则 v3.2', subtitle: '平台官方 · L1 平台规则 · API 自动同步',
    tags: [{ cls: 'pub', text: '🛡️ 平台' }, { cls: 'gray', text: 'L1 平台' }, { cls: 'confidence', text: '命中率 94%' }],
    chunkId: 'CHUNK_014', chunkTokens: 320, citedTimes: 412,
    chunk: '【规则 #14】短剧广告中禁止出现明显暗示性肢体动作、过度血腥场面（含卡通化呈现）；男女对峙类场景须避免直接喊话挑衅形式。【规则 #08】凶杀类对白须以叙事化呈现，不得直接陈述凶器、行凶对象、伤口部位等具象细节。',
    meta: { 数据来源: '巨量审核中心 API', 版本: 'v3.2（2025-04-12 更新）', 生效时间: '2025-04-15', 关联规则数: '14 / 482 条' },
    stats: { 被引用: 412, 命中率: '94%', 点赞: 305 },
  },
  'reject-history': {
    id: 'reject-history', icon: '📊', iconClass: 't-case',
    title: '历史拒审案例库', subtitle: '私域 · L3 团队战术 · 自动归档',
    tags: [{ cls: 'prv-ai', text: '🤖 AI 沉淀' }, { cls: 'gray', text: 'L3 团队' }, { cls: 'confidence', text: '命中率 91%' }],
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
    title: '行业 benchmark · 短剧大盘', subtitle: '公域 · L2 行业基准',
    tags: [{ cls: 'pub', text: '🌐 公域' }, { cls: 'gray', text: 'L2 公域' }, { cls: 'confidence', text: '命中率 82%' }],
    chunkId: 'CHUNK_009', chunkTokens: 198, citedTimes: 56,
    chunk: '今日大盘短剧 CPM 较昨日上涨 6.8%。Q1 末-Q2 初为传统淡季尾声，行业 ROI 平均值小幅波动 ±5% 属正常区间。建议关注本周末后 3 天反弹趋势。',
    meta: { 数据来源: '巨量行业大盘', 同步时间: '今日 09:00', 题材覆盖: '现言/古言/玄幻/都市' },
    stats: { 被引用: 56, 命中率: '82%', 点赞: 41 },
  },
  'a001-history': {
    id: 'a001-history', icon: '📘', iconClass: 't-doc',
    title: 'A001 户 · 历史复盘', subtitle: '私域 · L3 个人偏好',
    tags: [{ cls: 'prv-up', text: '🔒 私域' }, { cls: 'gray', text: 'L3 个人' }, { cls: 'confidence', text: '命中率 90%' }],
    chunkId: 'CHUNK_004', chunkTokens: 364, citedTimes: 12,
    chunk: 'A001 户最近 30 天 ROI 在晚 21:00-23:00 时段最高（均值 1.45），其中"现言-都市悬疑"题材表现最佳。上月同期出现过类似下滑情况，3 条爆款计划被错误暂停，重启后 ROI 4 小时恢复至 1.2 以上。',
    meta: { 账户: 'A001', 复盘数量: '14 次（近 30 天）', 主要题材: '现言、都市悬疑', 所属投手: '林磊' },
    stats: { 被引用: 12, 命中率: '90%', 点赞: 9 },
  },
  'exp-targeting': {
    id: 'exp-targeting', icon: '📊', iconClass: 't-bench',
    title: 'L3 定向经验库', subtitle: '私域 · L3 团队战术 · AI 沉淀',
    tags: [{ cls: 'prv-ai', text: '🤖 AI 沉淀' }, { cls: 'gray', text: 'L3 团队' }, { cls: 'confidence', text: '命中率 89%' }],
    chunkId: 'CHUNK_041', chunkTokens: 356, citedTimes: 29,
    chunk: '起量期（前 3 天）建议宽定向：兴趣标签仅保留「短剧 + 小说阅读」，不叠加行为包，单计划候选人群 ≥ 5,000 万。稳定期（连续 3 天 ROI ≥ 1.2）收窄：锁定 25–40 岁女性 + 付费行为包，CPM 可降低 8–12%，整体 ROI 提升约 0.1–0.2。达人定向建议作为辅助补量，不作主力。',
    meta: { 数据来源: '团队近 30 天 8 个账户定向实验', 题材覆盖: '现言/古言/都市', 更新方式: 'Agent 周期沉淀', 归档时间: '2026-05-20' },
    stats: { 被引用: 29, 命中率: '89%', 点赞: 22 },
  },
  'exp-creative': {
    id: 'exp-creative', icon: '📊', iconClass: 't-case',
    title: 'L3 素材经验库', subtitle: '私域 · L3 团队战术 · AI 沉淀',
    tags: [{ cls: 'prv-ai', text: '🤖 AI 沉淀' }, { cls: 'gray', text: 'L3 团队' }, { cls: 'confidence', text: '命中率 87%' }],
    chunkId: 'CHUNK_055', chunkTokens: 398, citedTimes: 44,
    chunk: '贵司近 90 天爆款素材特征：① 前 3 秒悬念冲突型平均完读率 38%（vs 平淡叙事 22%）；② 剪辑版起量快（学习期平均缩短 1.2 天），口播版 ROI 更稳（周 ROI 高 0.15）；③ 封面：人脸特写 + 大字幕，CTR 比风景封面高 40%；④ 标题：身份冲突类（总裁/打工妹/前妻）CTR 高 28%。建议每周上新 3–5 条，防素材衰退。',
    meta: { 数据来源: '团队近 90 天素材投放记录', 题材覆盖: '现言/男频/古言', 爆款定义: '单条素材消耗 ≥ ¥5,000 且 ROI ≥ 1.2', 归档时间: '2026-05-28' },
    stats: { 被引用: 44, 命中率: '87%', 点赞: 36 },
  },
  'exp-budget': {
    id: 'exp-budget', icon: '📊', iconClass: 't-bench',
    title: 'L3 预算经验库', subtitle: '私域 · L3 团队战术 · AI 沉淀',
    tags: [{ cls: 'prv-ai', text: '🤖 AI 沉淀' }, { cls: 'gray', text: 'L3 团队' }, { cls: 'confidence', text: '命中率 90%' }],
    chunkId: 'CHUNK_033', chunkTokens: 312, citedTimes: 31,
    chunk: '单计划日预算保底 = 出价 × 20；起量期 500–1,000 元/天，连续 2 天日消 ≥ 400 元后放量至 2,000 元；每 2 天预算上浮 10-15%。时段 ROI 分布：晚 18:00–23:00 均值 1.45（峰值段），白天 10:00–17:00 均值 0.92，凌晨 0:00–6:00 均值 0.68。建议集中投放 10:00–23:00，晚间高价时段允许超预算 10%。',
    meta: { 数据来源: 'A001 近 30 天消耗曲线 + 团队 8 个账户', 题材: '现言短剧', 更新方式: 'Agent 月度沉淀', 归档时间: '2026-05-15' },
    stats: { 被引用: 31, 命中率: '90%', 点赞: 25 },
  },
  'gdt-audit': {
    id: 'gdt-audit', icon: '📘', iconClass: 't-rule',
    title: '广点通审核规范 v2.1', subtitle: '平台官方 · L1 平台规则 · API 自动同步',
    tags: [{ cls: 'pub', text: '🛡️ 平台' }, { cls: 'gray', text: 'L1 平台' }, { cls: 'confidence', text: '命中率 89%' }],
    chunkId: 'CHUNK_031', chunkTokens: 298, citedTimes: 78,
    chunk: '【第 3.2 条 · 网络视听内容资质要求】涉及网络视听节目内容（含短剧、微短剧、竖屏剧）的广告推广，广告主须完成 SC 认证并在投前提交《广告审查表》（由持证方出具）或相关备案截图。未满足资质要求的计划将触发合规拦截，与创意内容合规性无关。',
    meta: { 数据来源: '广点通审核中心 API', 版本: 'v2.1（2025-03-20 更新）', 生效时间: '2025-04-01', 关联规则数: '6 / 317 条' },
    stats: { 被引用: 78, 命中率: '89%', 点赞: 61 },
  },
}

/** GET /api/qa/sources/{id} —— 取来源详情；不存在返回 404 形态 */
export function mockSourceDetail(id: string): ApiResponse<SourceDetail | null> {
  const data = SOURCE_MAP[id]
  if (!data) return { code: 404, message: '该来源暂无详情', data: null }
  return { code: 200, message: 'success', data: { ...data } }
}
