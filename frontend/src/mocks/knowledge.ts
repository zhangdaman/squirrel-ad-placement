/**
 * 知识库模块 Mock
 * 严格对齐 docs/api-contracts.md 与 docs/prototypes/knowledge.html：
 *   - GET  /api/knowledge/search   → 按 q + source/type/tag/hit_rate/sort 过滤 + 排序 + 分页
 *   - POST /api/knowledge/{id}/feedback → 赞 / 踩，回传更新后计数
 * 5 个筛选 chip 的下拉选项也在此集中定义（FILTERS），页面与 FilterChip 共用。
 * 所有展示型 Mock 数据带 [Mock] 标识（卡片标题前缀），接真实接口后移除。
 * DTO 收敛：内部实体 KB_ENTITIES 为字段超集，search / detail 各按 endpoint 显式 map。
 */
import type { ApiResponse } from '@/types/auth'
import type {
  FilterDef,
  FilterKey,
  FilterState,
  KnowledgeCat,
  KnowledgeDetail,
  KnowledgeEntity,
  KnowledgeKpi,
  KnowledgeLayer,
  KnowledgeListItem,
  KnowledgeNavCounts,
  KnowledgeSearchData,
  KnowledgeUploadPayload,
  FeedbackResult,
  FeedbackVote,
} from '@/types/knowledge'

const MOCK = '[Mock] '

/* ============================================================
 * 顶部 KPI（对齐 knowledge.html kb-kpi-row）
 * ============================================================ */
export function mockKpis(): KnowledgeKpi[] {
  // 全部由 KB_ENTITIES 真实统计，杜绝写死注水数
  const all = KB_ENTITIES.length
  const totalCited = KB_ENTITIES.reduce((s, e) => s + e.cited, 0)
  const done = KB_ENTITIES.filter((e) => e.status.kind === 'done')
  const avgHit = done.length
    ? Math.round((done.reduce((s, e) => s + e.hit_rate, 0) / done.length) * 100)
    : 0
  const zero = KB_ENTITIES.filter((e) => e.cited === 0).length
  const processing = KB_ENTITIES.filter((e) => e.status.kind === 'processing').length
  const warn = KB_ENTITIES.filter((e) => e.status.kind === 'warn').length
  return [
    { tone: 'b', label: '知识总数', value: String(all) },
    { tone: 'o', label: '累计被引用', value: totalCited.toLocaleString('en-US') },
    { tone: 'g', label: '平均命中率', value: avgHit + '%' },
    {
      tone: 'r',
      label: '零引用 / 待处理',
      value: `${zero} / ${processing + warn}`,
      trend: zero + processing + warn > 0 ? '需关注' : undefined,
      trendWarn: true,
    },
  ]
}

/* ============================================================
 * 5 个筛选 chip 的下拉定义（对齐任务书选项 + 契约 query）
 * 顺序：来源 / 类型 / 标签 / 命中率 / 排序
 * ============================================================ */
export function mockFilters(): FilterDef[] {
  return [
    {
      key: 'source',
      prefix: '来源',
      options: [
        { value: 'prv-up', label: '私域 L2 题材打法' },
        { value: 'pub', label: '公域大盘' },
        { value: 'platform', label: '平台官方规则' },
        { value: 'history', label: '历史复盘' },
      ],
    },
    {
      key: 'type',
      prefix: '类型',
      options: [
        { value: 'rule', label: '投放规则' },
        { value: 'case', label: '实战案例' },
        { value: 'template', label: '话术模板' },
        { value: 'benchmark', label: '数据基准' },
      ],
    },
    {
      key: 'tag',
      prefix: '标签',
      options: [
        { value: '题材打法', label: '题材打法' },
        { value: '出价策略', label: '出价策略' },
        { value: '素材创意', label: '素材创意' },
        { value: '审核合规', label: '审核合规' },
        { value: '账户搭建', label: '账户搭建' },
      ],
    },
    {
      key: 'hit_rate',
      prefix: '命中率',
      options: [
        { value: 'high', label: '高 ≥70%' },
        { value: 'mid', label: '中 40-70%' },
        { value: 'low', label: '低 <40%' },
      ],
    },
    {
      key: 'sort',
      prefix: '排序',
      options: [
        { value: 'cited', label: '被引用' },
        { value: 'latest', label: '最新' },
        { value: 'hit_rate', label: '命中率' },
        { value: 'collected', label: '收藏数' },
      ],
    },
  ]
}

/** 默认筛选态（来源默认私域 L2、排序默认被引用，对齐原型高亮 chip） */
export function defaultFilterState(): FilterState {
  return { source: '', type: '', tag: '', hit_rate: '', sort: 'cited' }
}

/* ============================================================
 * 内部实体（字段超集 · 6 条，对齐 knowledge.html 卡片）
 * ============================================================ */

const DONE = { kind: 'done', label: '已向量化' } as const

const KB_ENTITIES: KnowledgeEntity[] = [
  {
    id: 'k1',
    title: '巨量引擎 · 短剧广告审核新规 v3.2',
    layer: 'L1',
    source: 'platform',
    cat: 'juliang',
    type: 'rule',
    cited: 412,
    hit_rate: 0.94,
    collected: 56,
    summary:
      '规定短剧广告中暴力血腥、低俗暗示、夸大情节等场景的具体审核标准。共 14 条细则，覆盖文案、口播、视觉、转场等维度。',
    chunk:
      '"禁止出现明显暗示性肢体动作、过度血腥场面（包括卡通化呈现）；男女对峙类场景须避免直接喊话挑衅形式 …"',
    tags: ['审核合规', '素材创意', '账户搭建'],
    updated: 'API 同步 · 2 小时前更新',
    updated_at: 1717200000000,
    status: { ...DONE },
    chunks: [
      {
        id: 'CHUNK_001',
        tokens: 402,
        tag: '审核总则',
        text: '短剧广告审核遵循「先合规、后投放」原则：暴力血腥、低俗暗示、夸大情节三类为高频驳回项，须在素材产出阶段前置规避。',
      },
      {
        id: 'CHUNK_002',
        tokens: 388,
        tag: '对峙场景',
        highlight: true,
        hotLabel: '高引用 · 64 次',
        text: '男女对峙类场景须避免直接喊话挑衅形式；可用环境音 + 留白替代直接冲突台词，降低「煽动对立」判定风险。',
      },
    ],
    meta: {
      知识ID: 'KB-L1-R-3201',
      来源类型: '平台 API 同步（巨量引擎）',
      同步频率: '每日 02:00 自动同步',
      向量化模型: 'bge-large-zh-v1.5 · 1024 维',
      索引: 'Milvus · cluster-prod-01',
    },
    versions: [
      { version: 'v3.2', by: 'API 同步 · 2 小时前', current: true },
      { version: 'v3.1', by: 'API 同步 · 12 天前' },
    ],
    feedback: { up: 386, down: 9 },
  },
  {
    id: 'k2',
    title: '都市悬疑题材 · 5 秒钩子方法论 v2.1',
    layer: 'L2',
    source: 'prv-up',
    cat: 'ticai',
    type: 'case',
    cited: 142,
    hit_rate: 0.86,
    collected: 41,
    summary:
      '团队在男频都市悬疑题材中积累的 5 秒前钩子组合公式：悬念抛出 → 反转预告 → 留白引诱。覆盖文案、口播、运镜 3 个维度共 12 种模板。',
    chunk:
      '"钩子位前 3 秒须出现至少 1 个反差画面（如：朴素装扮 → 凶相）；4-5 秒须出现可触发好奇的关键道具或对白片段 …"',
    tags: ['题材打法', '素材创意'],
    updated: '钱晓彤 · 7 天前更新',
    updated_at: 1716595200000,
    status: { ...DONE },
    chunks: [
      {
        id: 'CHUNK_001',
        tokens: 412,
        tag: '钩子总论',
        text: '一条优质的都市悬疑钩子，应在 5 秒内完成三步：① 视觉反差锚定（朴素外貌 → 异常表情/动作）；② 关键悬念信息抛出（一句留白对白）；③ 隐性预告（暗示后文存在反转/真相）。',
      },
      {
        id: 'CHUNK_002',
        tokens: 386,
        tag: '前 3 秒标准',
        highlight: true,
        hotLabel: '高引用 · 38 次',
        text: '前 3 秒须出现至少 1 个反差画面（例：朴素装扮 → 凶相 / 病弱 → 突然起身）。镜头切换不超过 2 次。第 1 秒为定场镜头，第 2-3 秒为视觉反差爆点 …',
      },
      {
        id: 'CHUNK_003',
        tokens: 364,
        tag: '4-5 秒钩子位',
        text: '4-5 秒须出现可触发好奇的关键道具（信封/血迹/钥匙等）或对白片段。对白应满足"信息缺失"原则：让观众想知道下一句 …',
      },
    ],
    meta: {
      知识ID: 'KB-L2-T-0142',
      来源类型: '团队上传（PDF · 32 页）',
      原始文件: '都市悬疑钩子方法论_v2.1.pdf · 2.4 MB',
      上传人: '钱晓彤 · 投放主管',
      上传时间: '2026-05-21 14:32',
      分块大小: '400 tokens · overlap 50',
      向量化模型: 'bge-large-zh-v1.5 · 1024 维',
    },
    versions: [
      { version: 'v2.1', by: '钱晓彤 · 7 天前', current: true },
      { version: 'v2.0', by: '钱晓彤 · 28 天前' },
      { version: 'v1.0', by: '李响 · 4 个月前' },
    ],
    feedback: { up: 98, down: 14 },
  },
  {
    id: 'k3',
    title: '智能放量阶段出价调整 SOP',
    layer: 'L2',
    source: 'history',
    cat: 'chujia',
    type: 'template',
    cited: 78,
    hit_rate: 0.81,
    collected: 33,
    summary:
      '由 5 次复盘 Agent 自动总结产生的出价调整经验：放量第 1/3/7 天的出价阶梯、止损线、加价阈值。已被人工审核确认。',
    chunk:
      '"放量首日：基础出价 × 1.1；ROI 低于 0.8 时立即降至 ×0.9，且暂停放量观察 4 小时再决定是否复投 …"',
    tags: ['出价策略', '题材打法'],
    updated: 'AI 自动沉淀 · 3 天前 · 钱晓彤已审核',
    updated_at: 1716940800000,
    status: { ...DONE },
    chunks: [
      {
        id: 'CHUNK_001',
        tokens: 356,
        tag: '放量首日',
        text: '放量首日：基础出价 × 1.1；ROI 低于 0.8 时立即降至 ×0.9，且暂停放量观察 4 小时再决定是否复投。',
      },
      {
        id: 'CHUNK_002',
        tokens: 342,
        tag: '止损线',
        highlight: true,
        hotLabel: '高引用 · 21 次',
        text: '止损线：单计划周累计亏损达 ¥12-18 万即触发人工复核；连续 2 日 ROI < 0.7 自动转「观察」状态。',
      },
    ],
    meta: {
      知识ID: 'KB-L2-S-0078',
      来源类型: 'AI 自动沉淀（复盘 Agent × 5 次）',
      审核人: '钱晓彤 · 投放主管',
      沉淀时间: '2026-05-29 09:12',
      向量化模型: 'bge-large-zh-v1.5 · 1024 维',
    },
    versions: [
      { version: 'v1.2', by: 'AI 沉淀 · 3 天前', current: true },
      { version: 'v1.1', by: 'AI 沉淀 · 18 天前' },
    ],
    feedback: { up: 54, down: 7 },
  },
  {
    id: 'k4',
    title: '男频爽文 ROI 公式手册（旧版）',
    layer: 'L2',
    source: 'prv-up',
    cat: 'chujia',
    type: 'benchmark',
    cited: 34,
    hit_rate: 0.42,
    collected: 8,
    summary:
      '2024 年 Q3 沉淀的男频爽文 ROI 模型。近期被 AI 召回但命中率持续走低，疑似平台政策变化后已失效。建议复审或归档。',
    chunk: '"男频爽文 ROI 基线 = 加粉成本 × 转化系数（0.32）；该系数自 2024Q4 起已显著偏离实际 …"',
    tags: ['出价策略', '题材打法'],
    updated: '李响 · 6 个月前更新',
    updated_at: 1701302400000,
    status: { kind: 'warn', label: '⚠ 待优化' },
    chunks: [
      {
        id: 'CHUNK_001',
        tokens: 320,
        tag: 'ROI 基线',
        text: '男频爽文 ROI 基线 = 加粉成本 × 转化系数（0.32）。注：该系数自 2024Q4 起已显著偏离实际，命中率持续走低。',
      },
    ],
    meta: {
      知识ID: 'KB-L2-B-0034',
      来源类型: '团队上传（Excel）',
      上传人: '李响 · 投手',
      上传时间: '2025-12-02 11:20',
      状态备注: '命中率 42% · 建议复审或归档',
    },
    versions: [{ version: 'v1.0', by: '李响 · 6 个月前', current: true }],
    feedback: { up: 12, down: 19 },
  },
  {
    id: 'k5',
    title: '女频虐恋 · 高 ROI 素材结构拆解（5月）',
    layer: 'L2',
    source: 'prv-up',
    cat: 'sucai',
    type: 'case',
    cited: 0,
    hit_rate: 0,
    collected: 2,
    summary:
      '30 条高 ROI 素材的逐帧拆解 + 节奏曲线分析。当前正在执行：清洗 ✓ → 分块 ⏳ → 元数据 → 标签 → 向量化',
    tags: ['素材创意', '题材打法'],
    updated: '李响 · 5 分钟前上传',
    updated_at: 1717225800000,
    status: { kind: 'processing', label: '分块中 3/5', progress: 60 },
    chunks: [],
    meta: {
      知识ID: 'KB-L2-C-pending',
      来源类型: '团队上传（视频拆解文档）',
      上传人: '李响 · 投手',
      上传时间: '2026-06-01 刚刚',
      处理进度: '清洗 ✓ → 分块 ⏳ → 元数据 → 标签 → 向量化',
    },
    versions: [{ version: 'v0.1', by: '李响 · 5 分钟前', current: true }],
    feedback: { up: 0, down: 0 },
  },
  {
    id: 'k6',
    title: '磁力金牛 · 行业 CPM 基准 2025 Q1',
    layer: 'L1',
    source: 'pub',
    cat: 'cili',
    type: 'benchmark',
    cited: 94,
    hit_rate: 0.89,
    collected: 27,
    summary:
      '短剧、电商、游戏等 12 个一级行业的 CPM / oCPM 基准线 + 月度浮动区间。用于诊断 CPM 偏离时提供横向参考。',
    chunk: '"短剧行业 oCPM 基准 ¥18.6，月度浮动 ±12%；超出区间 1.5 倍以上建议核查定向与素材新鲜度 …"',
    tags: ['账户搭建', '出价策略'],
    updated: 'API 同步 · 1 天前更新',
    updated_at: 1717142400000,
    status: { ...DONE },
    chunks: [
      {
        id: 'CHUNK_001',
        tokens: 372,
        tag: '短剧基准',
        text: '短剧行业 oCPM 基准 ¥18.6，月度浮动 ±12%；超出区间 1.5 倍以上建议核查定向与素材新鲜度。',
      },
      {
        id: 'CHUNK_002',
        tokens: 358,
        tag: '电商基准',
        text: '电商行业 oCPM 基准 ¥24.3，大促期间上浮至 ¥31 区间属正常，非大促超 ¥28 需复核。',
      },
    ],
    meta: {
      知识ID: 'KB-L1-B-2501',
      来源类型: '平台 API 同步（磁力金牛）',
      同步频率: '每周一自动同步',
      向量化模型: 'bge-large-zh-v1.5 · 1024 维',
      索引: 'Milvus · cluster-prod-01',
    },
    versions: [
      { version: '2025Q1', by: 'API 同步 · 1 天前', current: true },
      { version: '2024Q4', by: 'API 同步 · 90 天前' },
    ],
    feedback: { up: 71, down: 5 },
  },

  /* ---------- 公域 · 巨量引擎规则（juliang）---------- */
  {
    id: 'k7', title: '巨量引擎 · 千川短剧起量定向包配置规范', layer: 'L1', source: 'platform', cat: 'juliang', type: 'rule',
    cited: 186, hit_rate: 0.91, collected: 31,
    summary: '官方推荐的短剧起量定向组合：莱卡人群 + 行为兴趣 + 达人相似。含 8 个标准定向包模板与放量阶段切换建议。',
    chunk: '"起量期优先用系统智能推荐 + 1 个行为兴趣定向包；学习期满后再叠加莱卡精准包，避免一上来就收窄 …"',
    tags: ['账户搭建', '出价策略'],
    updated: 'API 同步 · 1 天前更新', updated_at: 1717100000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 366, tag: '起量定向', text: '起量期优先使用系统智能推荐叠加单个行为兴趣定向包，学习期满（通常 20 个转化）后再叠加莱卡精准包，避免初期人群过窄拖慢跑量。' }],
    meta: { 知识ID: 'KB-L1-R-3210', 来源类型: '平台 API 同步（巨量引擎）', 向量化模型: 'bge-large-zh-v1.5 · 1024 维' },
    versions: [{ version: 'v1.0', by: 'API 同步 · 1 天前', current: true }],
    feedback: { up: 158, down: 9 },
  },
  {
    id: 'k8', title: '巨量引擎 · 短剧 oCPM 二阶出价机制说明', layer: 'L1', source: 'platform', cat: 'juliang', type: 'rule',
    cited: 142, hit_rate: 0.88, collected: 24,
    summary: '解释 oCPM 下「展示出价 → 转化出价」的二阶换算逻辑，以及冷启动期出价系数对跑量速度的影响。',
    chunk: '"冷启动期建议出价上浮 10-15% 抢量，跑出 20 个转化后逐步回调至目标成本，回调幅度单次不超过 8% …"',
    tags: ['出价策略'],
    updated: 'API 同步 · 3 天前更新', updated_at: 1716950000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 352, tag: '冷启动出价', text: '冷启动期建议出价上浮 10-15% 抢量，跑出 20 个转化后逐步回调至目标成本，单次回调幅度不超过 8%，避免触发系统重新学习。' }],
    meta: { 知识ID: 'KB-L1-R-3211', 来源类型: '平台 API 同步（巨量引擎）', 向量化模型: 'bge-large-zh-v1.5 · 1024 维' },
    versions: [{ version: 'v1.0', by: 'API 同步 · 3 天前', current: true }],
    feedback: { up: 121, down: 11 },
  },

  /* ---------- 公域 · 磁力金牛规则（cili）---------- */
  {
    id: 'k9', title: '磁力金牛 · 短剧达人定向白名单规则', layer: 'L1', source: 'pub', cat: 'cili', type: 'rule',
    cited: 88, hit_rate: 0.85, collected: 19,
    summary: '快手磁力金牛短剧达人投放的白名单准入与定向规则，含达人粉丝量级分层与内容垂直度要求。',
    chunk: '"达人相似定向需粉丝量 ≥ 10w 且短剧内容垂直度 ≥ 0.6；低于阈值的达人不进入相似扩量池 …"',
    tags: ['账户搭建', '题材打法'],
    updated: 'API 同步 · 2 天前更新', updated_at: 1716980000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 340, tag: '达人准入', text: '达人相似定向要求粉丝量 ≥ 10 万且短剧内容垂直度 ≥ 0.6，低于阈值的达人不进入相似扩量池。' }],
    meta: { 知识ID: 'KB-L1-R-1250', 来源类型: '平台 API 同步（磁力金牛）', 向量化模型: 'bge-large-zh-v1.5 · 1024 维' },
    versions: [{ version: 'v1.0', by: 'API 同步 · 2 天前', current: true }],
    feedback: { up: 74, down: 6 },
  },
  {
    id: 'k10', title: '磁力金牛 · 快手短剧分成与结算政策 2025', layer: 'L1', source: 'pub', cat: 'cili', type: 'benchmark',
    cited: 67, hit_rate: 0.82, collected: 15,
    summary: '2025 年快手短剧 IAA / IAP 双模式分成比例、结算周期与充值回传口径说明。',
    chunk: '"IAA 模式按有效播放分成，T+15 结算；IAP 模式按充值流水分成，需正确回传 ROI 事件 …"',
    tags: ['账户搭建', '出价策略'],
    updated: 'API 同步 · 5 天前更新', updated_at: 1716700000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 348, tag: '结算口径', text: 'IAA 模式按有效播放分成、T+15 结算；IAP 模式按充值流水分成，须正确回传 ROI 付费事件，否则无法参与分成核算。' }],
    meta: { 知识ID: 'KB-L1-B-1251', 来源类型: '平台 API 同步（磁力金牛）', 向量化模型: 'bge-large-zh-v1.5 · 1024 维' },
    versions: [{ version: '2025', by: 'API 同步 · 5 天前', current: true }],
    feedback: { up: 58, down: 5 },
  },

  /* ---------- 公域 · 腾讯广告规则（tencent）---------- */
  {
    id: 'k11', title: '腾讯广告 · 短剧广告版位与流量分布规则', layer: 'L1', source: 'platform', cat: 'tencent', type: 'rule',
    cited: 73, hit_rate: 0.84, collected: 17,
    summary: '腾讯广告（优量汇 / 视频号）短剧可投版位、流量特征与版位优选建议。',
    chunk: '"视频号信息流短剧用户停留时长更高，适合长钩子；优量汇激励视频位适合强反转短钩子 …"',
    tags: ['账户搭建', '素材创意'],
    updated: 'API 同步 · 2 天前更新', updated_at: 1716985000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 344, tag: '版位特征', text: '视频号信息流短剧用户停留时长更高、适合长钩子叙事；优量汇激励视频位用户耐心低，适合强反转短钩子。' }],
    meta: { 知识ID: 'KB-L1-R-7810', 来源类型: '平台 API 同步（腾讯广告）', 向量化模型: 'bge-large-zh-v1.5 · 1024 维' },
    versions: [{ version: 'v1.0', by: 'API 同步 · 2 天前', current: true }],
    feedback: { up: 61, down: 7 },
  },
  {
    id: 'k12', title: '腾讯广告 · 优量汇短剧素材审核要点', layer: 'L1', source: 'platform', cat: 'tencent', type: 'rule',
    cited: 59, hit_rate: 0.8, collected: 12,
    summary: '腾讯系短剧素材常见驳回点与规避方案，覆盖封面、首帧、诱导话术三类高频问题。',
    chunk: '"首帧禁止纯黑屏或纯文字卡；诱导性话术（如「点击领取」）需弱化，改为剧情悬念引导 …"',
    tags: ['审核合规', '素材创意'],
    updated: 'API 同步 · 4 天前更新', updated_at: 1716800000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 338, tag: '审核要点', text: '首帧禁止纯黑屏或纯文字卡；诱导性话术（如「点击领取」）须弱化，改为剧情悬念引导，降低驳回率。' }],
    meta: { 知识ID: 'KB-L1-R-7811', 来源类型: '平台 API 同步（腾讯广告）', 向量化模型: 'bge-large-zh-v1.5 · 1024 维' },
    versions: [{ version: 'v1.0', by: 'API 同步 · 4 天前', current: true }],
    feedback: { up: 48, down: 9 },
  },
  {
    id: 'k13', title: '腾讯广告 · 视频号短剧 ROI 基准 2025 Q1', layer: 'L1', source: 'pub', cat: 'tencent', type: 'benchmark',
    cited: 51, hit_rate: 0.79, collected: 11,
    summary: '视频号短剧各题材 ROI / 首日回收基准线，用于诊断投放表现是否偏离大盘。',
    chunk: '"视频号都市题材首日回收基准 0.45，7 日 ROI 基准 0.95；低于基准 20% 建议核查素材与定向 …"',
    tags: ['出价策略', '题材打法'],
    updated: 'API 同步 · 6 天前更新', updated_at: 1716600000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 342, tag: 'ROI 基准', text: '视频号都市题材首日回收基准 0.45、7 日 ROI 基准 0.95；低于基准 20% 建议核查素材新鲜度与定向精度。' }],
    meta: { 知识ID: 'KB-L1-B-7812', 来源类型: '平台 API 同步（腾讯广告）', 向量化模型: 'bge-large-zh-v1.5 · 1024 维' },
    versions: [{ version: '2025Q1', by: 'API 同步 · 6 天前', current: true }],
    feedback: { up: 44, down: 6 },
  },

  /* ---------- 私域 · 题材打法（ticai）---------- */
  {
    id: 'k14', title: '古风重生题材 · 开篇 3 秒留人模型', layer: 'L2', source: 'prv-up', cat: 'ticai', type: 'case',
    cited: 96, hit_rate: 0.83, collected: 28,
    summary: '团队沉淀的古风重生题材开篇公式：身份反差 + 命运预告 + 名场面前置。含 6 条爆款拆解。',
    chunk: '"古风重生开篇 3 秒须给出「重生」信息锚点（如睁眼台词、熟悉场景），第 4-5 秒抛出复仇/逆袭预告 …"',
    tags: ['题材打法', '素材创意'],
    updated: '钱晓彤 · 4 天前更新', updated_at: 1716820000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 372, tag: '开篇模型', text: '古风重生题材开篇 3 秒须给出「重生」信息锚点（睁眼台词 / 熟悉场景闪回），第 4-5 秒抛出复仇或逆袭预告，留人率提升明显。' }],
    meta: { 知识ID: 'KB-L2-T-0143', 来源类型: '团队上传（PDF · 18 页）', 上传人: '钱晓彤 · 投放主管' },
    versions: [{ version: 'v1.0', by: '钱晓彤 · 4 天前', current: true }],
    feedback: { up: 81, down: 10 },
  },
  {
    id: 'k15', title: '现代复仇爽文 · 情绪爆点节奏曲线', layer: 'L2', source: 'prv-up', cat: 'ticai', type: 'case',
    cited: 74, hit_rate: 0.78, collected: 21,
    summary: '现代复仇题材的情绪节奏设计：压抑铺垫 → 爆发反转 → 爽感释放的时间轴与转化关系。',
    chunk: '"压抑段不超过 8 秒，第一个爽点须在 12 秒内出现；爽点密度每 15 秒 1 个，维持完播 …"',
    tags: ['题材打法'],
    updated: '李响 · 9 天前更新', updated_at: 1716400000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 358, tag: '节奏曲线', text: '压抑铺垫段不超过 8 秒，第一个爽点须在 12 秒内出现；后续爽点密度维持每 15 秒 1 个，保障完播率。' }],
    meta: { 知识ID: 'KB-L2-T-0144', 来源类型: '团队上传（PPT）', 上传人: '李响 · 投手' },
    versions: [{ version: 'v1.0', by: '李响 · 9 天前', current: true }],
    feedback: { up: 62, down: 8 },
  },
  {
    id: 'k16', title: '年代虐恋题材 · 选角与画风避坑清单', layer: 'L2', source: 'prv-up', cat: 'ticai', type: 'template',
    cited: 41, hit_rate: 0.72, collected: 13,
    summary: '年代虐恋题材投放中选角、服化道、画风调色的常见踩坑与正向参考，降低素材报废率。',
    chunk: '"年代感画风忌过曝高饱和；女主选角避免现代精致妆，朴素感更易共情触发完播 …"',
    tags: ['题材打法', '素材创意'],
    updated: '钱晓彤 · 16 天前更新', updated_at: 1715800000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 330, tag: '画风避坑', text: '年代感画风忌过曝高饱和；女主选角避免现代精致妆容，朴素自然感更易共情、提升完播。' }],
    meta: { 知识ID: 'KB-L2-T-0145', 来源类型: '团队上传（Word）', 上传人: '钱晓彤 · 投放主管' },
    versions: [{ version: 'v1.0', by: '钱晓彤 · 16 天前', current: true }],
    feedback: { up: 33, down: 7 },
  },

  /* ---------- 私域 · 出价策略（chujia）---------- */
  {
    id: 'k17', title: '智能放量 · 跑量计划阶梯加价表 v2', layer: 'L2', source: 'prv-up', cat: 'chujia', type: 'template',
    cited: 63, hit_rate: 0.8, collected: 18,
    summary: '已验证的放量阶梯加价表：按累计转化数分档的加价幅度与观察窗口，配合止损线使用。',
    chunk: '"累计 20 转化内不加价；20-50 转化每档 +5%；超 50 转化且 ROI 达标可 +8%，单日加价不超 2 次 …"',
    tags: ['出价策略', '题材打法'],
    updated: '李响 · 8 天前更新', updated_at: 1716450000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 350, tag: '加价阶梯', text: '累计 20 转化内不加价；20-50 转化每档 +5%；超 50 转化且 ROI 达标可 +8%，单日加价不超过 2 次。' }],
    meta: { 知识ID: 'KB-L2-S-0079', 来源类型: '团队上传（Excel）', 上传人: '李响 · 投手' },
    versions: [{ version: 'v2.0', by: '李响 · 8 天前', current: true }],
    feedback: { up: 51, down: 6 },
  },

  /* ---------- 私域 · 素材模板（sucai）---------- */
  {
    id: 'k18', title: '信息流竖版素材 · 黄金 5 秒分镜模板', layer: 'L2', source: 'prv-up', cat: 'sucai', type: 'template',
    cited: 112, hit_rate: 0.87, collected: 35,
    summary: '竖版短剧信息流素材的前 5 秒标准分镜模板库，含 9 套可复用脚本与运镜说明。',
    chunk: '"第 1 秒定场 + 字幕钩子，第 2-3 秒人物反差，第 4-5 秒冲突 / 悬念，转场不超过 2 次 …"',
    tags: ['素材创意', '题材打法'],
    updated: '钱晓彤 · 6 天前更新', updated_at: 1716620000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 360, tag: '分镜模板', text: '第 1 秒定场加字幕钩子，第 2-3 秒人物反差，第 4-5 秒冲突或悬念点，转场不超过 2 次，保障前 5 秒留人。' }],
    meta: { 知识ID: 'KB-L2-C-0180', 来源类型: '团队上传（PDF · 24 页）', 上传人: '钱晓彤 · 投放主管' },
    versions: [{ version: 'v1.0', by: '钱晓彤 · 6 天前', current: true }],
    feedback: { up: 98, down: 9 },
  },
  {
    id: 'k19', title: '口播带货素材 · 高转化话术结构库', layer: 'L2', source: 'prv-up', cat: 'sucai', type: 'template',
    cited: 57, hit_rate: 0.75, collected: 16,
    summary: '短剧引流口播的高转化话术结构：痛点共鸣 → 解决方案 → 紧迫感收口，含 12 条话术范例。',
    chunk: '"口播开场用「你是不是也…」痛点共鸣句；中段给剧情解决方案；结尾用限时 / 限量制造紧迫 …"',
    tags: ['素材创意'],
    updated: '李响 · 12 天前更新', updated_at: 1716100000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 336, tag: '话术结构', text: '口播开场用「你是不是也…」痛点共鸣句，中段给剧情化解决方案，结尾用限时或限量制造紧迫感收口。' }],
    meta: { 知识ID: 'KB-L2-C-0181', 来源类型: '团队上传（Word）', 上传人: '李响 · 投手' },
    versions: [{ version: 'v1.0', by: '李响 · 12 天前', current: true }],
    feedback: { up: 46, down: 8 },
  },

  /* ---------- 私域 L3 · 我的偏好（pianhao）---------- */
  {
    id: 'k20', title: '我的偏好 · 常用出价区间与止损线', layer: 'L3', source: 'prv-up', cat: 'pianhao', type: 'template',
    cited: 24, hit_rate: 0.7, collected: 9,
    summary: '个人沉淀的各题材常用起量出价区间与止损线，投放时快速参考。',
    chunk: '"都市题材起量出价 ¥80-95，止损 ROI 0.7；古风题材 ¥70-85，止损 ROI 0.75 …"',
    tags: ['出价策略'],
    updated: '李响 · 2 天前更新', updated_at: 1716990000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 300, tag: '出价区间', text: '都市题材起量出价 ¥80-95、止损 ROI 0.7；古风题材起量 ¥70-85、止损 ROI 0.75，供快速参考。' }],
    meta: { 知识ID: 'KB-L3-P-0020', 来源类型: '个人收藏', 上传人: '李响 · 投手' },
    versions: [{ version: 'v1.0', by: '李响 · 2 天前', current: true }],
    feedback: { up: 18, down: 2 },
  },
  {
    id: 'k21', title: '我的偏好 · 高频复用钩子话术收藏', layer: 'L3', source: 'prv-up', cat: 'pianhao', type: 'case',
    cited: 19, hit_rate: 0.68, collected: 7,
    summary: '个人收藏的高复用钩子话术片段，跨题材验证有效，可直接套用到新素材。',
    chunk: '"「三年后她带着双胞胎回国」「他不知道，眼前这个保洁就是…」等强反差身份钩子 …"',
    tags: ['素材创意', '题材打法'],
    updated: '李响 · 5 天前更新', updated_at: 1716700001000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 296, tag: '钩子收藏', text: '高复用身份反差钩子：「三年后她带着双胞胎回国」「他不知道，眼前这个保洁就是集团千金」等，跨题材验证有效。' }],
    meta: { 知识ID: 'KB-L3-P-0021', 来源类型: '个人收藏', 上传人: '李响 · 投手' },
    versions: [{ version: 'v1.0', by: '李响 · 5 天前', current: true }],
    feedback: { up: 15, down: 3 },
  },
  {
    id: 'k22', title: '我的偏好 · 个人审核红线备忘', layer: 'L3', source: 'prv-up', cat: 'pianhao', type: 'rule',
    cited: 16, hit_rate: 0.66, collected: 5,
    summary: '个人整理的高频驳回红线备忘，提审前自检清单，减少来回修改。',
    chunk: '"提审前自检：①首帧无诱导 ②无绝对化用词 ③对峙不喊话 ④无未成年暗示 …"',
    tags: ['审核合规'],
    updated: '李响 · 7 天前更新', updated_at: 1716590000000,
    status: { ...DONE },
    chunks: [{ id: 'CHUNK_001', tokens: 288, tag: '自检清单', text: '提审前自检：①首帧无诱导话术 ②文案无绝对化用词 ③对峙场景不直接喊话 ④无未成年暗示。' }],
    meta: { 知识ID: 'KB-L3-P-0022', 来源类型: '个人收藏', 上传人: '李响 · 投手' },
    versions: [{ version: 'v1.0', by: '李响 · 7 天前', current: true }],
    feedback: { up: 12, down: 2 },
  },
]

/* ============================================================
 * 过滤 / 排序辅助
 * ============================================================ */

function hitBand(hit: number): 'high' | 'mid' | 'low' {
  if (hit >= 0.7) return 'high'
  if (hit >= 0.4) return 'mid'
  return 'low'
}

function matchFilters(e: KnowledgeEntity, q: string, f: Partial<FilterState>): boolean {
  if (q) {
    const kw = q.trim().toLowerCase()
    const hay = (e.title + e.summary + (e.chunk || '') + e.tags.join('')).toLowerCase()
    if (!hay.includes(kw)) return false
  }
  if (f.source && e.source !== f.source) return false
  if (f.type && e.type !== f.type) return false
  if (f.tag && !e.tags.includes(f.tag)) return false
  if (f.hit_rate && hitBand(e.hit_rate) !== f.hit_rate) return false
  return true
}

function sortEntities(list: KnowledgeEntity[], sort: string): KnowledgeEntity[] {
  const arr = [...list]
  switch (sort) {
    case 'latest':
      return arr.sort((a, b) => b.updated_at - a.updated_at)
    case 'hit_rate':
      return arr.sort((a, b) => b.hit_rate - a.hit_rate)
    case 'collected':
      return arr.sort((a, b) => b.collected - a.collected)
    case 'cited':
    default:
      return arr.sort((a, b) => b.cited - a.cited)
  }
}

/** 内部实体 → 列表 DTO（按 GET /api/knowledge/search items 契约显式构造） */
function toListItem(e: KnowledgeEntity): KnowledgeListItem {
  return {
    id: e.id,
    title: MOCK + e.title,
    layer: e.layer,
    source: e.source,
    type: e.type,
    cited: e.cited,
    hit_rate: e.hit_rate,
    collected: e.collected,
    summary: e.summary,
    chunk: e.chunk,
    tags: e.tags,
    updated: e.updated,
    status: e.status,
  }
}

/* ============================================================
 * Endpoint handlers
 * ============================================================ */

/** GET /api/knowledge/search —— 过滤 + 排序 + 分页（DTO 收敛） */
export function mockSearch(
  q: string,
  filters: Partial<FilterState>,
  page = 1,
  pageSize = 50,
  cat?: KnowledgeCat | null
): ApiResponse<KnowledgeSearchData> {
  const matched = KB_ENTITIES.filter((e) => matchFilters(e, q, filters) && (!cat || e.cat === cat))
  const sorted = sortEntities(matched, filters.sort || 'cited')
  const start = (page - 1) * pageSize
  const items = sorted.slice(start, start + pageSize).map(toListItem)
  return {
    code: 200,
    message: 'success',
    data: { items, total: matched.length, page, page_size: pageSize },
  }
}

/** 详情：内部实体 → 详情 DTO（抽屉用，本期 Mock 直接由实体派生） */
export function mockDetail(id: string): ApiResponse<KnowledgeDetail | null> {
  const e = KB_ENTITIES.find((x) => x.id === id)
  if (!e) return { code: 404, message: 'not found', data: null }
  const detail: KnowledgeDetail = {
    id: e.id,
    title: MOCK + e.title,
    layer: e.layer,
    source: e.source,
    type: e.type,
    cited: e.cited,
    hit_rate: e.hit_rate,
    updated: e.updated,
    status: e.status,
    tags: e.tags,
    chunks: e.chunks || [],
    meta: e.meta || {},
    versions: e.versions || [],
    feedback: e.feedback || { up: 0, down: 0 },
  }
  return { code: 200, message: 'success', data: detail }
}

/** POST /api/knowledge/{id}/feedback —— 赞 / 踩，回传更新后计数 */
export function mockFeedback(id: string, vote: FeedbackVote): ApiResponse<FeedbackResult | null> {
  const e = KB_ENTITIES.find((x) => x.id === id)
  if (!e) return { code: 404, message: 'not found', data: null }
  e.feedback = e.feedback || { up: 0, down: 0 }
  if (vote === 'up') e.feedback.up += 1
  else e.feedback.down += 1
  const result: FeedbackResult = { id: e.id, up: e.feedback.up, down: e.feedback.down, vote }
  return { code: 200, message: 'success', data: result }
}

/** chip 前缀 + 选中 label → 完整 chip 文案，如「来源：私域 L2 题材打法」 */
export function chipLabel(def: FilterDef, value: string): string {
  if (!value) return def.prefix
  const opt = def.options.find((o) => o.value === value)
  return opt ? `${def.prefix}：${opt.label}` : def.prefix
}

/** key → FilterDef 映射（页面便捷取用） */
export function filterDefMap(): Record<FilterKey, FilterDef> {
  const map = {} as Record<FilterKey, FilterDef>
  for (const def of mockFilters()) map[def.key] = def
  return map
}

/* ============================================================
 * 左侧导航：真实计数（动态统计，替代写死数字）
 * ============================================================ */
const PUB_CATS: KnowledgeCat[] = ['juliang', 'cili', 'tencent']
const ALL_CATS: KnowledgeCat[] = ['juliang', 'cili', 'tencent', 'ticai', 'chujia', 'sucai', 'pianhao']

export function mockNavCounts(): KnowledgeNavCounts {
  const cats = {} as Record<KnowledgeCat, number>
  for (const k of ALL_CATS) cats[k] = 0
  for (const e of KB_ENTITIES) cats[e.cat] = (cats[e.cat] ?? 0) + 1
  const pub = PUB_CATS.reduce((s, k) => s + cats[k], 0)
  return { all: KB_ENTITIES.length, pub, prv: KB_ENTITIES.length - pub, cats }
}

/* ============================================================
 * 私域上传（RAG pipeline mock：清洗 → 分块 → 元数据 → 标签 → 向量化）
 * ============================================================ */
const CAT_LAYER: Record<KnowledgeCat, KnowledgeLayer> = {
  juliang: 'L1', cili: 'L1', tencent: 'L1',
  ticai: 'L2', chujia: 'L2', sucai: 'L2', pianhao: 'L3',
}

/** 上传后处理流水线步骤 */
export const UPLOAD_STEPS = [
  { label: '清洗中 1/5', progress: 12 },
  { label: '分块中 2/5', progress: 34 },
  { label: '元数据 3/5', progress: 56 },
  { label: '打标签 4/5', progress: 78 },
  { label: '向量化 5/5', progress: 93 },
] as const

function extLabel(name: string): string {
  return (name.split('.').pop() || '').toUpperCase() || 'FILE'
}
function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB'
  return bytes + ' B'
}

let uploadSeq = 0
/** 新建一条「处理中」私域知识，插入列表首位，返回它的 id */
export function mockUpload(payload: KnowledgeUploadPayload, nowTs: number): string {
  uploadSeq += 1
  const id = 'up' + uploadSeq
  const layer = CAT_LAYER[payload.cat]
  const entity: KnowledgeEntity = {
    id,
    title: payload.fileName.replace(/\.[^.]+$/, ''),
    layer,
    source: 'prv-up',
    cat: payload.cat,
    type: 'case',
    cited: 0,
    hit_rate: 0,
    collected: 0,
    summary:
      '刚上传的私域文档，正在进入 RAG 处理流水线：清洗 → 分块 → 元数据 → 打标签 → 向量化，完成后即可供 AI 召回。',
    tags: payload.tags.length ? payload.tags : ['题材打法'],
    updated: `${payload.uploader} · 刚刚上传`,
    updated_at: nowTs,
    status: { kind: 'processing', label: UPLOAD_STEPS[0].label, progress: UPLOAD_STEPS[0].progress },
    chunks: [],
    meta: {
      知识ID: `KB-${layer}-NEW-${id}`,
      来源类型: `团队上传（${extLabel(payload.fileName)}）`,
      原始文件: `${payload.fileName} · ${fmtSize(payload.size)}`,
      上传人: payload.uploader,
      处理进度: '清洗 ⏳ → 分块 → 元数据 → 标签 → 向量化',
    },
    versions: [{ version: 'v0.1', by: `${payload.uploader} · 刚刚`, current: true }],
    feedback: { up: 0, down: 0 },
  }
  KB_ENTITIES.unshift(entity)
  return id
}

/** 推进上传处理进度；step 越界则标记完成。返回是否已完成 */
export function advanceUpload(id: string, step: number): boolean {
  const e = KB_ENTITIES.find((x) => x.id === id)
  if (!e) return true
  if (step >= UPLOAD_STEPS.length) {
    e.status = { kind: 'done', label: '已向量化' }
    if (e.meta) e.meta['处理进度'] = '清洗 ✓ → 分块 ✓ → 元数据 ✓ → 标签 ✓ → 向量化 ✓'
    e.chunks = [
      { id: 'CHUNK_001', tokens: 360, tag: '首块预览', text: '文档已完成切分与向量化，下方为首个切片内容预览（演示占位）。' },
    ]
    return true
  }
  e.status = { kind: 'processing', label: UPLOAD_STEPS[step].label, progress: UPLOAD_STEPS[step].progress }
  return false
}
