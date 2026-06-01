<script setup lang="ts">
/**
 * 24h 消耗趋势图（纯数据走势，无任何判断 / 涨跌色预警）
 * 权威源：docs/prototypes/monitor.html chart-card（今日实线 + 昨日虚线参考 + 当前点）。
 * 由点列动态生成 SVG path（viewBox 700×220），不引图表库。
 * 只呈现事实走势：不标「异常 / 偏弱」，不用 danger 色。
 */
import { computed } from 'vue'
import type { TrendPoint } from '@/types/monitor'

const props = withDefaults(
  defineProps<{
    title?: string
    unit?: string
    today: TrendPoint[]
    yesterday?: TrendPoint[]
    nowLabel?: string
    /** 紧凑模式（详情页内嵌，去掉 y 轴刻度 / 图例） */
    compact?: boolean
  }>(),
  { title: '实时消耗 · 24 小时趋势', unit: '¥', yesterday: () => [], nowLabel: '', compact: false }
)

// 画布几何
const W = 700
const H = 220
const PAD_L = 40
const PAD_R = 20
const PAD_T = 30
const PAD_B = 30

/** 所有值（今+昨）求范围 */
const allValues = computed(() => [
  ...props.today.map((p) => p.value),
  ...props.yesterday.map((p) => p.value),
])
const maxV = computed(() => Math.max(1, ...allValues.value))
const minV = computed(() => Math.min(...allValues.value, 0))

function x(i: number, len: number): number {
  if (len <= 1) return PAD_L
  return PAD_L + ((W - PAD_L - PAD_R) * i) / (len - 1)
}
function y(v: number): number {
  const span = maxV.value - minV.value || 1
  return PAD_T + (H - PAD_T - PAD_B) * (1 - (v - minV.value) / span)
}

function linePath(points: TrendPoint[]): string {
  if (!points.length) return ''
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i, points.length).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ')
}

const todayPath = computed(() => linePath(props.today))
const areaPath = computed(() => {
  if (!props.today.length) return ''
  const top = linePath(props.today)
  const lastX = x(props.today.length - 1, props.today.length).toFixed(1)
  const baseY = (H - PAD_B).toFixed(1)
  return `${top} L${lastX},${baseY} L${PAD_L.toFixed(1)},${baseY} Z`
})
const yesterdayPath = computed(() => linePath(props.yesterday))

/** 当前点（今日最后一点） */
const lastPoint = computed(() => {
  const len = props.today.length
  if (!len) return null
  const p = props.today[len - 1]
  return { cx: x(len - 1, len), cy: y(p.value), value: p.value }
})

/** y 轴刻度（4 档） */
const yTicks = computed(() => {
  const ticks: { y: number; label: string }[] = []
  for (let i = 0; i < 4; i++) {
    const v = minV.value + ((maxV.value - minV.value) * (3 - i)) / 3
    ticks.push({ y: PAD_T + ((H - PAD_T - PAD_B) * i) / 3, label: kFmt(v) })
  }
  return ticks
})

/** x 轴稀疏刻度（首/中/尾几个时间点） */
const xTicks = computed(() => {
  const len = props.today.length
  if (!len) return []
  const idxs = compactIdx(len)
  return idxs.map((i) => ({
    x: x(i, len),
    label: props.today[i]?.time ?? '',
    isLast: i === len - 1,
  }))
})

function compactIdx(len: number): number[] {
  if (len <= 5) return props.today.map((_, i) => i)
  return [0, Math.floor(len * 0.25), Math.floor(len * 0.5), Math.floor(len * 0.75), len - 1]
}

function kFmt(v: number): string {
  if (v >= 1000) return `${Math.round(v / 1000)}K`
  return `${Math.round(v)}`
}
function moneyFmt(v: number): string {
  return `${props.unit}${v.toLocaleString('zh-CN')}`
}
</script>

<template>
  <div class="chart-card" :class="{ compact }">
    <div v-if="!compact" class="chart-head">
      <div class="chart-title">{{ title }}</div>
      <slot name="tabs" />
    </div>
    <div v-else class="chart-title chart-title-sm">{{ title }}</div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="chart-svg" :style="{ height: compact ? '130px' : '220px' }">
      <defs>
        <linearGradient :id="`mon-grad-${compact ? 'c' : 'm'}`" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#3B6AEE" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#3B6AEE" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- 网格 + y 刻度 -->
      <template v-for="(t, i) in yTicks" :key="`y${i}`">
        <line :x1="PAD_L" :y1="t.y" :x2="W - PAD_R" :y2="t.y" :stroke="i === yTicks.length - 1 ? '#E2E8F0' : '#F1F5F9'" />
        <text v-if="!compact" :x="10" :y="t.y + 4" font-size="11" fill="#94A3B8">{{ t.label }}</text>
      </template>

      <!-- 面积 + 今日实线 -->
      <path :d="areaPath" :fill="`url(#mon-grad-${compact ? 'c' : 'm'})`" />
      <path :d="todayPath" fill="none" stroke="#3B6AEE" :stroke-width="compact ? 2.5 : 2" />

      <!-- 昨日参考虚线 -->
      <path v-if="yesterdayPath" :d="yesterdayPath" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="4 4" />

      <!-- 当前点 -->
      <template v-if="lastPoint">
        <circle :cx="lastPoint.cx" :cy="lastPoint.cy" r="5" fill="#3B6AEE" stroke="#fff" stroke-width="2" />
        <text :x="lastPoint.cx" :y="lastPoint.cy - 12" font-size="11" font-weight="600" fill="#1A3477" text-anchor="end">
          {{ moneyFmt(lastPoint.value) }}
        </text>
      </template>

      <!-- x 刻度 -->
      <text
        v-for="(t, i) in xTicks"
        :key="`x${i}`"
        :x="t.x"
        :y="H - 8"
        font-size="10"
        :fill="t.isLast ? '#64748B' : '#94A3B8'"
        :font-weight="t.isLast ? '600' : '400'"
        :text-anchor="i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'"
      >
        {{ t.isLast && nowLabel ? nowLabel : t.label }}
      </text>
    </svg>

    <div v-if="!compact && yesterday.length" class="chart-legend">
      <span class="lg-item"><span class="lg-dot" style="background:#3B6AEE" />今日实时</span>
      <span class="lg-item"><span class="lg-dot" style="background:#94A3B8" />昨日同时段</span>
    </div>
  </div>
</template>

<style scoped>
.chart-card {
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 16px;
}
.chart-card.compact {
  border: none;
  padding: 0;
  margin-bottom: 0;
}
.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-900);
}
.chart-title-sm {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-700);
  margin-bottom: 6px;
}
.chart-svg {
  width: 100%;
  display: block;
}
.chart-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--gray-500);
}
.lg-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lg-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}
</style>
