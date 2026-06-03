<script setup lang="ts">
/**
 * AttributionReport —— 态② Agent 归因报告（权威源 review.html data-state="report"）
 *
 * 左栏：返回条 + Agent banner（含止损 tooltip + 导出 PDF）+ 核心结论（主/次因 + 排除）
 *       + 修改建议（每条「一键执行 →」真承接）+ Agent 5 步推导（默认折叠）+ 风险提示。
 * 右栏：关键指标对比 + 归因因子拆分（甜甜圈 + 条形）+ 关键节点时间轴 + 私域参考案例。
 *
 * 一键执行真承接（experience.md，核心验收项）：
 *   点「一键执行 →」→ store.execute(id) 调 /api/review/execute →
 *   按钮置「✓ 已下发」+ 插入执行状态条（已下发到投放系统 · 预计 4h 见效）+
 *   「数据监控」可点跳 track_url 追踪 ROI 回升。非占位 toast。
 *
 * 止损口径严谨：止损区间「¥12-18万/周」字符串原样渲染（非 ¥120,000）。
 * 视觉：品牌蓝 #2563EB，banner 渐变锚定品牌蓝系，无紫/靛蓝；因子色仅 danger/warning/gray。
 *
 * toast / 跳转：toast 经 inject('reviewToast')（ReviewPage 注入）；跳转用 vue-router。
 */
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useReviewStore } from '@/stores/review'
import type {
  AttributionReportData,
  AttributionStep,
  AttributionPhase,
  CauseLevel,
  FactorShare,
  ReviewSuggestion,
} from '@/types/review'

const props = defineProps<{ report: import('@/types/review').AttributionReportData }>()
const store = useReviewStore()
const router = useRouter()

/** toast（ReviewPage provide），缺省兜底为 no-op */
const toast = inject<(msg: string) => void>('reviewToast', () => {})

/* ---------- Agent ReAct 多轮 + Verifier 质检 ---------- */
/** 每步是否折叠（默认全展开，ReAct 推理过程直接可视化） */
const collapsed = ref<Record<number, boolean>>(
  Object.fromEntries(props.report.steps.map((s) => [s.index, false]))
)
/** 推导阶段徽章（规划 / 执行 / 校验） */
function phaseMeta(phase?: AttributionPhase) {
  if (phase === 'plan') return { icon: '🧭', label: '规划', cls: 'plan' }
  if (phase === 'verify') return { icon: '✅', label: '校验', cls: 'verify' }
  return { icon: '⚙', label: '执行', cls: 'execute' }
}
function toggleStep(index: number) {
  collapsed.value = { ...collapsed.value, [index]: !collapsed.value[index] }
}
/** 是否有任一步展开（决定「展开全部 / 收起全部」文案） */
const anyOpen = computed(() => props.report.steps.some((s) => !collapsed.value[s.index]))
function toggleAll() {
  const next = anyOpen.value // 有展开 → 全收起
  collapsed.value = Object.fromEntries(props.report.steps.map((s) => [s.index, next]))
}

/* ---------- 归因因子级别样式 ---------- */
const LEVEL_CLASS: Record<CauseLevel, string> = {
  main: 'level-main',
  sub: 'level-sub',
  excluded: 'level-excluded',
}

/* ---------- 因子拆分甜甜圈（数据驱动，仅 danger/warning/gray，无紫色） ---------- */
const TONE_COLOR: Record<FactorShare['tone'], string> = {
  danger: '#DC2626',
  warning: '#F59E0B',
  gray: '#94A3B8',
}
/** 甜甜圈半径 60 → 周长 ≈ 376.99 */
const CIRC = 2 * Math.PI * 60
/** 各因子弧段（dasharray 长度 + 起始 offset，按 percent 累计） */
const donutArcs = computed(() => {
  let acc = 0
  return props.report.factors.map((f) => {
    const len = (f.percent / 100) * CIRC
    const arc = { color: TONE_COLOR[f.tone], dash: `${len} ${CIRC}`, offset: -acc }
    acc += len
    return arc
  })
})
/** 甜甜圈中心展示主因占比 */
const mainFactor = computed(
  () => props.report.factors.find((f) => f.tone === 'danger') ?? props.report.factors[0]
)
function barColor(tone: FactorShare['tone']): string {
  return TONE_COLOR[tone]
}
function barTextClass(tone: FactorShare['tone']): string {
  return tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-muted'
}

/* ---------- 修改建议交互 ---------- */
/** 一键执行（真承接：下发 → 已下发 + 状态条 + 可跳监控） */
function onExecute(s: ReviewSuggestion) {
  store.execute(s.id)
}
/** 次级动作：nav 跳转 / toast 占位反馈 */
function onSecondary(s: ReviewSuggestion) {
  if (s.secondaryKind === 'nav' && s.navTo) {
    router.push(s.navTo)
  } else {
    toast(`已生成「${s.secondaryLabel}」配置建议，可下发至投放系统应用`)
  }
}
/** 执行状态条里「数据监控」点击 → 跳 track_url 追踪 ROI 回升 */
function gotoTrack(suggestionId: string) {
  const url = store.executed[suggestionId]?.track_url
  if (url) router.push(url)
}

/* ---------- 导出复盘报告（自包含 HTML，可浏览器打开 / 另存 PDF） ---------- */
function exportPdf() {
  const blob = new Blob([buildReviewHtml(props.report)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `投放复盘报告_${props.report.account}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast('复盘报告已导出（HTML，可用浏览器打开或另存为 PDF）')
}

/** 把归因报告渲染成自包含 HTML（内联品牌蓝样式，可独立打开 / 另存 PDF） */
function buildReviewHtml(r: AttributionReportData): string {
  const esc = (s: string) =>
    String(s ?? '').replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
  const statCards = r.stats
    .map((s) => `<div class="kpi"><div class="k">${esc(s.label)}</div><div class="v">${esc(s.value)}</div></div>`)
    .join('')
  const causeRows = r.causes
    .map((c) => `<tr><td><span class="lv lv-${c.level}">${esc(c.levelLabel)}</span></td><td><b>${esc(c.name)}</b></td><td>${esc(c.impact)}</td></tr>`)
    .join('')
  const factorRows = r.factors
    .map((f) => `<div class="factor"><span class="fn">${esc(f.name)}</span><span class="fb"><i class="b-${f.tone}" style="width:${f.percent}%"></i></span><span class="fp">${f.percent}%</span></div>`)
    .join('')
  const sugItems = r.suggestions
    .map((s) => `<li><span class="pri pri-${s.priority}">${esc(s.priorityLabel)}</span> <b>${esc(s.action)}</b>${s.stopLoss ? ` <span class="stop">止损 ${esc(s.stopLoss)}</span>` : ''}<br><span class="muted">${esc(s.desc)}</span></li>`)
    .join('')
  const cmpRows = r.compare
    .map((c) => `<tr><td>${esc(c.label)}</td><td class="${c.down ? 'down' : ''}">${esc(c.value)}</td><td class="muted">${esc(c.note)}</td></tr>`)
    .join('')
  const tlItems = r.timeline
    .map((t) => `<li${t.danger ? ' class="down"' : ''}><b>${esc(t.time)}</b> ${esc(t.text)}${t.meta ? `<br><span class="muted">${esc(t.meta)}</span>` : ''}</li>`)
    .join('')
  const refItems = r.references
    .map((rf) => `<li><b>${esc(rf.title)}</b><br><span class="muted">${esc(rf.result)}</span></li>`)
    .join('')
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>投放复盘报告 · ${esc(r.account)}</title>
<style>
:root{--b:#2563EB}
*{box-sizing:border-box}body{margin:0;font:14px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1e293b;background:#f8fafc;padding:32px}
.wrap{max-width:820px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}
.hd{background:linear-gradient(135deg,#2563EB,#1d4ed8);color:#fff;padding:24px 30px}
.hd h1{margin:0;font-size:20px}.hd .sub{opacity:.88;font-size:13px;margin-top:5px}
.bd{padding:24px 30px}
.row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.kpi{flex:1;min-width:120px;background:#f1f5f9;border-radius:10px;padding:12px 14px}
.kpi .k{font-size:12px;color:#64748b}.kpi .v{font-size:18px;font-weight:700;margin-top:3px}
h2{font-size:15px;margin:26px 0 10px;padding-left:10px;border-left:3px solid var(--b)}
.concl{background:#f8fafc;border:1px solid #eef2f7;border-radius:10px;padding:14px 16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eef2f7;vertical-align:top}
th{color:#64748b;font-weight:600;background:#f8fafc}
.lv{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600}
.lv-main{background:#fef2f2;color:#dc2626}.lv-sub{background:#fffbeb;color:#d97706}.lv-excluded{background:#f1f5f9;color:#64748b}
.factor{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:13px}
.fn{width:150px;flex-shrink:0}.fb{flex:1;height:8px;background:#eef2f7;border-radius:4px;overflow:hidden}
.fb i{display:block;height:100%}.b-danger{background:#dc2626}.b-warning{background:#d97706}.b-gray{background:#94a3b8}
.fp{width:44px;text-align:right;color:#64748b}
ul{margin:0;padding-left:18px}li{margin-bottom:10px}
.pri{display:inline-block;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:600;color:#fff}
.pri-P0{background:#dc2626}.pri-P1{background:#d97706}.pri-P2{background:#64748b}
.stop{background:#eff6ff;color:var(--b);border-radius:4px;padding:1px 7px;font-size:12px}
.muted{color:#94a3b8}.down{color:#dc2626;font-weight:600}
.risk{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;color:#92400e;font-size:13px}
.ft{padding:16px 30px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px}
</style></head><body><div class="wrap">
<div class="hd"><h1>${esc(r.title)}</h1><div class="sub">${esc(r.subtitle)}　·　分析耗时 ${r.duration_sec}s　·　综合置信度 ${Math.round(r.confidence * 100)}%</div></div>
<div class="bd">
<div class="row">${statCards}</div>
<h2>归因结论</h2>
<div class="concl">${r.conclusionHtml}</div>
<h2>归因因子</h2>
<table><thead><tr><th>级别</th><th>因子</th><th>影响</th></tr></thead><tbody>${causeRows}</tbody></table>
<h2>因子拆分</h2>
${factorRows}
<h2>修改建议</h2>
<ul>${sugItems}</ul>
<h2>关键指标对比 <span class="muted" style="font-weight:400;font-size:12px">（${esc(r.compareWindow)}）</span></h2>
<table><thead><tr><th>指标</th><th>当前</th><th>对比</th></tr></thead><tbody>${cmpRows}</tbody></table>
<h2>关键节点</h2>
<ul>${tlItems}</ul>
<h2>私域参考案例 <span class="muted" style="font-weight:400;font-size:12px">（${esc(r.referenceSummary)}）</span></h2>
<ul>${refItems}</ul>
<h2>风险提示</h2>
<div class="risk">${esc(r.riskNote)}</div>
</div>
<div class="ft">松鼠投放 · 投放复盘 Agent　|　本报告由 AI Agent 多步归因生成，含止损建议，仅供投放决策参考</div>
</div></body></html>`
}

/** 末步结论：步骤里带 reflection 的（通常第 5 步） */
function hasReflection(step: AttributionStep): boolean {
  return Boolean(step.reflection)
}
</script>

<template>
  <div class="rv-report">
    <!-- 返回条 -->
    <div class="rv-back" @click="store.backToInbox()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      返回复盘列表
    </div>

    <!-- Agent 标题 banner -->
    <div class="agent-banner">
      <div class="banner-row">
        <div class="banner-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3 6 6 1-4.5 4 1 6L12 16l-5.5 3 1-6L3 9l6-1z" />
          </svg>
        </div>
        <div style="flex: 1;">
          <div class="banner-title">{{ report.title }}</div>
          <div class="banner-sub">{{ report.subtitle }}</div>
        </div>
        <button class="btn btn-outline banner-export" @click="exportPdf">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          导出 PDF
        </button>
      </div>
      <div class="banner-stats">
        <div v-for="(st, i) in report.stats" :key="i" class="b-stat">
          <div class="label">
            {{ st.label }}
            <span v-if="st.tooltip" class="bs-tip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:-1px;">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <!-- 止损 tooltip：富文本说明（含 ¥12-18 万 / 周 测算口径） -->
              <span class="bs-tip-pop" v-html="st.tooltip"></span>
            </span>
          </div>
          <div class="val">{{ st.value }}</div>
        </div>
      </div>
    </div>

    <div class="review-grid">
      <!-- 左：报告主体 -->
      <div>
        <!-- 核心结论 -->
        <div class="conclusion-card">
          <div style="display:flex; align-items: center; gap: 10px;">
            <div class="concl-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--gray-500);">归因结论</div>
              <div class="concl-text" v-html="report.conclusionHtml"></div>
            </div>
          </div>
          <div class="cause-list">
            <div v-for="(c, i) in report.causes" :key="i" class="cause-card">
              <span class="level" :class="LEVEL_CLASS[c.level]">{{ c.levelLabel }}</span>
              <div class="name">{{ c.name }}</div>
              <div class="impact">{{ c.impact }}</div>
            </div>
          </div>
        </div>

        <!-- 修改建议 -->
        <div class="action-list">
          <div class="card-header" style="margin-bottom: 4px;">
            <div class="card-title">💡 修改建议</div>
            <span class="text-sm text-muted">按优先级排序 · 建议小流量灰度验证</span>
          </div>
          <div
            v-for="(s, i) in report.suggestions"
            :key="s.id"
            class="action-item"
            :class="{ executed: store.isExecuted(s.id) }"
          >
            <div class="action-num">{{ i + 1 }}</div>
            <div style="flex: 1;">
              <div class="action-title">
                {{ s.action }}
                <span class="priority-tag" :class="`priority-${s.priority.toLowerCase()}`">
                  {{ s.priorityLabel }}
                </span>
              </div>
              <div class="action-desc">{{ s.desc }}</div>
              <!-- 执行状态条（一键执行后插入，真承接 · 可跳监控） -->
              <div v-if="store.isExecuted(s.id)" class="exec-status">
                ⏳ {{ store.executed[s.id].status_text }} —— 效果可在
                <span class="exec-link" @click="gotoTrack(s.id)">数据监控</span>
                追踪 {{ report.account }} 的 ROI 回升
              </div>
            </div>
            <!-- 主操作：一键执行（executable）/ 次级动作 -->
            <span v-if="store.isExecuted(s.id)" class="exec-done">✓ 已下发</span>
            <button
              v-else-if="s.executable"
              class="btn btn-primary btn-sm"
              @click="onExecute(s)"
            >一键执行 →</button>
            <button
              v-else
              class="btn btn-outline btn-sm"
              @click="onSecondary(s)"
            >{{ s.secondaryLabel }}</button>
          </div>
        </div>

        <!-- Agent 执行过程：ReAct 多轮 + Verifier 质检（默认展开） -->
        <div class="agent-flow">
          <div class="flow-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            AI 归因过程 · ReAct 多轮 + Verifier 质检
            <span class="tag tag-brand toggle-all" @click="toggleAll">
              {{ anyOpen ? '收起全部' : '展开全部' }}
            </span>
          </div>

          <div class="flow-rounds">
            <div
              v-for="step in report.steps"
              :key="step.index"
              class="round"
              :class="[
                'round--' + phaseMeta(step.phase).cls,
                { collapsed: collapsed[step.index], 'is-rollback': step.rollback },
              ]"
            >
              <div class="round-head" @click="toggleStep(step.index)">
                <span class="round-badge" :class="phaseMeta(step.phase).cls" :title="phaseMeta(step.phase).label">
                  {{ phaseMeta(step.phase).icon }}
                </span>
                <div class="round-head-main">
                  <div class="round-title">{{ step.title }}</div>
                  <div class="round-time">{{ step.meta }} · {{ phaseMeta(step.phase).label }}</div>
                </div>
                <span
                  v-if="step.phase === 'verify'"
                  class="round-status tag"
                  :class="step.rollback ? 'tag-warn' : 'tag-success'"
                >{{ step.rollback ? '⚠ 未达标 · 回退' : '✓ 通过' }}</span>
                <span v-else class="round-status tag tag-success">✓ 已完成</span>
              </div>
              <div class="round-body">
                <!-- Verifier 置信度条 -->
                <div v-if="step.confidence != null" class="conf-bar" :class="step.rollback ? 'low' : 'ok'">
                  <div class="conf-track">
                    <div class="conf-fill" :style="{ width: step.confidence * 100 + '%' }" />
                    <div class="conf-line" title="阈值 0.85" />
                  </div>
                  <div class="conf-label">
                    置信度 <strong>{{ Math.round(step.confidence * 100) }}%</strong>
                    <span class="conf-th">· 阈值 85%</span>
                  </div>
                </div>
                <div class="r-block thought">
                  <span class="r-label">🧠 判断</span>
                  <div class="r-content">{{ step.thought }}</div>
                </div>
                <div class="r-block action">
                  <span class="r-label">🔍 查证</span>
                  <div class="r-content">{{ step.action }}</div>
                </div>
                <div class="r-block observation">
                  <span class="r-label">📊 发现</span>
                  <div class="r-content">{{ step.observation }}</div>
                </div>
                <div v-if="hasReflection(step)" class="r-block reflection">
                  <span class="r-label">✅ 结论</span>
                  <div class="r-content">{{ step.reflection }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 风险提示 -->
        <div class="risk-card">
          <div style="display: flex; gap: 12px;">
            <div class="risk-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 600; color: var(--gray-900);">⚠️ 风险提示</div>
              <div class="risk-text">{{ report.riskNote }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏 -->
      <div>
        <!-- 关键指标对比 -->
        <div class="attr-summary">
          <div class="card-title summary-title">关键指标对比</div>
          <div class="metric-row">
            <div v-for="(m, i) in report.compare" :key="i" class="metric-mini">
              <div class="ml">{{ m.label }}</div>
              <div class="mv" :class="{ 'text-danger': m.down }">{{ m.value }}</div>
              <div class="mt" :class="m.down ? 'text-danger' : 'text-muted'">{{ m.note }}</div>
            </div>
          </div>
          <div class="summary-window">{{ report.compareWindow }}</div>
        </div>

        <!-- 归因因子拆分（甜甜圈 + 条形，数据驱动） -->
        <div class="attr-summary" style="margin-top: 16px;">
          <div class="card-title summary-title">归因因子拆分</div>
          <div class="donut-wrap">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="60" fill="none" stroke="#F1F5F9" stroke-width="20" />
              <circle
                v-for="(a, i) in donutArcs"
                :key="i"
                cx="80" cy="80" r="60" fill="none"
                :stroke="a.color"
                stroke-width="20"
                :stroke-dasharray="a.dash"
                :stroke-dashoffset="a.offset"
                transform="rotate(-90 80 80)"
              />
              <text x="80" y="80" text-anchor="middle" font-size="12" fill="#64748B">主因</text>
              <text x="80" y="98" text-anchor="middle" font-size="20" font-weight="700" fill="#0F172A">
                {{ mainFactor.percent }}%
              </text>
            </svg>
          </div>
          <div class="cause-bars">
            <div v-for="(f, i) in report.factors" :key="i" class="cause-bar-row">
              <div class="br-head">
                <span>{{ f.name }}</span>
                <span class="font-semibold" :class="barTextClass(f.tone)">{{ f.percent }}%</span>
              </div>
              <div class="br-bar">
                <div :style="{ width: f.percent + '%', background: barColor(f.tone) }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 关键节点时间轴 -->
        <div class="attr-summary" style="margin-top: 16px;">
          <div class="card-title summary-title">关键节点时间轴</div>
          <div class="timeline2" style="margin-top: 12px;">
            <div
              v-for="(n, i) in report.timeline"
              :key="i"
              class="tl-item"
              :class="{ danger: n.danger }"
            >
              <div class="tl-time">{{ n.time }}</div>
              <div class="tl-text">{{ n.text }}</div>
              <div v-if="n.meta" class="tl-meta">{{ n.meta }}</div>
            </div>
          </div>
        </div>

        <!-- 私域参考案例 -->
        <div class="attr-summary" style="margin-top: 16px;">
          <div class="card-title summary-title">私域参考案例</div>
          <div class="ref-summary">{{ report.referenceSummary }}</div>
          <div style="display:flex; flex-direction:column; gap: 8px;">
            <div v-for="(r, i) in report.references" :key="i" class="ref-item">
              <div style="flex:1;">
                <div class="ref-title">{{ r.title }}</div>
                <div class="ref-result">{{ r.result }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 布局 ===== */
.review-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
}

/* ===== 返回条 ===== */
.rv-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--brand-700);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 14px;
}
.rv-back:hover {
  color: var(--brand-800);
}

/* ===== Agent banner（品牌蓝系渐变，无紫/靛蓝） ===== */
.agent-banner {
  background: linear-gradient(135deg, #1B3A95 0%, #2554DC 50%, #3B6AEE 100%);
  border-radius: 16px;
  padding: 22px 26px;
  color: #fff;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}
.agent-banner::after {
  content: "";
  position: absolute;
  right: -60px;
  top: -60px;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 65%);
}
.banner-row {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 2;
}
.banner-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}
.banner-title {
  font-size: 18px;
  font-weight: 700;
}
.banner-sub {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 2px;
}
.banner-export {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}
.banner-export:hover {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
.banner-stats {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  position: relative;
  z-index: 2;
}
.b-stat .label {
  font-size: 11px;
  opacity: 0.8;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.b-stat .val {
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
}
/* 止损 tooltip */
.bs-tip {
  position: relative;
  cursor: help;
  opacity: 0.75;
  margin-left: 1px;
  display: inline-flex;
}
.bs-tip-pop {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 234px;
  background: #fff;
  color: var(--gray-700);
  font-size: 11px;
  line-height: 1.6;
  font-weight: 400;
  padding: 9px 11px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s, visibility 0.15s;
  z-index: 30;
  text-align: left;
}
.bs-tip:hover .bs-tip-pop {
  opacity: 1;
  visibility: visible;
}
.bs-tip-pop :deep(b) {
  color: var(--gray-900);
}

/* ===== 核心结论 ===== */
.conclusion-card {
  background: linear-gradient(135deg, #ECFDF5, #fff);
  border: 1px solid #BBE5C8;
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 16px;
}
.concl-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--success);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.concl-text {
  font-size: 17px;
  font-weight: 700;
  color: var(--gray-900);
  margin-top: 2px;
}
.cause-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}
.cause-card {
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 12px;
}
.cause-card .level {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
  display: inline-block;
}
.cause-card .level-main {
  background: var(--danger-bg);
  color: var(--danger);
}
.cause-card .level-sub {
  background: var(--warning-bg);
  color: var(--warning);
}
.cause-card .level-excluded {
  background: var(--success-bg);
  color: var(--success);
}
.cause-card .name {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-900);
  margin-top: 6px;
}
.cause-card .impact {
  font-size: 12px;
  color: var(--gray-500);
  margin-top: 4px;
}

/* ===== 修改建议 ===== */
.action-list {
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 16px;
}
.action-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--border-light);
}
.action-item:last-child {
  border-bottom: none;
}
.action-item.executed {
  background: var(--success-bg);
  border-radius: 8px;
  padding: 12px;
  border-bottom-color: transparent;
}
.action-num {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.action-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
}
.action-desc {
  font-size: 12px;
  color: var(--gray-600);
  margin-top: 4px;
  line-height: 1.5;
}
.priority-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  margin-left: 6px;
}
.priority-p0 {
  background: var(--danger);
  color: #fff;
}
.priority-p1 {
  background: var(--warning);
  color: #fff;
}
.priority-p2 {
  background: var(--gray-200);
  color: var(--gray-700);
}
/* 一键执行后：已下发 + 状态条 */
.exec-done {
  font-size: 13px;
  font-weight: 600;
  color: var(--success);
  padding: 7px 13px;
  background: #fff;
  border: 1px solid #BBE5C8;
  border-radius: 7px;
  white-space: nowrap;
  align-self: flex-start;
}
.exec-status {
  font-size: 12px;
  color: var(--brand-700);
  background: var(--brand-50);
  border: 1px solid var(--brand-100);
  border-radius: 8px;
  padding: 8px 11px;
  margin-top: 8px;
  line-height: 1.6;
}
.exec-link {
  color: var(--brand-700);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}
.exec-link:hover {
  color: var(--brand-800);
}

/* ===== Agent 5 步面板 ===== */
.agent-flow {
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 20px;
}
.flow-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toggle-all {
  margin-left: auto;
  cursor: pointer;
}
.flow-rounds {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.round {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  overflow: hidden;
}
.round-head {
  padding: 12px 14px;
  background: var(--gray-50);
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.round-head::after {
  content: "▾";
  color: var(--gray-400);
  margin-left: 10px;
  font-size: 10px;
  transition: transform 0.2s;
  flex-shrink: 0;
}
.round.collapsed .round-head::after {
  transform: rotate(-90deg);
}
.round.collapsed .round-body {
  display: none;
}
.round-num {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.round-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-900);
}
.round-time {
  font-size: 11px;
  color: var(--gray-500);
  margin-top: 2px;
}
.round-status {
  margin-left: auto;
}

/* —— ReAct 阶段徽章 + Verifier 置信度（PRD §7.5 可视化）—— */
.round-badge {
  width: 28px; height: 28px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}
.round-badge.plan { background: var(--gray-100); }
.round-badge.execute { background: var(--brand-50); }
.round-badge.verify { background: var(--success-bg); }
.round-head-main { flex: 1; min-width: 0; }
.round--plan { border-left: 3px solid var(--gray-400); }
.round--execute { border-left: 3px solid var(--brand-400); }
.round--verify { border-left: 3px solid var(--success); }
.round.is-rollback { border-left-color: var(--accent-orange); }
.round.is-rollback .round-head { background: #FFF7ED; }
/* Verifier 置信度条 */
.conf-bar { margin-bottom: 12px; }
.conf-track {
  position: relative; height: 8px; border-radius: 999px; background: var(--gray-100);
}
.conf-fill { height: 100%; border-radius: 999px; transition: width 0.4s; }
.conf-bar.ok .conf-fill { background: var(--success); }
.conf-bar.low .conf-fill { background: var(--accent-orange); }
.conf-line { position: absolute; top: 0; bottom: 0; left: 85%; width: 2px; background: var(--gray-500); }
.conf-label { font-size: 11px; color: var(--gray-500); margin-top: 6px; }
.conf-label strong { color: var(--gray-900); font-size: 12px; }
.conf-bar.low .conf-label strong { color: var(--accent-orange); }
.conf-bar.ok .conf-label strong { color: var(--success); }
.conf-th { margin-left: 4px; color: var(--gray-400); }
.tag-warn { background: var(--warning-bg); color: #b7791f; }
.round-body {
  padding: 14px 14px 14px 50px;
  background: #fff;
  font-size: 13px;
  color: var(--gray-700);
  line-height: 1.65;
}
.r-block {
  margin-bottom: 10px;
}
.r-block:last-child {
  margin-bottom: 0;
}
.r-block .r-label {
  font-weight: 600;
  color: var(--gray-900);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.r-block.thought .r-label,
.r-block.action .r-label {
  color: var(--brand-700);
}
.r-block.observation .r-label {
  color: var(--accent-orange);
}
.r-block.reflection .r-label {
  color: var(--success);
}
.r-block .r-content {
  margin-top: 4px;
}

/* ===== 风险提示 ===== */
.risk-card {
  background: #FEF7E8;
  border: 1px solid #FBE4A0;
  border-radius: 12px;
  padding: 16px;
}
.risk-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--warning);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.risk-text {
  font-size: 12px;
  color: var(--gray-700);
  margin-top: 4px;
  line-height: 1.6;
}

/* ===== 右栏卡片 ===== */
.attr-summary {
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 12px;
  padding: 16px;
}
.summary-title {
  font-size: 14px;
}
.summary-window {
  font-size: 11px;
  color: var(--gray-500);
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
}
.metric-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 12px 0;
}
.metric-mini {
  padding: 10px;
  background: var(--gray-50);
  border-radius: 8px;
}
.metric-mini .ml {
  font-size: 11px;
  color: var(--gray-500);
}
.metric-mini .mv {
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-900);
  margin-top: 2px;
}
.metric-mini .mt {
  font-size: 11px;
  margin-top: 2px;
}
.donut-wrap {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}
.cause-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cause-bar-row {
  font-size: 12px;
}
.cause-bar-row .br-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.cause-bar-row .br-bar {
  height: 6px;
  background: var(--gray-100);
  border-radius: 999px;
  overflow: hidden;
}
.cause-bar-row .br-bar > div {
  height: 100%;
  border-radius: 999px;
}

/* 时间轴 */
.timeline2 {
  position: relative;
  padding-left: 18px;
}
.timeline2::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--border-light);
}
.tl-item {
  position: relative;
  padding: 6px 0 14px;
}
.tl-item::before {
  content: "";
  position: absolute;
  left: -18px;
  top: 8px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--brand-500);
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--brand-200);
}
.tl-item.danger::before {
  background: var(--danger);
  box-shadow: 0 0 0 1px #FECACA;
}
.tl-item .tl-time {
  font-size: 11px;
  color: var(--gray-400);
}
.tl-item .tl-text {
  font-size: 12px;
  color: var(--gray-700);
  margin-top: 2px;
}
.tl-item .tl-meta {
  font-size: 11px;
  color: var(--gray-500);
  margin-top: 2px;
}

/* 参考案例 */
.ref-summary {
  font-size: 12px;
  color: var(--gray-500);
  margin: 8px 0 12px;
}
.ref-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
}
.ref-title {
  font-size: 13px;
  color: var(--gray-800);
}
.ref-result {
  font-size: 11px;
  color: var(--gray-500);
  margin-top: 4px;
}

/* 窄屏：右栏堆叠到下方 */
@media (max-width: 1100px) {
  .review-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== 顶层容器 ===== */
.rv-report {
  /* AttributionReport 直接渲染在 ReviewPage .review-page 内，
     自身不需要额外 padding/margin；留作作用域锚点 */
  min-width: 0;
}

/* ===== 语义色 utility（从 design-system 搬入 scoped 作用域） ===== */
.text-danger {
  color: var(--danger);
}
.text-warning {
  color: var(--warning);
}
.text-muted {
  color: var(--gray-500);
}
.text-sm {
  font-size: 13px;
}
</style>
