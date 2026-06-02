<script setup lang="ts">
/**
 * OutputCard —— AI 回复输出样式的动态渲染器（15 种 ASK-01~15 的统一出口）
 *
 * 一条 AI 消息 = 若干 OutputBlock；本组件按 block.kind 渲染对应卡片，
 * 所有卡片样式锚定 docs/prototypes/qa-styles.html（class 名一致，复用全局 CSS）。
 * 新增样式只需扩展 OutputBlock 类型 + 此处一个分支，页面无需改动 → 可扩展框架。
 *
 * 对外事件：
 *   - source(id, title)  点击来源 chip → 打开抽屉
 *   - follow(label, flow) 点击追问 / 跳转 / 槽位选项
 *   - action(action)     边界卡 / 跳页按钮
 *   - slots(summary)     起量槽位三组选完（这里简化为点任一槽位即汇总）
 */
import type {
  EdgeAction,
  OutputBlock,
  QaFlow,
  SourceRef,
} from '@/types/qa'
import { HEAD_ICONS, THUMB_UP, THUMB_DOWN } from './icons'

defineProps<{ blocks: OutputBlock[] }>()

const emit = defineEmits<{
  (e: 'source', ref: SourceRef): void
  (e: 'follow', label: string, flow?: QaFlow): void
  (e: 'action', action: EdgeAction): void
  (e: 'slots', summary: string): void
  (e: 'meta', kind: 'adopt' | 'dislike' | 'retry'): void
  (e: 'exec', label: string): void
}>()

/** **加粗** → <b>；并转义其余 HTML，防注入 */
function rich(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return esc
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>')
}

/** 起量槽位：点任一项即把该组选择汇总（演示用，简化为单点即触发完整 summary） */
function onSlot() {
  emit('slots', '投了 24 小时 · 日消耗 ¥300 · 累计 8 个转化 · 付费目标')
}

/** 按钮 variant → 全局按钮类（danger 走 primary 形 + 内联红底） */
function btnClass(v?: string): string {
  switch (v) {
    case 'outline':
      return 'btn-outline'
    case 'ghost':
      return 'btn-ghost'
    case 'primary':
    case 'danger':
    default:
      return 'btn-primary'
  }
}
</script>

<template>
  <template v-for="(block, i) in blocks" :key="i">
    <!-- 富文本段落 -->
    <div
      v-if="block.kind === 'text'"
      :class="['oc-text', { 'oc-text-muted': block.tone === 'muted' }]"
      v-html="rich(block.text)"
    />

    <!-- 结论卡 ans-card -->
    <div v-else-if="block.kind === 'ansCard'" :class="['ans-card', { warn: block.variant === 'warn' }]">
      <div class="ans-head">
        <span v-if="block.icon" class="oc-ico" v-html="HEAD_ICONS[block.icon]" />
        <span v-html="rich(block.head)" />
      </div>
      <div class="ans-detail" v-html="rich(block.detail)" />
    </div>

    <!-- 出价三栏 price-grid -->
    <div v-else-if="block.kind === 'priceGrid'" class="price-grid">
      <div v-for="(c, ci) in block.cells" :key="ci" :class="['price-cell', `price-${c.level}`]">
        <div class="label">{{ c.label }}</div>
        <div class="val">{{ c.value }}</div>
      </div>
    </div>

    <!-- 步骤引导 steps -->
    <div v-else-if="block.kind === 'steps'" class="steps">
      <div v-if="block.title" class="oc-steps-title">{{ block.title }}</div>
      <div v-for="(s, si) in block.items" :key="si" class="step-item">
        <div class="step-num">{{ si + 1 }}</div>
        <div class="step-content">
          <div class="step-title">{{ s.title }}</div>
          <div v-if="s.desc" class="step-desc">{{ s.desc }}</div>
        </div>
      </div>
    </div>

    <!-- 分步操作卡 step-list（ASK-13） -->
    <div v-else-if="block.kind === 'stepList'" class="step-list">
      <div v-for="(s, si) in block.items" :key="si" class="step-item">
        <span class="step-no">{{ si + 1 }}</span>
        <div v-html="rich(s)" />
      </div>
    </div>

    <!-- 数据卡 data-card（ASK-05） -->
    <div v-else-if="block.kind === 'dataCard'" class="data-card">
      <div class="data-head">
        <span class="oc-strong">{{ block.title }}</span>
        <span v-if="block.source" class="oc-data-src">{{ block.source }}</span>
      </div>
      <div class="data-metric-row">
        <div v-for="(m, mi) in block.metrics" :key="mi" class="data-metric">
          <div class="label">{{ m.label }}</div>
          <div class="val" :style="m.danger ? 'color:var(--danger);' : ''">{{ m.value }}</div>
        </div>
      </div>
    </div>

    <!-- 工具调用 tool-call（ASK-02） -->
    <div v-else-if="block.kind === 'toolCall'" class="tool-call">
      <div class="tc-head">{{ block.head }}</div>
      <div v-for="(t, ti) in block.items" :key="ti" class="tc-item done">{{ t }}</div>
    </div>

    <!-- Agent 计划 agent-plan（ASK-03） -->
    <div v-else-if="block.kind === 'agentPlan'" class="agent-plan">
      <div class="ap-head">
        <span class="oc-ico" v-html="HEAD_ICONS.clock" />
        {{ block.head }}
      </div>
      <div v-for="(t, ti) in block.items" :key="ti" class="ap-item done">{{ t }}</div>
    </div>

    <!-- 多选推荐 recommend-multi（ASK-04） -->
    <div v-else-if="block.kind === 'recommendMulti'" class="recommend-multi">
      <div class="rm-head">{{ block.head }}</div>
      <label
        v-for="(o, oi) in block.options"
        :key="oi"
        :class="['rm-item', { recommended: o.badge === 'good' && !o.dangerous, dangerous: o.dangerous }]"
      >
        <input type="checkbox" :checked="o.checked" />
        <div class="rm-body">
          <div class="rm-title">
            {{ o.title }}
            <span v-if="o.badge === 'good'" class="rm-tag-good">推荐 ⭐</span>
            <span v-else-if="o.badge === 'bad'" class="rm-tag-bad">不推荐</span>
          </div>
          <div class="rm-desc">{{ o.desc }}</div>
        </div>
      </label>
      <div v-if="block.execLabel" class="oc-exec-row">
        <button class="btn btn-primary btn-sm" @click="emit('exec', block.execLabel)">
          {{ block.execLabel }}
        </button>
      </div>
    </div>

    <!-- 素材排行榜 rank-list（RPT material_rank） -->
    <div v-else-if="block.kind === 'rankList'" class="rank-list">
      <div v-if="block.title" class="rl-title">{{ block.title }}</div>
      <div class="rl-header">
        <span class="rl-col-rank">#</span>
        <span class="rl-col-name">素材名称</span>
        <span class="rl-col-metric">ROI</span>
        <span class="rl-col-metric">CTR</span>
        <span class="rl-col-tag">状态</span>
      </div>
      <div
        v-for="item in block.items"
        :key="item.rank"
        :class="['rl-row', { 'rl-row-declining': item.declining }]"
      >
        <span class="rl-col-rank">
          <span :class="['rl-badge', item.rank <= 3 ? 'rl-badge-top' : 'rl-badge-normal']">{{ item.rank }}</span>
        </span>
        <span class="rl-col-name">{{ item.name }}</span>
        <span :class="['rl-col-metric', item.declining ? 'rl-val-danger' : 'rl-val-good']">{{ item.roi }}</span>
        <span class="rl-col-metric rl-val-neutral">{{ item.ctr }}</span>
        <span v-if="item.tag" class="rl-col-tag">
          <span :class="['rl-tag', item.declining ? 'rl-tag-warn' : 'rl-tag-ok']">{{ item.tag }}</span>
        </span>
      </div>
    </div>

    <!-- 边界卡 edge-card（ASK-08/09/10/12/15） -->
    <div v-else-if="block.kind === 'edgeCard'" :class="['edge-card', `edge-${block.variant}`]">
      <div class="edge-card-head">
        <span v-if="block.icon" class="oc-ico" v-html="HEAD_ICONS[block.icon]" />
        {{ block.head }}
      </div>
      <div class="edge-card-body" v-html="rich(block.body)" />
      <div v-if="block.actions?.length" class="edge-actions">
        <button
          v-for="(a, ai) in block.actions"
          :key="ai"
          :class="['btn', 'btn-sm', btnClass(a.variant)]"
          :style="a.variant === 'danger' ? 'background:var(--danger);color:#fff;' : ''"
          @click="emit('action', a)"
        >
          {{ a.label }}
        </button>
      </div>
    </div>

    <!-- 跳专业页按钮组（ASK-02/03） -->
    <div v-else-if="block.kind === 'gotoButtons'">
      <div class="oc-goto-row">
        <button
          v-for="(b, bi) in block.buttons"
          :key="bi"
          :class="['btn', 'btn-sm', btnClass(b.variant)]"
          @click="emit('action', b)"
        >
          {{ b.label }}
        </button>
      </div>
      <div v-if="block.note" class="oc-note">{{ block.note }}</div>
    </div>

    <!-- 槽位反问 slot-group（ASK-04 step1） -->
    <div v-else-if="block.kind === 'slotGroup'">
      <div v-for="(g, gi) in block.groups" :key="gi" class="slot-group">
        <div class="slot-label">{{ g.label }}</div>
        <div class="slot-options">
          <button v-for="(o, oi) in g.options" :key="oi" class="followup-btn" @click="onSlot">
            {{ o }}
          </button>
        </div>
      </div>
    </div>

    <!-- 澄清 / 追问气泡 follow-ups（ASK-07 等） -->
    <div v-else-if="block.kind === 'followUps'">
      <div v-if="block.prompt" class="oc-text">{{ block.prompt }}</div>
      <div class="clarify-opts">
        <button
          v-for="(o, oi) in block.options"
          :key="oi"
          class="followup-btn"
          @click="emit('follow', o.label, o.nextFlow)"
        >
          {{ o.label }}
        </button>
      </div>
    </div>

    <!-- 多轮上下文标注 ctx-note（ASK-11） -->
    <div
      v-else-if="block.kind === 'contextNote'"
      :class="['ctx-note', { 'ctx-switch': block.variant === 'switch' }]"
    >
      {{ block.text }}
    </div>

    <!-- 加载动画 qa-typing（ASK-14） -->
    <div v-else-if="block.kind === 'typing'" class="qa-typing">
      <span /><span /><span />
    </div>

    <!-- 来源引用 sources -->
    <div v-else-if="block.kind === 'sources'" class="sources">
      <span class="oc-src-label">{{ block.label || '参考来源' }}</span>
      <span
        v-for="(s, si) in block.refs"
        :key="si"
        class="source-chip"
        @click="emit('source', s)"
      >
        {{ s.title }}
      </span>
    </div>

    <!-- 操作 / 元信息 msg-actions -->
    <div v-else-if="block.kind === 'metaBar'" class="msg-actions">
      <span v-if="block.adopt" class="msg-action" @click="emit('meta', 'adopt')">
        <span class="oc-ico" v-html="THUMB_UP" /> 采纳
      </span>
      <span v-if="block.dislike" class="msg-action" @click="emit('meta', 'dislike')">
        <span class="oc-ico" v-html="THUMB_DOWN" /> 不准确
      </span>
      <span
        v-if="!block.adopt && !block.dislike && block.meta && block.meta.includes('↻')"
        class="msg-action"
        @click="emit('meta', 'retry')"
      >
        {{ block.meta }}
      </span>
      <span v-else-if="block.meta" class="msg-action oc-meta-right">{{ block.meta }}</span>
    </div>
  </template>
</template>

<style scoped>
.oc-text { margin-bottom: 4px; line-height: 1.6; }
.oc-text + .oc-text { margin-top: 8px; }
.oc-text-muted { color: var(--gray-700); }
.oc-text :deep(b) { color: var(--gray-900); }

.oc-ico { display: inline-flex; align-items: center; }
.oc-strong { font-weight: 600; }
.oc-data-src { font-size: 11px; color: var(--gray-400); }
.oc-steps-title { padding: 6px 8px 4px; font-size: 13px; font-weight: 600; color: var(--gray-900); }
.oc-src-label { font-size: 11px; color: var(--gray-500); align-self: center; }
.oc-note { font-size: 12px; color: var(--gray-500); margin-top: 8px; }
.oc-goto-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.oc-exec-row { display: flex; gap: 8px; margin-top: 12px; }
.oc-meta-right { margin-left: auto; color: var(--gray-400); cursor: default; }

/* ASK-13 分步操作卡（提取自 qa-styles.html .step-list / .step-no） */
.step-list { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.step-list .step-item { display: flex; gap: 10px; align-items: flex-start; padding: 0; font-size: 13px; color: var(--gray-700); line-height: 1.55; }
.step-no { flex: none; width: 20px; height: 20px; border-radius: 50%; background: var(--brand-50); color: var(--brand-700); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.step-list :deep(b) { color: var(--gray-900); }

/* ASK-14 加载动画（提取自 qa-styles.html .qa-typing） */
.qa-typing { display: inline-flex; gap: 5px; padding: 6px 2px; }
.qa-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--brand-400); animation: qabounce 1.2s infinite ease-in-out; }
.qa-typing span:nth-child(2) { animation-delay: 0.18s; }
.qa-typing span:nth-child(3) { animation-delay: 0.36s; }
@keyframes qabounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }

.edge-card-body :deep(b) { color: var(--gray-900); }
.ans-detail :deep(b), .ans-head :deep(b) { color: var(--gray-900); }

/* rm-item 内容容器（style.css 有 rm-item/rm-title/rm-desc，独缺 rm-body） */
.rm-body { flex: 1; min-width: 0; }

/* rank-list：素材排行榜（RPT material_rank，品牌蓝 #2563EB） */
.rank-list { border: 1px solid var(--gray-200); border-radius: 8px; overflow: hidden; font-size: 12px; margin: 8px 0; }
.rl-title { padding: 8px 12px 6px; font-size: 13px; font-weight: 600; color: var(--gray-900); background: var(--brand-50); border-bottom: 1px solid var(--gray-200); }
.rl-header { display: grid; grid-template-columns: 32px 1fr 52px 52px 56px; align-items: center; padding: 5px 12px; background: var(--gray-50); border-bottom: 1px solid var(--gray-200); font-size: 11px; font-weight: 600; color: var(--gray-500); gap: 6px; }
.rl-row { display: grid; grid-template-columns: 32px 1fr 52px 52px 56px; align-items: center; padding: 7px 12px; border-bottom: 1px solid var(--gray-100); gap: 6px; transition: background 0.15s; }
.rl-row:last-child { border-bottom: none; }
.rl-row:hover { background: var(--brand-50); }
.rl-row-declining { background: #fff7ed; }
.rl-row-declining:hover { background: #fff3e0; }
.rl-col-rank { text-align: center; }
.rl-col-name { color: var(--gray-800); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-col-metric { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
.rl-col-tag { text-align: right; }
.rl-badge { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; font-size: 11px; font-weight: 700; }
.rl-badge-top { background: #2563EB; color: #fff; }
.rl-badge-normal { background: var(--gray-100); color: var(--gray-500); }
.rl-val-good { color: #2563EB; }
.rl-val-danger { color: var(--danger, #ef4444); }
.rl-val-neutral { color: var(--gray-600); }
.rl-tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.rl-tag-ok { background: var(--brand-50); color: #2563EB; }
.rl-tag-warn { background: #fff3cd; color: #b45309; }
</style>
