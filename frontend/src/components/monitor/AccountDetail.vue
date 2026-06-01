<script setup lang="ts">
/**
 * AccountDetail —— 账户详情下钻（3 tab：数据总览 / 订单留存 / 数据明细）
 * 权威源：docs/prototypes/monitor.html mon-view[detail]（mon-detail-head / mon-detail-tabs / mon-dpane）。
 *
 * 结构：
 *   - 头：返回按钮 + 「账户 · 名称」+ 平台徽标。
 *   - tab：overview 概览（日期条 + KPI + 完成度 + 24h趋势 + 漏斗 + 出价预算 + 复购LTV + 子表）
 *          retention 订单留存（RetentionCohort 双模式）
 *          detail 数据明细（DetailTable 近 14 天）
 * 数据全部取自 store（overview/retention/detailData），按 tab 懒加载。
 *
 * 纯数据 · 禁判断：
 *   - KPI 用品牌蓝数值卡，无涨跌箭头 / vs 昨日对比判断；ROI 普通文本不标红。
 *   - 概览子表刻意去掉原型「综合评价（合格/观察/不合格）」判断筛选，仅保留维度 tab 与事实列。
 *   - 不出现任何判断词（异常/偏弱/建议/预警/需关注），无 AI 解读 / 状态标签。
 */
import { computed, ref } from 'vue'
import { useMonitorStore, type DetailTab } from '@/stores/monitor'
import TrendChart from './TrendChart.vue'
import DetailTable from './DetailTable.vue'
import RetentionCohort from './RetentionCohort.vue'
import type { RetentionMode } from '@/types/monitor'

const store = useMonitorStore()

/** 概览日期快捷区间（mock 仅今日有数据，切换其它区间为视觉选中态，接后端后再联动数据） */
const quickDate = ref('今天')

/** 平台徽标短名 class（与 design-system .platform-* 一致） */
const platformClass = computed(() => {
  const p = store.overview?.header.platform ?? store.activeAccount?.platform ?? 'juliang'
  return `platform-${p}`
})

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview', label: '数据总览' },
  { key: 'retention', label: '订单留存' },
  { key: 'detail', label: '数据明细' },
]

/** 头部标题：优先 overview header，回落列表行 */
const headTitle = computed(() => {
  const h = store.overview?.header
  if (h) return `${h.account} · ${h.name}`
  const r = store.activeAccount
  return r ? `${r.account} · ${r.name}` : ''
})
const platformShort = computed(() => store.overview?.header.platformShort ?? '巨量')

/** 当前激活子表（广告组 / 投放计划 / 创意） */
const activeSub = computed(() =>
  store.overview?.subTables.find((t) => t.key === store.subTableKey) ?? store.overview?.subTables[0]
)

function onSetMode(mode: RetentionMode) {
  store.setRetentionMode(mode)
}
</script>

<template>
  <div class="mon-view-detail">
    <!-- 头 -->
    <div class="mon-detail-head">
      <button class="mon-back" type="button" aria-label="返回账户列表" @click="store.backToList()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div class="mon-detail-title">{{ headTitle }}</div>
      <span class="platform" :class="platformClass">{{ platformShort }}</span>
    </div>

    <!-- tab -->
    <div class="mon-detail-tabs">
      <div
        v-for="t in TABS"
        :key="t.key"
        class="mdt"
        :class="{ active: store.detailTab === t.key }"
        @click="store.selectDetailTab(t.key)"
      >
        {{ t.label }}
      </div>
    </div>

    <!-- 概览 -->
    <div v-if="store.detailTab === 'overview'">
      <template v-if="store.overview">
        <div class="mon-date-bar">
          <span class="mdb-label">日期</span>
          <span class="mdb-range">{{ store.overview.header.dateRange }}</span>
          <div class="mdb-quick">
            <span
              v-for="d in ['今天', '昨天', '7天', '30天']"
              :key="d"
              :class="{ active: quickDate === d }"
              @click="quickDate = d"
            >{{ d }}</span>
          </div>
        </div>

        <!-- KPI + 完成度 -->
        <div class="mon-detail-kpi">
          <div v-for="k in store.overview.kpis" :key="k.label" class="mdk">
            <div class="mdk-label">{{ k.label }}</div>
            <div class="mdk-val">{{ k.value }}</div>
          </div>
          <div class="mdk mdk-completion">
            <div class="mdk-label">{{ store.overview.completion.label }}</div>
            <div class="mdk-val">{{ store.overview.completion.percent }}</div>
            <div class="mdk-comp-bar">
              <div :style="{ width: store.overview.completion.ratio + '%' }"></div>
            </div>
            <div class="mdk-comp-detail">
              转化目标 <b>{{ store.overview.completion.done }}</b> ｜ 目标
              <b>{{ store.overview.completion.target }}</b>
            </div>
          </div>
        </div>

        <!-- 24h 趋势（紧凑） -->
        <div class="dt-card">
          <TrendChart
            compact
            title="今日消耗趋势 · 24 小时"
            :today="store.overview.trend"
            :now-label="store.overview.trendNowLabel"
          />
        </div>

        <!-- 漏斗 + 出价预算 -->
        <div class="dt-row">
          <div class="dt-card" style="margin-bottom: 0">
            <div class="dt-card-title">转化漏斗</div>
            <div class="funnel">
              <div v-for="s in store.overview.funnel" :key="s.label" class="funnel-row">
                <span class="fl-label">{{ s.label }}</span>
                <div class="fl-bar" :style="{ width: s.ratio + '%' }">
                  <b>{{ s.value }}</b><template v-if="s.note"> · {{ s.note }}</template>
                </div>
              </div>
            </div>
          </div>
          <div class="dt-card" style="margin-bottom: 0">
            <div class="dt-card-title">出价 &amp; 预算</div>
            <div class="bid-grid">
              <div v-for="b in store.overview.bid" :key="b.label" class="bid-item">
                <div class="bid-label">{{ b.label }}</div>
                <div class="bid-val">{{ b.value }}</div>
              </div>
            </div>
            <div class="bid-progress-head">
              <span>{{ store.overview.budget.label }}</span>
              <span style="font-weight: 600; color: var(--gray-800)">{{ store.overview.budget.percent }}</span>
            </div>
            <div class="bid-bar"><div :style="{ width: store.overview.budget.ratio + '%' }"></div></div>
          </div>
        </div>

        <!-- 详细数据子表（广告组 / 投放计划 / 创意） -->
        <div class="mon-detail-data">
          <div class="mdd-head">
            <div class="mdd-title">详细数据</div>
            <div class="mdd-tabs">
              <div
                v-for="t in store.overview.subTables"
                :key="t.key"
                class="mdd-tab"
                :class="{ active: store.subTableKey === t.key }"
                @click="store.selectSubTable(t.key)"
              >
                {{ t.label }}
              </div>
            </div>
          </div>
          <div v-if="activeSub" class="mdd-table-wrap">
            <table class="mdd-table">
              <thead>
                <tr>
                  <th v-for="(col, ci) in activeSub.columns" :key="col.key" :class="{ 'first-col': ci === 0 }">
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, ri) in activeSub.rows" :key="ri">
                  <td class="first-col">
                    <div class="mdd-group-name">{{ String(r.date).split(' · ')[0] }}</div>
                    <div v-if="String(r.date).includes(' · ')" class="mdd-group-id">
                      {{ String(r.date).split(' · ')[1] }}
                    </div>
                  </td>
                  <td v-for="col in activeSub.columns.slice(1)" :key="col.key">
                    {{ r.metrics[col.key] == null ? '—' : r.metrics[col.key] }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 复购 & LTV -->
        <div class="dt-card" style="margin-top: 16px; margin-bottom: 0">
          <div class="dt-card-title">复购 &amp; LTV</div>
          <div class="bid-grid">
            <div v-for="l in store.overview.ltv" :key="l.label" class="bid-item">
              <div class="bid-label">{{ l.label }}</div>
              <div class="bid-val">{{ l.value }}</div>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="mon-loading">加载中…</div>
    </div>

    <!-- 订单留存 -->
    <div v-else-if="store.detailTab === 'retention'">
      <RetentionCohort
        v-if="store.retention"
        :mode="store.retentionMode"
        :cols="store.retention.cols"
        :rows="store.retention.rows"
        @set-mode="onSetMode"
      />
      <div v-else class="mon-loading">加载中…</div>
    </div>

    <!-- 数据明细 -->
    <div v-else-if="store.detailTab === 'detail'">
      <DetailTable
        v-if="store.detailData"
        title="数据明细 · 近 14 天"
        :columns="store.detailData.columns"
        :rows="store.detailData.rows"
      />
      <div v-else class="mon-loading">加载中…</div>
    </div>
  </div>
</template>

<style scoped>
.mon-detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.mon-back {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-base);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--gray-600);
}
.mon-back:hover {
  border-color: var(--brand-300);
  color: var(--brand-700);
}
.mon-detail-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--gray-900);
}

.mon-detail-tabs {
  display: flex;
  gap: 28px;
  border-bottom: 1px solid var(--border-base);
  margin-bottom: 18px;
}
.mdt {
  padding: 10px 0;
  font-size: 14px;
  color: var(--gray-500);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.mdt:hover {
  color: var(--gray-800);
}
.mdt.active {
  color: var(--brand-700);
  border-bottom-color: var(--brand-600);
  font-weight: 600;
}

.mon-date-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.mdb-label {
  font-size: 13px;
  color: var(--gray-600);
}
.mdb-range {
  font-size: 13px;
  color: var(--gray-800);
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 8px;
  padding: 6px 12px;
}
.mdb-quick {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}
.mdb-quick span {
  font-size: 13px;
  color: var(--gray-500);
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
}
.mdb-quick span.active {
  color: var(--brand-700);
  font-weight: 600;
}
.mdb-quick span:hover {
  background: var(--gray-50);
}

.mon-detail-kpi {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.mdk {
  background: var(--brand-50);
  border: 1px solid var(--brand-100);
  border-radius: 12px;
  padding: 16px;
}
.mdk-label {
  font-size: 13px;
  color: var(--gray-600);
}
.mdk-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--brand-700);
  margin-top: 6px;
}
.mdk-completion {
  grid-column: 5;
  grid-row: span 2;
  display: flex;
  flex-direction: column;
}
.mdk-comp-bar {
  height: 8px;
  background: #fff;
  border-radius: 999px;
  overflow: hidden;
  margin: 12px 0 10px;
}
.mdk-comp-bar > div {
  height: 100%;
  background: var(--brand-500);
  border-radius: 999px;
}
.mdk-comp-detail {
  font-size: 13px;
  color: var(--gray-700);
}
.mdk-comp-detail b {
  color: var(--gray-900);
}

.dt-card {
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 16px;
}
.dt-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 12px;
}
.dt-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.funnel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.funnel-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.fl-label {
  width: 64px;
  font-size: 13px;
  color: var(--gray-600);
  flex-shrink: 0;
  text-align: right;
}
.fl-bar {
  background: linear-gradient(90deg, var(--brand-600), var(--brand-400));
  color: #fff;
  font-size: 12px;
  padding: 7px 12px;
  border-radius: 6px;
  white-space: nowrap;
  min-width: 64px;
}
.fl-bar b {
  font-weight: 700;
}

.bid-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.bid-item {
  background: var(--gray-50);
  border-radius: 8px;
  padding: 9px 12px;
}
.bid-label {
  font-size: 12px;
  color: var(--gray-500);
}
.bid-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-900);
  margin-top: 2px;
}
.bid-progress-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--gray-600);
  margin-bottom: 6px;
}
.bid-bar {
  height: 8px;
  background: var(--gray-100);
  border-radius: 4px;
  overflow: hidden;
}
.bid-bar > div {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-500), var(--brand-700));
  border-radius: 4px;
}

.mon-detail-data {
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 12px;
  overflow: hidden;
}
.mdd-head {
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-light);
}
.mdd-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 12px;
}
.mdd-tabs {
  display: flex;
  gap: 0;
}
.mdd-tab {
  padding: 8px 20px;
  font-size: 13px;
  color: var(--gray-600);
  cursor: pointer;
  border: 1px solid var(--border-base);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  margin-right: 4px;
  background: var(--gray-50);
}
.mdd-tab.active {
  color: var(--brand-700);
  font-weight: 600;
  background: #fff;
  border-color: var(--brand-200);
}
.mdd-table-wrap {
  overflow-x: auto;
}
.mdd-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1100px;
}
.mdd-table thead th {
  background: var(--gray-50);
  text-align: right;
  padding: 10px 14px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--gray-600);
  white-space: nowrap;
  border-bottom: 1px solid var(--border-base);
}
.mdd-table thead th.first-col {
  text-align: left;
}
.mdd-table tbody td {
  padding: 12px 14px;
  font-size: 12.5px;
  text-align: right;
  white-space: nowrap;
  border-bottom: 1px solid var(--border-light);
  color: var(--gray-800);
}
.mdd-table tbody td.first-col {
  text-align: left;
}
.mdd-table tbody tr:last-child td {
  border-bottom: none;
}
.mdd-table tbody tr:hover {
  background: var(--gray-50);
}
.mdd-group-name {
  font-weight: 600;
  color: var(--gray-900);
}
.mdd-group-id {
  font-size: 11px;
  color: var(--gray-400);
  margin-top: 2px;
}

.mon-loading {
  padding: 40px;
  text-align: center;
  font-size: 13px;
  color: var(--gray-400);
}

/* ── 根容器（prototype 无此 class，按同层 mon-view 风格补全） ── */
.mon-view-detail {
  padding: 0;
}
</style>
