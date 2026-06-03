<script setup lang="ts">
/**
 * KnowledgeCard —— 单条知识卡片（对齐 knowledge.html .kbc）
 * 展示：类型图标 / 来源徽章 / L1·L2·L3 层级徽章 / 标题 / 处理状态
 *       / 摘要 / 原文 chunk 片段 / 底部统计（引用次数 · 命中率 · 更新 · 标签）。
 * 纯展示组件：点卡片 emit('open') 开详情抽屉。数据来自 store。
 * 注：知识反馈（赞踩）已收口到「AI 问答引用该知识」的场景（SourceDrawer），
 *     列表不再放孤立赞踩——用户用过知识、依据明确时再评价，时机更自然。
 */
import type { KnowledgeListItem } from '@/types/knowledge'
import { TYPE_ICONS, TYPE_ICON_CLASS, ICON_CITE, ICON_HIT, ICON_WARN } from './icons'

const props = defineProps<{
  item: KnowledgeListItem
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'open', id: string): void
}>()

/** 来源徽章文案 + class（对齐原型 kbc-source 变体） */
const SOURCE_META: Record<string, { cls: string; text: string }> = {
  pub: { cls: 'pub', text: '🌐 公域 · API' },
  platform: { cls: 'pub', text: '🛡️ 平台 · 官方规则' },
  'prv-up': { cls: 'prv-up', text: '🔒 私域 · 上传' },
  history: { cls: 'prv-ai', text: '🤖 私域 · AI 沉淀' },
}

const sourceMeta = () => SOURCE_META[props.item.source] || SOURCE_META['prv-up']
const hitPct = () => Math.round(props.item.hit_rate * 100)
/** 命中率偏低（<50%）→ 告警样式 */
const hitLow = () => props.item.hit_rate > 0 && props.item.hit_rate < 0.5
</script>

<template>
  <div :class="['kbc', { selected }]" @click="emit('open', item.id)">
    <div class="kbc-row1">
      <!-- 类型图标 -->
      <div :class="['kbc-type-icon', TYPE_ICON_CLASS[item.type]]" v-html="TYPE_ICONS[item.type]" />

      <div class="kbc-main">
        <!-- 标题行：来源徽章 + L 层 + 标题 + 状态 -->
        <div class="kbc-title-row">
          <span :class="['kbc-source', sourceMeta().cls]">{{ sourceMeta().text }}</span>
          <span :class="['kbc-lvl', item.layer.toLowerCase()]">{{ item.layer }}</span>
          <span class="kbc-title">{{ item.title.replace(/^\[Mock\]\s*/, '') }}</span>
          <span
            :class="['kbc-status', { processing: item.status.kind === 'processing' }]"
            :style="item.status.kind === 'warn' ? 'background:var(--warning-bg);color:var(--warning);' : ''"
          >
            <span v-if="item.status.kind === 'processing'" class="spin" />
            {{ item.status.label }}
          </span>
        </div>

        <!-- 摘要 -->
        <div class="kbc-summary">{{ item.summary }}</div>

        <!-- 处理中进度条 -->
        <div
          v-if="item.status.kind === 'processing'"
          class="kbc-progress"
        >
          <div class="kbc-progress-inner" :style="{ width: (item.status.progress ?? 0) + '%' }" />
        </div>

        <!-- 原文片段 -->
        <div v-else-if="item.chunk" class="kbc-snippet">{{ item.chunk }}</div>

        <!-- 底部统计 -->
        <div class="kbc-footer">
          <span :class="['stat', item.cited > 100 ? 'hot' : item.cited === 0 ? 'zero' : '']">
            <span class="ico" v-html="ICON_CITE" />
            引用 <strong>{{ item.cited }}</strong> 次
          </span>
          <span
            v-if="item.status.kind !== 'processing'"
            :class="['stat', hitLow() ? 'warn' : hitPct() >= 80 ? 'hot' : '']"
          >
            <span class="ico" v-html="hitLow() ? ICON_WARN : ICON_HIT" />
            命中率 <strong>{{ hitPct() }}%</strong><span v-if="hitLow()"> ↓</span>
          </span>
          <span class="dot">·</span>
          <span class="kbc-updated">{{ item.updated }}</span>
          <span v-if="item.tags.length" class="dot">·</span>
          <span class="tags">
            <span v-for="t in item.tags" :key="t" class="kbc-tag">#{{ t }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kbc-main { flex: 1; min-width: 0; }
.kbc-footer .ico :deep(svg) { opacity: 0.8; vertical-align: -1px; }
.kbc-footer .stat strong { margin: 0 2px; }
.kbc-updated { color: var(--gray-500); }
.kbc-progress { height: 4px; background: var(--gray-100); border-radius: 999px; overflow: hidden; margin: 8px 0; }
.kbc-progress-inner { height: 100%; background: var(--info); border-radius: 999px; }

/* —— 卡片容器与布局（补全自 knowledge.html .kbc，组件化时漏搬）—— */
.kbc {
  background: #fff; border: 1px solid var(--border-base); border-radius: 12px;
  padding: 14px 16px; cursor: pointer; transition: all 0.15s;
}
.kbc:hover { border-color: var(--brand-300); box-shadow: 0 4px 14px rgba(15,23,42,.08); }
.kbc.selected { border-color: var(--brand-500); background: #FAFCFF; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
.kbc-row1 { display: flex; align-items: flex-start; gap: 10px; }

/* 类型图标 */
.kbc-type-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kbc-t-doc { background: #EFF6FF; color: #2563EB; }
.kbc-t-rule { background: #FEF3C7; color: #B45309; }
.kbc-t-case { background: #ECFDF5; color: #16A34A; }
.kbc-t-qa { background: #EFF6FF; color: #2563EB; }
.kbc-t-tpl { background: #FFE4E6; color: #BE123C; }

/* 标题行 + 徽章 */
.kbc-title-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.kbc-title { font-size: 14px; font-weight: 600; color: var(--gray-900); }
.kbc-source {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10.5px; padding: 2px 7px; border-radius: 4px; font-weight: 600; letter-spacing: .2px;
}
.kbc-source.pub { background: #DBEAFE; color: #1D4ED8; }
.kbc-source.prv-up { background: #FED7AA; color: #9A3412; }
.kbc-source.prv-ai { background: #EFF6FF; color: #2563EB; }
.kbc-lvl { font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 700; }
.kbc-lvl.l1 { background: #DBEAFE; color: #1D4ED8; }
.kbc-lvl.l2 { background: #FED7AA; color: #9A3412; }
.kbc-lvl.l3 { background: #EFF6FF; color: #2563EB; }
.kbc-status {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--gray-500); padding: 1px 7px; border-radius: 4px; background: var(--gray-50);
}
.kbc-status.processing { background: #EFF6FF; color: #2563EB; }
.kbc-status .spin {
  width: 8px; height: 8px; border-radius: 999px; background: currentColor;
  animation: kbc-pulse 1.4s infinite;
}
@keyframes kbc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }

/* 摘要 / 原文片段 / 底部统计 */
.kbc-summary { font-size: 13px; color: var(--gray-600); line-height: 1.55; margin: 8px 0; }
.kbc-snippet {
  background: var(--gray-50); border-left: 3px solid var(--brand-300);
  padding: 8px 10px; border-radius: 6px; font-size: 12px; color: var(--gray-600);
  margin-bottom: 10px; line-height: 1.5;
}
.kbc-footer {
  display: flex; align-items: center; gap: 14px;
  font-size: 11.5px; color: var(--gray-500); flex-wrap: wrap;
}
.kbc-footer .stat { display: inline-flex; align-items: center; gap: 4px; }
.kbc-footer .stat.hot { color: var(--brand-700); font-weight: 600; }
.kbc-footer .stat.warn { color: var(--warning); font-weight: 600; }
.kbc-footer .stat.zero { color: var(--gray-400); }
.kbc-footer .dot { color: var(--gray-300); }
.kbc-footer .tags { display: inline-flex; gap: 4px; flex-wrap: wrap; }
.kbc-tag { padding: 1px 6px; border-radius: 4px; font-size: 10.5px; background: var(--gray-100); color: var(--gray-600); }
</style>
