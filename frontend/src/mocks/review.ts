/**
 * 投放复盘模块 Mock（判断层 · 对齐 docs/prototypes/review.html + api-contracts.md）
 * 数值对齐 PRD golden-data 账本（experience.md）：
 *   - A001 现言旗舰户：当前 ROI 0.84；复盘叙事 5 天前 1.5 阶梯跌至 0.84
 *   - 止损区间 ¥12-18 万 / 周（字符串原样，非 ¥120,000）
 *   - 主因 M789 素材衰退（影响 70%），次因 A001 定向收窄（20%）
 *
 * 灵魂约定（experience.md / .sdd/experience.md）：
 *   - 一键执行真承接：mockExecute 返回 dispatched + track_url（/monitor?account=A001）。
 *   - 已移除「应用建议」按钮：建议唯一主操作为「一键执行 →」。
 *
 * 所有展示型 Mock 数据带 [Mock] 标识（标题前缀），接真实接口后移除。
 */
import type { ApiResponse } from '@/types/auth'
import type {
  AttributionReportData,
  ExecuteResultData,
  NewReviewOptions,
  ReviewInboxData,
} from '@/types/review'

/** [Mock] 标识前缀（展示型 Mock 数据可见标识；接真实接口后移除） */
const M = ''

/* ============================================================
 * 态①：复盘收件箱 GET /api/review/inbox
 * ============================================================ */

export function mockInbox(): ApiResponse<ReviewInboxData> {
  return {
    code: 200,
    message: 'success',
    data: {
      overview: {
        monthCount: '42',
        pending: '3',
        stopLoss: '¥38.6万',
        adoptRate: '82%',
      },
      groups: [
        /* 分组①：待看的复盘报告（异常自动触发） */
        {
          key: 'pending',
          title: '待看的复盘报告',
          countLabel: '· 3 份 · 由预警触发归因',
          sections: [
            {
              label: '',
              cards: [
                {
                  id: 'rv-a001-roi',
                  account: 'A001',
                  title: `${M}A001 现言旗舰户 · ROI 异常归因报告`,
                  desc: '今日 ROI 较昨日下跌 30%，已自动归因：主因为晚间高价时段消耗下降 + 3 条爆款计划被暂停',
                  source: 'auto',
                  kind: 'high',
                  severity: 'high',
                  unread: true,
                  meta: ['巨量引擎', '投手 钱晓彤', '2 小时前生成', '预计周止损 ¥12 万'],
                },
                {
                  id: 'rv-a005-reject',
                  account: 'A005',
                  title: `${M}A005 古言扩量户 · 拒审归因报告`,
                  desc: '1 小时内 8 条素材连续被拒，拒审率从 5% 升至 48%，已归因：集中触发「烟酒元素」与「诱导点击」两类规则',
                  source: 'auto',
                  kind: 'high',
                  severity: 'high',
                  unread: true,
                  meta: ['巨量引擎', '投手 李婉', '3 小时前生成'],
                },
                {
                  id: 'rv-k007-budget',
                  account: 'K007',
                  title: `${M}K007 快手主推户 · 预算消耗归因报告`,
                  desc: '日预算消耗速度较均值快 2.3 倍，14:00 前已耗尽全天预算，建议复核出价与人群设置',
                  source: 'auto',
                  kind: 'mid',
                  severity: 'mid',
                  meta: ['磁力金牛', '投手 王宇', '5 小时前生成'],
                },
              ],
            },
          ],
        },
        /* 分组②：我发起的复盘 */
        {
          key: 'mine',
          title: '我发起的复盘',
          countLabel: '· 1 条',
          sections: [
            {
              label: '',
              cards: [
                {
                  id: 'rv-male-topic',
                  title: `${M}男频爽文题材 · 近 30 天复盘`,
                  desc: '对比 5 个男频账户 30 天表现，定位高 ROI 计划的共性投放结构',
                  source: 'mine',
                  kind: 'mine',
                  severity: null,
                  meta: ['跨账户', '昨天 16:20 发起', '耗时 1 分 12 秒'],
                },
              ],
            },
          ],
        },
        /* 分组③：历史复盘（按日期归档） */
        {
          key: 'history',
          title: '历史复盘',
          countLabel: '· 共 286 次 · 按日期归档',
          sections: [
            {
              label: '昨天 · 5 月 29 日',
              cards: [
                {
                  id: 'rv-hist-a001',
                  account: 'A001',
                  title: `${M}A001 现言旗舰户 · ROI 异常复盘`,
                  desc: '归因：晚间高价时段消耗下降 + 3 条爆款计划被暂停 · 已重启计划，ROI 恢复至 1.2',
                  source: 'done',
                  kind: 'done',
                  severity: null,
                  doneFlag: true,
                  meta: ['巨量引擎', '昨天 14:30'],
                },
                {
                  id: 'rv-hist-b003',
                  account: 'B003',
                  title: `${M}B003 都市悬疑 · 拒审激增复盘`,
                  desc: '归因：集中触发烟草元素与诱导点击 · 已替换镜头 + 改文案，8 条素材重新过审',
                  source: 'done',
                  kind: 'done',
                  severity: null,
                  doneFlag: true,
                  meta: ['巨量引擎', '昨天 10:15'],
                },
              ],
            },
            {
              label: '本周 · 5 月 26-28 日',
              cards: [
                {
                  id: 'rv-hist-a005',
                  account: 'A005',
                  title: `${M}A005 古言虐恋 · 消耗异常复盘`,
                  desc: '归因：人群包过窄导致竞争加剧 CPM 上涨 · 已拓宽定向，消耗速度回归正常',
                  source: 'done',
                  kind: 'done',
                  severity: null,
                  doneFlag: true,
                  meta: ['磁力金牛', '周一 16:40'],
                },
              ],
            },
            {
              label: '上周 · 5 月 19-25 日',
              cards: [
                {
                  id: 'rv-hist-female',
                  title: `${M}女频虐恋题材 · 30 天复盘`,
                  desc: '对比 4 个女频账户表现，定位甜宠 vs 虐恋的最优出价区间与素材结构',
                  source: 'done',
                  kind: 'done',
                  severity: null,
                  doneFlag: true,
                  meta: ['跨账户', '上周三 11:20'],
                },
              ],
            },
          ],
        },
      ],
      /* 「加载更早」追加批次（点击后并入历史分组） */
      moreHistory: [
        {
          label: '更早 · 5 月 / 4 月',
          cards: [
            {
              id: 'rv-hist-a002',
              account: 'A002',
              title: `${M}A002 都市 · ROI 复盘`,
              desc: '归因：素材点击率衰退 · 已替换主素材，ROI 回升至 1.1',
              source: 'done',
              kind: 'done',
              severity: null,
              doneFlag: true,
              meta: ['5 月 12 日'],
            },
            {
              id: 'rv-hist-month4',
              title: `${M}全盘月报 · 4 月`,
              desc: '4 月跨平台投放复盘 · 整体 ROI 1.3，男频题材表现最优',
              source: 'done',
              kind: 'done',
              severity: null,
              doneFlag: true,
              meta: ['5 月 1 日'],
            },
            {
              id: 'rv-hist-a001-q',
              account: 'A001',
              title: `${M}A001 起量复盘`,
              desc: '归因：冷启动期人群拓展 · 已优化定向，起量周期缩短 2 天',
              source: 'done',
              kind: 'done',
              severity: null,
              doneFlag: true,
              meta: ['4 月 28 日'],
            },
          ],
        },
      ],
    },
  }
}

/* ============================================================
 * 态②：Agent 归因报告 GET /api/review/attribution?account=A001
 * （契约示例：steps / factors / suggestions / 止损 / duration / confidence）
 * ============================================================ */

export function mockAttribution(account = 'A001'): ApiResponse<AttributionReportData> {
  return {
    code: 200,
    message: 'success',
    data: {
      account,
      title: `${M}A001 · 现言主投计划 · ROI 异常归因报告`,
      subtitle: '由 AI 自主执行多轮 ReAct 推导 · Verifier 二轮质检通过 · 综合实时数据 + 历史案例 + 行业大盘生成',
      roi: 0.84,
      duration_sec: 42,
      confidence: 0.88,
      stats: [
        { label: '分析耗时', value: '42 秒' },
        { label: '推导步骤', value: '8 步' },
        { label: '综合置信度', value: '88%' },
        { label: '数据来源', value: '12 个' },
        {
          label: '预计可止损',
          value: '¥12-18 万 / 周',
          tooltip:
            '按主因 <b>M789 素材衰退</b> 测算：该素材周消耗约 ¥30 万 × CTR 衰退造成的 ROI 缺口 → 替换后每周可止损 <b>¥12-18 万</b>。综合置信度 88%，与下方建议 ① 一致。',
        },
      ],
      conclusionHtml:
        'ROI 下降的主因是 <span style="color: var(--danger);">M789 素材衰退</span>，次因为 <span style="color: var(--warning);">A001 自身定向收窄</span>',
      causes: [
        {
          level: 'main',
          levelLabel: '主因 · 影响 70%',
          name: 'M789 素材衰退',
          impact: 'CTR 从 4.5% 跌至 1.8% · 时间点与 ROI 下降完全吻合',
        },
        {
          level: 'sub',
          levelLabel: '次因 · 影响 20%',
          name: 'A001 自身定向收窄',
          impact: '6 天前定向人群从 1.2 亿收窄至 6,400 万',
        },
        {
          level: 'excluded',
          levelLabel: '排除 · 行业大盘',
          name: '短剧大盘 ROI 稳定',
          impact: '行业均值无明显变化 → 排除外部影响',
        },
        {
          level: 'excluded',
          levelLabel: '排除 · 人为修改',
          name: '账户设置无变更',
          impact: '近 7 天日志：无出价/预算/创意调整',
        },
      ],
      suggestions: [
        {
          id: 'sg1',
          action: '立即停用 M789 素材，启用储备素材组 R-08',
          priority: 'P0',
          priorityLabel: 'P0 · 立即',
          desc: 'M789 已进入素材衰退中后期，CTR 跌幅 60% 不可逆。预计替换后 ROI 可回升至 1.3+，预计止损 ¥12-18 万/周。',
          executable: true,
          stopLoss: '¥12-18万/周',
        },
        {
          id: 'sg2',
          action: '放宽 A001 核心人群定向至 1.0 亿+',
          priority: 'P1',
          priorityLabel: 'P1 · 24h 内',
          desc: '建议添加「现言短剧老粉」「都市轻悬疑感兴趣人群」两个种子包扩容。',
          executable: false,
          secondaryLabel: '详细配置',
          secondaryKind: 'toast',
        },
        {
          id: 'sg3',
          action: '上线 5 条新素材进入冷启动队列',
          priority: 'P1',
          priorityLabel: 'P1 · 24h 内',
          desc: '参考贵司 12 月成功素材模板，AI 已生成 5 条素材初稿，建议素材团队确认后排期。',
          executable: false,
          secondaryLabel: '查看素材',
          secondaryKind: 'nav',
          navTo: '/diagnose',
        },
        {
          id: 'sg4',
          action: '调整素材轮换机制，避免后续衰退',
          priority: 'P2',
          priorityLabel: 'P2 · 本周',
          desc: '建议设置素材生命周期监控规则：单素材连续 3 天 CTR 跌幅 ≥ 30% 自动预警。',
          executable: false,
          secondaryLabel: '配置规则',
          secondaryKind: 'toast',
        },
      ],
      steps: [
        /* ── Planner 规划 ── */
        {
          index: 1,
          phase: 'plan',
          title: 'Planner：拆解调研任务',
          meta: '规划阶段 · 0.3 秒',
          status: 'success',
          thought: '接收到 ROI 异常预警，需要系统地分解调研目标，确保覆盖所有可能的归因路径。',
          action: '将归因目标拆解为 5 个独立调研 Task，分配给 Executor 依次执行',
          observation:
            '已生成调研计划：Task-1 实时投放数据 → Task-2 素材衰退分析 → Task-3 账户变更核查 → Task-4 历史案例检索 → Task-5 行业大盘对照',
        },
        /* ── Executor ReAct Round 1 ── */
        {
          index: 2,
          phase: 'execute',
          title: 'Round 1：拉取实时投放数据',
          meta: '数据源：实时投放数据 · 1.2 秒',
          status: 'success',
          thought: '先确认 ROI 数据是否真的下跌，以及下跌的时间点和幅度。',
          action: '调取该计划近 14 天的实时表现数据',
          observation:
            'ROI 从 5 天前 1.5 阶梯式下跌至当前 0.84，下跌拐点出现在 5 天前 14:00',
        },
        /* ── Executor ReAct Round 2 ── */
        {
          index: 3,
          phase: 'execute',
          title: 'Round 2：分析素材表现 Top 10',
          meta: '数据源：素材衰退分析 · 2.4 秒',
          status: 'success',
          thought:
            'ROI = 转化金额 / 消耗，下跌往往源于素材表现衰退。查看主消耗素材的 CTR 与转化率变化。',
          action: '分析该计划消耗 Top 10 素材的 CTR 与转化衰退',
          observation:
            '⚠️ M789 素材占消耗 78%，CTR 从 4.5% 跌至 1.8%（-60%），衰退时间点与 ROI 拐点完全吻合',
        },
        /* ── Executor ReAct Round 3 ── */
        {
          index: 4,
          phase: 'execute',
          title: 'Round 3：对比账户设置变更',
          meta: '数据源：账户变更日志 · 0.9 秒',
          status: 'success',
          thought: '还需要确认是否有人为调整定向或出价导致 ROI 下降。',
          action: '查询近 7 天账户的定向、出价、预算变更记录',
          observation:
            '5 天前账户设置无人为修改，但 6 天前 A001 核心人群定向从 1.2 亿收窄至 6,400 万（系统建议优化，非人为大改）',
        },
        /* ── Executor ReAct Round 4 ── */
        {
          index: 5,
          phase: 'execute',
          title: 'Round 4：检索历史相似案例',
          meta: '数据源：历史案例库 · 1.5 秒',
          status: 'success',
          thought: '查贵司历史是否处理过类似的素材衰退归因，参考已被验证的解决方案。',
          action: '检索贵司历史相似案例（素材衰退 → ROI 下降）',
          observation:
            '命中 3 条相似案例，平均处置周期 3-5 天恢复至 ROI 1.3+，主要方法均为替换主素材 → 草稿 v1 生成',
        },
        /* ── Verifier 质检 #1（未通过，触发回退） ── */
        {
          index: 6,
          phase: 'verify',
          title: 'Verifier 质检 #1',
          meta: '质检阶段 · 0.6 秒',
          status: 'warn',
          confidence: 0.55,
          rollback: true,
          thought: '对草稿 v1 做四维质量检查：证据链完整性 / 时间点吻合度 / 排除项覆盖 / 置信度达标。',
          action: 'Verifier 校验草稿 v1 证据链完整性',
          observation:
            '⚠️ 缺行业大盘对照，无法排除外部因素干扰，置信度 0.55 < 0.85 阈值 → 回退补充 Round 5',
        },
        /* ── Executor ReAct Round 5（回退补做） ── */
        {
          index: 7,
          phase: 'execute',
          title: '↩ 回退补做 Round 5：对照行业大盘',
          meta: '数据源：行业大盘 · 1.1 秒',
          status: 'success',
          thought: '质检指出缺行业大盘对照，需补充这一环节以排除外部因素干扰。',
          action: '调取近 14 天短剧行业大盘 ROI 走势做对照',
          observation: '行业大盘 ROI 稳定在 1.32 ± 0.05，无显著波动 → 排除外部因素',
        },
        /* ── Verifier 质检 #2（通过） ── */
        {
          index: 8,
          phase: 'verify',
          title: 'Verifier 质检 #2',
          meta: '质检阶段 · 0.5 秒',
          status: 'success',
          confidence: 0.88,
          rollback: false,
          thought: '补充行业大盘数据后，再次对完整证据链做四维质量检查。',
          action: 'Verifier 校验完整证据链（含补充大盘数据）',
          observation:
            '证据链完整（主因 M789 衰退 + 次因定向收窄 + 大盘排除），置信度 0.88 ≥ 0.85 → 通过，输出报告',
          reflection:
            '二轮质检通过：主因 M789 素材衰退（强相关 + 时间点吻合），次因定向收窄，行业大盘已排除。综合置信度 88%，输出最终报告。',
        },
      ],
      riskNote:
        '以上分析基于贵司投放数据 + 该计划实际表现，结论参考当前数据中现阶段表现现状。如执行修改建议时账户出现新的异常波动，建议立即暂停并人工复核。Agent 不替代专业投手判断，仅作为辅助决策依据。',
      compare: [
        { label: '基线 ROI', value: '1.50', note: '5 天前' },
        { label: '当前 ROI', value: '0.84', note: '▼ 44.0%', down: true },
        { label: '基线 CTR', value: '4.5%', note: '5 天前' },
        { label: '当前 CTR', value: '1.8%', note: '▼ 60%', down: true },
      ],
      compareWindow: '数据时间窗口：5 天前 ~ 今日',
      factors: [
        { name: '素材衰退 M789', percent: 70, tone: 'danger' },
        { name: 'A001 定向收窄', percent: 20, tone: 'warning' },
        { name: '其他细微因素', percent: 10, tone: 'gray' },
      ],
      timeline: [
        { time: '5 天前 09:00', text: '基线状态稳定：ROI 1.5, CTR 4.5%' },
        {
          time: '5 天前 14:00 · 拐点',
          text: 'CTR 开始下行 (4.5% → 3.2%)',
          meta: '同时间点 M789 素材首次出现疲态',
          danger: true,
        },
        {
          time: '4 天前 全天',
          text: 'A001 系统建议定向收窄',
          meta: '人群从 1.2 亿 → 6,400 万',
        },
        { time: '2 天前 18:00', text: 'ROI 跌破 1.0 警戒线', danger: true },
        { time: '今日 10:23', text: '触发预警 + 启动 Agent 归因', danger: true },
      ],
      references: [
        { title: '2024-10 · 古言短剧素材衰退', result: '替换素材 + 调整定向 · 4 天恢复' },
        { title: '2024-09 · 现言短剧 CTR 跌', result: '新素材矩阵 · 5 天恢复' },
        { title: '2024-07 · 都市悬疑大盘下行', result: '扩量 + 主素材切换 · 3 天恢复' },
      ],
      referenceSummary: '3 条相似归因案例 · 平均恢复 3-5 天',
    },
  }
}

/* ============================================================
 * 态②交互：POST /api/review/execute —— 建议一键执行（真承接）
 * 对齐 api-contracts.md：返回 dispatched + track_url（/monitor?account=A001）
 * ============================================================ */

export function mockExecute(account = 'A001'): ApiResponse<ExecuteResultData> {
  return {
    code: 200,
    message: 'success',
    data: {
      status: 'dispatched',
      track_url: `/monitor?account=${account}`,
      status_text: '已下发到投放系统 · 执行中，预计 4h 见效',
      eta: '预计 4h 见效',
    },
  }
}

/* ============================================================
 * 态③：发起复盘 —— 新建表单选项
 * ============================================================ */

export function mockNewReviewOptions(): ApiResponse<NewReviewOptions> {
  return {
    code: 200,
    message: 'success',
    data: {
      objects: [
        { value: 'account', label: '按账户' },
        { value: 'plan', label: '按计划' },
        { value: 'topic', label: '按题材' },
      ],
      accounts: [
        { value: 'A001', label: 'A001 · 现言短剧旗舰户' },
        { value: 'A002', label: 'A002 · 都市悬疑测试户' },
        { value: 'A005', label: 'A005 · 古言虐恋主投户' },
        { value: 'all', label: '全部 8 个账户' },
      ],
      times: [
        { value: 'today', label: '今日' },
        { value: 'yesterday', label: '昨日' },
        { value: '7d', label: '近 7 日' },
        { value: '30d', label: '近 30 日' },
      ],
      focuses: [
        { value: 'all', label: '全面复盘' },
        { value: 'roi', label: 'ROI 异常' },
        { value: 'spend', label: '消耗异常' },
        { value: 'reject', label: '拒审问题' },
      ],
    },
  }
}
