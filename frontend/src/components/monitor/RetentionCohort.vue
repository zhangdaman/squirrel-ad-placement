<script setup lang="ts">
/**
 * RetentionCohort —— 订单留存 / 回本进度热力表（纯数据 · 禁判断）
 * 权威源：docs/prototypes/monitor.html mon-dpane[retention] cohortDays / cohortDate。
 *
 * 形态：
 *   - 行 = 注册日期（今天置顶、注册日期倒序，store/mock 已排好）；首列「注册日期」+「新增粉」。
 *   - 列 = 天数模式 当天/D1…D30 ｜ 日期模式 绝对日期；两模式可切换（emit set-mode，store 重拉）。
 *   - 横向可滑动（mdd-scroll overflow-x），首两列冻结（sticky left）。
 *   - 单元格 = 累计回本率%，按品牌蓝由浅到深热力（颜色越深回本越好）；null = 尚未到的天数渲染「—」。
 *
 * 纯数据约定：颜色仅表达数值高低（brand-50→brand-600 深浅），不是判断色；
 *   「— 为尚未到的天数」是事实占位说明，不含任何判断词。回本率不设 danger/warning 色。
 */
import type { CohortCell, CohortRow, RetentionMode } from '@/types/monitor'

const props = defineProps<{
  mode: RetentionMode
  cols: string[]
  rows: CohortRow[]
}>()

const emit = defineEmits<{
  (e: 'set-mode', mode: RetentionMode): void
}>()

/**
 * 回本率 % → 品牌蓝热力档（与原型逐档配色一致，越深越好）：
 *   <30 brand-50 / 30–49 brand-100 / 50–69 brand-200 / 70–89 brand-300 / 90–109 brand-400 / ≥110 brand-600
 * 文字色随底色加深由 brand-700 过渡到白，保证对比度（纯展示，非判断）。
 */
function heat(v: CohortCell): { background: string; color: string } | undefined {
  if (v == null) return undefined
  if (v < 30) return { background: 'var(--brand-50)', color: 'var(--brand-700)' }
  if (v < 50) return { background: 'var(--brand-100)', color: 'var(--brand-700)' }
  if (v < 70) return { background: 'var(--brand-200)', color: '#1B3A95' }
  if (v < 90) return { background: 'var(--brand-300)', color: '#1A3477' }
  if (v < 110) return { background: 'var(--brand-400)', color: '#fff' }
  return { background: 'var(--brand-600)', color: '#fff' }
}

function fmtPct(v: CohortCell): string {
  return v == null ? '—' : `${v}%`
}

function fmtFans(n: number): string {
  return n.toLocaleString('zh-CN')
}

/** 标题随模式切换（事实口径说明，非判断） */
function titlePrefix(): string {
  return props.mode === 'date' ? '回本进度 · 按数据日期' : '回本进度 · 按注册日期'
}
</script>

<template>
  <div class="ret-wrap">
    <!-- 模式切换（天数 / 日期） -->
    <div class="ret-filter">
      <div class="rf-row">
        <span class="rf-label">选择模式</span>
        <label class="rf-rdo">
          <input
            type="radio"
            name="retmode"
            :checked="mode === 'days'"
            @change="emit('set-mode', 'days')"
          />
          天数模式
        </label>
        <label class="rf-rdo">
          <input
            type="radio"
            name="retmode"
            :checked="mode === 'date'"
            @change="emit('set-mode', 'date')"
          />
          日期模式
        </label>
      </div>
    </div>

    <div class="dt-card">
      <div class="dt-card-title">
        {{ titlePrefix() }}
        <span class="dt-note">（颜色越深，累计回本越好；— 为尚未到的天数）</span>
      </div>
      <div class="mdd-scroll">
        <table class="cohort-table">
          <thead>
            <tr>
              <th class="coh-sticky">注册日期</th>
              <th class="coh-fans">新增粉</th>
              <th v-for="(c, i) in cols" :key="`h${i}`" class="coh-col">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.reg">
              <td class="coh-sticky">
                {{ row.reg }}
                <span v-if="row.isToday" class="coh-today">今天</span>
              </td>
              <td class="coh-fans">{{ fmtFans(row.fans) }}</td>
              <td
                v-for="(v, i) in row.values"
                :key="`c${i}`"
                class="coh-col"
                :class="{ 'coh-empty': v == null }"
                :style="heat(v)"
              >
                {{ fmtPct(v) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ret-filter {
  background: var(--gray-50);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 2px 16px;
  margin-bottom: 16px;
}
.rf-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 0;
  flex-wrap: wrap;
}
.rf-label {
  font-size: 13px;
  color: var(--gray-500);
  width: 60px;
  flex-shrink: 0;
}
.rf-rdo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--gray-700);
  cursor: pointer;
}
.rf-rdo input {
  accent-color: var(--brand-600);
  width: 15px;
  height: 15px;
  cursor: pointer;
  margin: 0;
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
.dt-note {
  font-weight: 400;
  color: var(--gray-400);
  font-size: 12px;
}

.mdd-scroll {
  overflow-x: auto;
}
.cohort-table {
  border-collapse: collapse;
  font-size: 12px;
  white-space: nowrap;
  width: auto;
  min-width: 100%;
}
.cohort-table th {
  padding: 7px 5px;
  font-size: 12px;
  color: var(--gray-500);
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid var(--border-base);
}
.cohort-table td {
  padding: 7px 5px;
  text-align: center;
  border-bottom: 2px solid #fff;
}
.cohort-table th.coh-col,
.cohort-table td.coh-col {
  min-width: 76px;
}
/* 冻结首两列（注册日期 + 新增粉） */
.cohort-table .coh-sticky {
  position: sticky;
  left: 0;
  background: #fff;
  z-index: 2;
  box-shadow: 1px 0 0 var(--border-light);
  text-align: left;
  color: var(--gray-700);
  min-width: 96px;
}
.cohort-table thead .coh-sticky {
  z-index: 3;
  background: #fff;
  color: var(--gray-500);
}
.cohort-table .coh-fans {
  position: sticky;
  left: 96px;
  background: #fff;
  z-index: 2;
  box-shadow: 1px 0 0 var(--border-light);
  text-align: left;
  color: var(--gray-700);
  min-width: 64px;
}
.cohort-table thead .coh-fans {
  z-index: 3;
  color: var(--gray-500);
}
.cohort-table td.coh-col {
  font-weight: 600;
}
.cohort-table td.coh-empty {
  color: var(--gray-300);
  font-weight: 400;
}
.coh-today {
  font-size: 11px;
  color: var(--brand-600);
  margin-left: 2px;
}

/* ── 根容器（prototype 无此 class，按同层视图容器风格补全） ── */
.ret-wrap {
  display: flex;
  flex-direction: column;
}
</style>
