<script setup lang="ts">
/**
 * DiagnoseReport —— DIAG-04 单图诊断报告（权威源 diagnose-styles.html DIAG-04）
 *
 * 6 模块（rejected 变体，缺一不可）：
 *   ① severity-badge       风险总判（report-head 右上）
 *   ② violation-marker     违规在素材图上的可视化定位（preview-frame 内绝对定位）
 *   ③ violation-list       违规清单（reason-block，命中规则条款）
 *   ④ fix-card             可执行改造建议（fix-block + 改造前后对照）
 *   ⑤ history-ref          历史相似案例参考（私域 L3 / 平台官方规则）
 *   ⑥ predict              改造前后过审预测（before → after）
 *
 * precheck 变体：过审预测 + 5 维合规扫描 + 优化建议（绿色基调）。
 * 顶栏「← 返回批量结果」仅当来自批量时显示。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDiagnoseStore } from '@/stores/diagnose'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useAuthStore } from '@/stores/auth'
import type { DiagnoseReport, Severity, ViolationPos } from '@/types/diagnose'

const props = defineProps<{ report: DiagnoseReport }>()
const store = useDiagnoseStore()
const knowledge = useKnowledgeStore()
const auth = useAuthStore()
const router = useRouter()

/** 轻反馈 toast（底部操作 / 历史参考的本地反馈，自包含不依赖父） */
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function toast(msg: string) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 2200)
}
function onFeedback(ok: boolean) {
  toast(ok ? '感谢反馈，已记录：诊断准确' : '感谢反馈，AI 将持续优化诊断准确度')
}
/** 导出：把诊断报告渲染成自包含 HTML 文件并触发下载（浏览器可直接打开 / 另存为 PDF） */
function onExport() {
  const blob = new Blob([buildReportHtml(props.report)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `素材诊断报告_${props.report.name}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast('诊断报告已导出（HTML，可用浏览器打开或另存为 PDF）')
}

/** 沉淀中（防重复点击） */
const sedimenting = ref(false)
/** 沉淀：把本次诊断结论写入 L3 私域知识库（已向量化、可被 AI 召回），形成「诊断 → 沉淀 → 召回」闭环 */
async function onSediment() {
  if (sedimenting.value) return
  sedimenting.value = true
  const r = props.report
  const viol = r.violations.map((v) => v.type).filter(Boolean)
  const title =
    r.variant === 'rejected'
      ? `${r.preview_title || r.name} · 拒审归因复盘`
      : `${r.preview_title || r.name} · 过审预检结论`
  const summary =
    r.variant === 'rejected'
      ? `素材「${r.name}」拒审主因：${viol.join('、') || '多项违规'}。已沉淀改造方案与过审预测，供同类素材召回参考。`
      : `素材「${r.name}」过审预检结论与优化建议，预测过审率 ${Math.round(r.predict.after * 100)}%，已沉淀供同类素材召回参考。`
  try {
    await knowledge.sediment({
      title,
      summary,
      chunkText: buildSedimentChunk(r),
      uploader: auth.user?.name ?? '当前投手',
    })
    toast('已沉淀到知识库 · 私域 L3（已向量化，可在知识库召回）')
  } finally {
    sedimenting.value = false
  }
}

/** 拼接沉淀正文：违规要点 + 改造建议 + 过审预测，作为知识切片内容 */
function buildSedimentChunk(r: DiagnoseReport): string {
  const lines: string[] = [`【素材】${r.name}（${r.platform.name}）`]
  if (r.violations.length) {
    lines.push('【违规要点】')
    r.violations.forEach((v, i) =>
      lines.push(`${i + 1}. ${v.type}：${v.desc}${v.rule ? `（命中 ${v.rule}）` : ''}`)
    )
  }
  if (r.fixes.length) {
    lines.push('【改造建议】')
    r.fixes.forEach((f, i) =>
      lines.push(`${i + 1}. ${f.title}：${f.detail}${f.before && f.after ? `（${f.before} → ${f.after}）` : ''}`)
    )
  }
  lines.push(`【过审预测】改造前 ${Math.round(r.predict.before * 100)}% → 改造后 ${Math.round(r.predict.after * 100)}%`)
  return lines.join('\n')
}

/** 把诊断报告渲染成自包含 HTML（内联品牌蓝样式，可独立打开 / 另存 PDF） */
function buildReportHtml(r: DiagnoseReport): string {
  const esc = (s: string) =>
    String(s ?? '').replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
  const sev = SEV[r.severity]
  const p = (v: number) => `${Math.round(v * 100)}%`
  const violRows = r.violations.length
    ? r.violations
        .map((v) => `<tr><td>${esc(v.type)}</td><td>${esc(v.desc)}</td><td>${esc(v.rule || '—')}</td></tr>`)
        .join('')
    : '<tr><td colspan="3" class="muted">无违规项</td></tr>'
  const fixItems = r.fixes.length
    ? r.fixes
        .map(
          (f) =>
            `<li><b>${esc(f.title)}</b>${f.hard ? ' <span class="t-hard">必改</span>' : ' <span class="t-soft">建议</span>'}<br><span class="muted">${esc(f.detail)}</span>${f.before && f.after ? `<br><span class="cmp">${esc(f.before)} → ${esc(f.after)}</span>` : ''}</li>`
        )
        .join('')
    : '<li class="muted">无改造建议</li>'
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>素材诊断报告 · ${esc(r.name)}</title>
<style>
:root{--b:#2563EB}
*{box-sizing:border-box}body{margin:0;font:14px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1e293b;background:#f8fafc;padding:32px}
.wrap{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}
.hd{background:var(--b);color:#fff;padding:22px 28px}.hd h1{margin:0;font-size:19px}.hd .sub{opacity:.85;font-size:13px;margin-top:4px}
.bd{padding:24px 28px}
.row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.kpi{flex:1;min-width:130px;background:#f1f5f9;border-radius:10px;padding:12px 14px}
.kpi .k{font-size:12px;color:#64748b}.kpi .v{font-size:20px;font-weight:700;margin-top:2px}
.badge{display:inline-block;padding:3px 11px;border-radius:999px;font-weight:600;font-size:13px}
.sev-high{background:#fef2f2;color:#dc2626}.sev-mid{background:#fffbeb;color:#d97706}.sev-low-ok{background:#f0fdf4;color:#16a34a}
h2{font-size:15px;margin:24px 0 10px;padding-left:10px;border-left:3px solid var(--b)}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eef2f7;vertical-align:top}
th{color:#64748b;font-weight:600;background:#f8fafc}
ul{margin:0;padding-left:18px}li{margin-bottom:10px}
.muted{color:#94a3b8}.cmp{color:var(--b);font-size:12px}
.t-hard{background:#fef2f2;color:#dc2626;border-radius:4px;padding:1px 6px;font-size:11px}
.t-soft{background:#eff6ff;color:var(--b);border-radius:4px;padding:1px 6px;font-size:11px}
.ft{padding:16px 28px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px}
</style></head><body><div class="wrap">
<div class="hd"><h1>素材诊断报告</h1><div class="sub">${esc(r.name)} · ${esc(r.platform.name)} · ${r.variant === 'rejected' ? '拒审归因' : '过审预检'}</div></div>
<div class="bd">
<div class="row">
<div class="kpi"><div class="k">风险总判</div><div class="v"><span class="badge ${sev.cls}">${esc(sev.text.replace('● ', ''))}</span></div></div>
<div class="kpi"><div class="k">综合过审率</div><div class="v">${p(r.pass_rate)}</div></div>
<div class="kpi"><div class="k">改造后预测</div><div class="v" style="color:var(--b)">${p(r.predict.after)}</div></div>
</div>
<h2>违规清单</h2>
<table><thead><tr><th>类型</th><th>描述</th><th>命中规则</th></tr></thead><tbody>${violRows}</tbody></table>
<h2>改造建议</h2>
<ul>${fixItems}</ul>
<h2>过审预测</h2>
<p>改造前 <b>${p(r.predict.before)}</b> → 改造后 <b style="color:var(--b)">${p(r.predict.after)}</b>${r.predict.basis ? `<br><span class="muted">${esc(r.predict.basis)}</span>` : ''}</p>
</div>
<div class="ft">松鼠投放 · 素材诊断 AI 助手　|　本报告由 AI 自动生成，仅供投放参考</div>
</div></body></html>`
}
function onViewRef(title: string) {
  router.push('/knowledge')
  toast(`已打开知识库，可查阅「${title}」类案例`)
}

/** 百分比 */
function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}

/** severity → badge class + 文案 */
const SEV: Record<Severity, { cls: string; text: string }> = {
  high: { cls: 'sev-high', text: '● 高风险 · 立即修改' },
  mid: { cls: 'sev-mid', text: '● 中风险 · 建议优化' },
  low: { cls: 'sev-low-ok', text: '● 低风险 · 建议可投' },
}
const severityBadge = computed(() => SEV[props.report.severity])

/** 报告副标题（已识别为…） */
const subtitle = computed(() =>
  props.report.variant === 'precheck'
    ? '已自动识别为「待审素材」· 过审预测 + 优化建议'
    : props.report.severity === 'mid'
      ? '已自动识别为「待修改素材」· 问题定位 + 修改方案'
      : '已自动识别为「已拒素材」· 拒审归因 + 修改方案'
)

/** 报告大标题后缀 */
const titleSuffix = computed(() => {
  if (props.report.variant === 'precheck') return ' · 待审预检'
  return props.report.severity === 'mid' ? ' · 待修改' : ' · 已被拒'
})

/** report-head 渐变随变体（precheck 绿 / rejected 红） */
const headStyle = computed(() =>
  props.report.variant === 'precheck'
    ? 'background: linear-gradient(135deg, #ECFDF5, #F6FFFB);'
    : 'background: linear-gradient(135deg, #FFF1F0, #FFF8F7);'
)

/** violation-marker 绝对定位：x>=0 用 left，x<0 用 right（取绝对值）；y 用 top（单位 px） */
function markerStyle(pos: ViolationPos) {
  const v: Record<string, string> = { top: `${pos.y}px` }
  if (pos.x >= 0) v.left = `${pos.x}px`
  else v.right = `${Math.abs(pos.x)}px`
  return v
}

/** 违规清单去重出的「类型组合」标题（reason-text-title） */
const violationSummary = computed(() => {
  const types = [...new Set(props.report.violations.map((v) => v.type))]
  return `${types.join(' + ')} · 共 ${props.report.violations.length} 类违规`
})

function backToBatch() {
  store.backToBatch()
}
function newDiag() {
  store.reset()
}
</script>

<template>
  <div class="diag-content">
    <!-- 顶栏 -->
    <div class="report-topbar">
      <div>
        <div class="page-title" style="font-size: 18px">
          {{ report.variant === 'precheck' ? '预检报告' : '诊断报告' }}
        </div>
        <div class="page-subtitle">{{ subtitle }}</div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center">
        <button
          v-if="store.fromBatch"
          class="btn btn-ghost btn-sm"
          @click="backToBatch"
        >
          ← 返回批量结果
        </button>
        <button class="btn btn-outline btn-sm" @click="newDiag">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0118 0M21 12a9 9 0 01-18 0" />
            <polyline points="21 12 21 5 14 5" />
          </svg>
          新建诊断
        </button>
      </div>
    </div>

    <div class="diag-report">
      <!-- ① 风险总判：report-head + severity-badge -->
      <div class="report-head" :style="headStyle">
        <div class="report-result-row">
          <div>
            <div class="report-title">{{ report.name.replace(/^\[Mock\]\s*/, '') }}{{ titleSuffix }}</div>
            <div class="report-subtitle">
              <span class="platform" :class="`platform-${report.platform.key}`">
                {{ report.platform.name }}
              </span>
              <span style="margin: 0 6px">·</span>
              {{ report.variant === 'precheck' ? '预检' : '诊断' }}耗时 {{ report.duration_sec }}s
              <template v-if="report.violations.length">
                <span style="margin: 0 6px">·</span>
                分析 {{ report.violations.length }} 条违规点
              </template>
            </div>
          </div>
          <span class="severity-badge" :class="severityBadge.cls">{{ severityBadge.text }}</span>
        </div>
      </div>

      <div class="report-body">
        <div class="report-double">
          <!-- 左：素材预览 + ② 图上违规定位 -->
          <div class="material-preview">
            <div class="preview-frame" :style="{ background: report.preview_gradient }">
              <!-- ② violation-marker：违规在图上的绝对定位 -->
              <div
                v-for="v in report.violations.filter((x) => x.pos)"
                :key="v.id"
                class="violation-marker"
                :style="markerStyle(v.pos!)"
              >
                违规{{ v.id }}: {{ v.desc }}
              </div>
              <div class="text-overlay">
                <div class="title">{{ report.preview_title }}</div>
                <div class="sub">{{ report.preview_sub }}</div>
              </div>
            </div>
            <div class="preview-meta">
              <div v-for="m in report.meta" :key="m.key" class="preview-meta-row">
                <span class="key">{{ m.key }}</span>
                <span class="value">{{ m.value }}</span>
              </div>
            </div>
          </div>

          <!-- 右：诊断结论 -->
          <!-- ============ rejected / 待修改：违规清单 + 改造 + 历史 + 预测 ============ -->
          <div v-if="report.variant === 'rejected'">
            <!-- ③ 违规清单 -->
            <div class="diag-section">
              <div class="section-title"><span class="num">1</span>拒审原因定位</div>
              <div class="reason-block">
                <div class="reason-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div style="flex: 1">
                  <div class="reason-text-title">{{ violationSummary }}</div>
                  <div class="reason-text-detail">
                    <div
                      v-for="v in report.violations"
                      :key="v.id"
                      style="margin-bottom: 6px"
                    >
                      <span class="violation-tag">违规{{ v.id }}</span>
                      <strong>{{ v.type }}</strong> · {{ v.desc }}<template v-if="v.rule">，{{ v.rule }}</template>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ④ 改造建议 -->
            <div class="diag-section">
              <div class="section-title"><span class="num">2</span>可执行修改方案</div>
              <div class="fix-block">
                <div v-for="(f, i) in report.fixes" :key="i" class="fix-item">
                  <div class="fix-num">{{ i + 1 }}</div>
                  <div class="fix-content">
                    <div class="fix-title">{{ f.title }}</div>
                    <div class="fix-detail">{{ f.detail }}</div>
                    <div v-if="f.before && f.after" class="fix-compare">
                      <div class="fix-original">{{ f.before }}</div>
                      <div class="fix-arrow">→</div>
                      <div class="fix-new">{{ f.after }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ⑤ 历史参考 -->
            <div v-if="report.history_refs.length" class="diag-section">
              <div class="section-title">
                <span class="num">3</span>历史相似案例参考
                <span class="tag tag-gray" style="margin-left: 4px">私域 L3</span>
              </div>
              <div class="history-ref">
                <div v-for="(h, i) in report.history_refs" :key="i" class="history-ref-item">
                  <div
                    class="history-ref-icon"
                    :style="h.official ? 'background: var(--accent-orange-bg); color: var(--accent-orange);' : ''"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <div style="flex: 1">
                    <div class="history-ref-title">{{ h.title }}</div>
                    <div class="history-ref-meta">{{ h.result }}</div>
                  </div>
                  <button class="btn btn-ghost btn-sm" @click="onViewRef(h.title)">查看</button>
                </div>
              </div>
            </div>

            <!-- ⑥ 改造前后过审预测 -->
            <div class="diag-section">
              <div class="section-title"><span class="num">4</span>修改后过审预测</div>
              <div class="predict-box">
                <div class="predict-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <div style="flex: 1">
                  <div class="predict-headline">
                    按建议修改后过审概率：<span class="predict-after">{{ pct(report.predict.after) }}</span>
                    <span class="predict-delta">（当前 {{ pct(report.predict.before) }}）</span>
                  </div>
                  <div class="predict-basis">{{ report.predict.basis }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ============ precheck：过审预测 + 5 维扫描 + 优化建议 ============ -->
          <div v-else>
            <!-- 过审预测（precheck 的「⑥ 预测」前置为模块 1） -->
            <div class="diag-section">
              <div class="section-title"><span class="num">1</span>过审概率预测</div>
              <div class="predict-box">
                <div class="predict-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <div style="flex: 1">
                  <div class="predict-headline">
                    预计过审率：<span class="predict-after">{{ pct(report.predict.after) }}</span>
                  </div>
                  <div class="predict-basis">{{ report.predict.basis }}</div>
                </div>
              </div>
            </div>

            <!-- 5 维合规扫描 -->
            <div v-if="report.dimensions" class="diag-section">
              <div class="section-title"><span class="num">2</span>5 维合规扫描</div>
              <table class="diag-dim-table">
                <thead>
                  <tr><th>维度</th><th>结果</th><th>说明</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(d, i) in report.dimensions" :key="i">
                    <td>{{ d.name }}</td>
                    <td>
                      <span v-if="d.result === 'pass'" class="dim-pass">✓ 通过</span>
                      <span v-else class="dim-warn">⚠ 建议优化</span>
                    </td>
                    <td>{{ d.note }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 优化建议（非必须） -->
            <div v-if="report.fixes.length" class="diag-section">
              <div class="section-title">
                <span class="num">3</span>优化建议
                <span class="tag tag-gray" style="margin-left: 4px">非必须 · 提升保险</span>
              </div>
              <div class="fix-block">
                <div v-for="(f, i) in report.fixes" :key="i" class="fix-item">
                  <div class="fix-num">{{ i + 1 }}</div>
                  <div class="fix-content">
                    <div class="fix-title">{{ f.title }}</div>
                    <div class="fix-detail">{{ f.detail }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="diag-section">
              <div class="precheck-pass-note">
                ✅ 该素材可直接提审。如需进一步提升过审保险，可采纳上方优化建议后再提交。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作条 -->
    <div class="bottom-actions">
      <div style="font-size: 12px; color: var(--gray-500)">诊断结果对您是否有帮助？</div>
      <button class="btn btn-ghost btn-sm" @click="onFeedback(true)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
        </svg>
        准确
      </button>
      <button class="btn btn-ghost btn-sm" @click="onFeedback(false)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3z" />
        </svg>
        不准确
      </button>
      <div style="flex: 1" />
      <button class="btn btn-outline" @click="onExport">导出诊断报告</button>
      <button class="btn btn-outline" @click="onSediment">沉淀到知识库</button>
      <button class="btn btn-primary" @click="newDiag">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        上传修改后素材
      </button>
    </div>

    <!-- 轻反馈 toast（底部操作 / 历史参考） -->
    <transition name="fade">
      <div v-if="toastMsg" class="diag-toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<style scoped>
.diag-content { flex: 1; overflow-y: auto; padding: 20px 24px; }
.diag-toast {
  position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
  background: var(--gray-900); color: #fff; padding: 10px 18px;
  border-radius: 999px; font-size: 13px; z-index: 1000;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
}
/* 报告卡片 */
.diag-report { background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 14px;
  overflow: hidden; }
.report-head { padding: 18px 20px;
  background: linear-gradient(135deg, #FFF1F0, #FFF8F7);
  border-bottom: 1px solid var(--border-light); }
.report-result-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.report-title { font-size: 17px; font-weight: 600; color: var(--gray-900); }
.report-subtitle { font-size: 13px; color: var(--gray-500); margin-top: 4px; }
.severity-badge { display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600; }
.sev-high { background: var(--danger); color: #fff; }
.sev-mid { background: var(--warning); color: #fff; }
.sev-low { background: var(--gray-200); color: var(--gray-700); }
.report-body { padding: 20px; }
.diag-section { margin-bottom: 18px; }
.section-title { font-size: 13px; font-weight: 600; color: var(--gray-900); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.section-title .num { display:inline-flex; align-items:center; justify-content:center;
  width: 18px; height: 18px; border-radius: 999px;
  background: var(--brand-600); color: #fff;
  font-size: 11px; }
/* 拒审原因块 */
.reason-block { background: var(--danger-bg);
  border: 1px solid #FECACA;
  border-left: 3px solid var(--danger);
  padding: 14px;
  border-radius: 8px;
  display: flex; gap: 12px; }
.reason-icon { width: 32px; height: 32px; flex-shrink: 0; border-radius: 8px; background: var(--danger); color: #fff; display:flex; align-items:center; justify-content:center; }
.reason-text-title { font-size: 14px; font-weight: 600; color: var(--gray-900); margin-bottom: 4px; }
.reason-text-detail { font-size: 13px; color: var(--gray-700); line-height: 1.6; }
.violation-tag { display: inline-block;
  padding: 2px 8px;
  background: #fff;
  border: 1px solid #FCA5A5;
  border-radius: 4px;
  color: var(--danger);
  font-size: 11px;
  font-weight: 600;
  margin-right: 4px; }
/* 修改方案 */
.fix-block { background: #F0F7FF;
  border: 1px solid #BFDBFE;
  border-radius: 8px;
  padding: 14px; }
.fix-item { display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start; padding-bottom: 10px; border-bottom: 1px dashed #BFDBFE; }
.fix-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.fix-num { width: 22px; height: 22px; border-radius: 999px;
  background: var(--brand-600); color: #fff;
  font-size: 11px; font-weight: 700;
  display:flex; align-items:center; justify-content:center;
  flex-shrink: 0; }
.fix-content { flex: 1; }
.fix-title { font-size: 13px; font-weight: 600; color: var(--gray-900); margin-bottom: 4px; }
.fix-detail { font-size: 12px; color: var(--gray-600); line-height: 1.5; }
.fix-compare { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; margin-top: 8px; padding: 8px; background: #fff; border-radius: 6px; }
.fix-original { padding: 6px 10px; background: var(--danger-bg); border: 1px solid #FECACA; border-radius: 6px; font-size: 12px; color: var(--danger); text-decoration: line-through; }
.fix-arrow { color: var(--brand-500); }
.fix-new { padding: 6px 10px; background: var(--success-bg); border: 1px solid #BBE5C8; border-radius: 6px; font-size: 12px; color: var(--success); font-weight: 600; }
/* 历史参考 */
.history-ref { display: flex; flex-direction: column; gap: 8px; }
.history-ref-item { display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  background: var(--gray-50);
  border-radius: 8px; }
.history-ref-icon { width: 28px; height: 28px; border-radius: 8px; background: var(--brand-50); color: var(--brand-700); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.history-ref-title { font-size: 13px; color: var(--gray-800); }
.history-ref-meta { font-size: 11px; color: var(--gray-500); margin-top: 2px; }
/* 预览 + 报告 双栏 */
.report-double { display: grid; grid-template-columns: 380px 1fr; gap: 18px; align-items: flex-start; }
.material-preview { background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 14px;
  padding: 16px;
  position: sticky; top: 16px; }
.preview-frame { aspect-ratio: 9 / 16;
  background: linear-gradient(180deg, #1E293B, #0F172A);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center; }
.preview-frame .play-btn { width: 56px; height: 56px; border-radius: 999px;
  background: rgba(255,255,255,0.95);
  display:flex; align-items:center; justify-content:center; }
.preview-frame::before { content: "";
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(255,124,75,0.35), transparent 40%),
    radial-gradient(circle at 70% 80%, rgba(91,124,255,0.3), transparent 40%); }
.preview-frame .text-overlay { position: absolute; left: 12px; right: 12px; bottom: 14px;
  color: #fff;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  z-index: 2; }
.preview-frame .text-overlay .title { font-size: 16px; line-height: 1.3; }
.preview-frame .text-overlay .sub { font-size: 11px; opacity: 0.9; margin-top: 4px; font-weight: 500; }
.preview-meta { margin-top: 14px; }
.preview-meta-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; border-bottom: 1px dashed var(--border-light); }
.preview-meta-row:last-child { border-bottom: none; }
.preview-meta-row .key { color: var(--gray-500); }
.preview-meta-row .value { color: var(--gray-800); font-weight: 500; }
.bottom-actions { padding: 14px 24px; background: #fff; border-top: 1px solid var(--border-base); display: flex; gap: 10px; align-items: center; }
.violation-marker { position: absolute;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  z-index: 3;
  box-shadow: 0 2px 6px rgba(220,38,38,0.4); }
.violation-marker::before { content: "";
  position: absolute;
  width: 1px;
  height: 16px;
  background: var(--danger);
  left: 50%;
  bottom: -16px; }
/* 态③：报告顶部条 */
.report-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
/* —— 补充：组件新起 / precheck 变体的 class —— */
.report-topbar .page-title { font-weight: 700; color: var(--gray-900); }
.report-topbar .page-subtitle { font-size: 13px; color: var(--gray-500); margin-top: 3px; }
.sev-low-ok { background: var(--success); color: #fff; }
.predict-box { display: flex; gap: 12px; align-items: flex-start; padding: 14px; background: var(--success-bg); border: 1px solid #BBE5C8; border-radius: 8px; }
.predict-icon { width: 36px; height: 36px; border-radius: 8px; background: var(--success); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.predict-headline { font-size: 14px; color: var(--gray-800); font-weight: 500; line-height: 1.5; }
.predict-after { font-size: 18px; font-weight: 700; color: var(--success); }
.predict-delta { font-size: 12px; color: var(--gray-500); font-weight: 400; }
.predict-basis { font-size: 12px; color: var(--gray-600); margin-top: 4px; line-height: 1.5; }
.diag-dim-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.diag-dim-table th { text-align: left; padding: 8px 10px; font-size: 12px; color: var(--gray-500); font-weight: 600; border-bottom: 1px solid var(--border-base); }
.diag-dim-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-light); color: var(--gray-800); }
.dim-pass { color: var(--success); font-weight: 600; }
.dim-warn { color: var(--warning); font-weight: 600; }
.precheck-pass-note { padding: 14px; background: var(--success-bg); border: 1px solid #BBE5C8; border-radius: 8px; font-size: 13px; color: var(--gray-700); line-height: 1.6; }

</style>
