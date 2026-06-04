<script setup lang="ts">
/**
 * KnowledgePage —— 松鼠投放知识库页（FE-06）
 * 套在已有 AppShell 内（外壳不重做）。结构对齐 docs/prototypes/knowledge.html：
 *   顶部 KPI 头 → 主体（左分类导航 + 中检索/筛选/卡片列表）→ 右详情抽屉（按需）。
 * 检索框 + 5 个筛选 chip 真下拉（来源/类型/标签/命中率/排序）+ 知识卡片（chunk/引用/赞踩）。
 * 全程 Mock：store 经 service 取数；展示数据带 [Mock] 标识。
 */
import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { FilterKey, FeedbackVote, KnowledgeCat, KnowledgeUploadPayload } from '@/types/knowledge'
import KnowledgeCard from '@/components/knowledge/KnowledgeCard.vue'
import FilterChip from '@/components/knowledge/FilterChip.vue'
import KnowledgeDrawer from '@/components/knowledge/KnowledgeDrawer.vue'
import KnowledgeUpload from '@/components/knowledge/KnowledgeUpload.vue'
import { ICON_SEARCH, ICON_LIST, KPI_ICONS } from '@/components/knowledge/icons'

const kb = useKnowledgeStore()
const {
  query,
  filterDefs,
  filters,
  chipLabels,
  displayList,
  displayTotal,
  attention,
  loading,
  listMeta,
  selectedId,
  kpis,
  drawerOpen,
  detailLoading,
  detail,
} = storeToRefs(kb)

/** 当前展开下拉的 chip key（点同一个再点 = 收起；点其他切换；点外部关闭） */
const openChip = ref<FilterKey | null>(null)

/** 全局轻 toast */
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2000)
}

onMounted(() => {
  kb.search()
  kb.loadNavCounts()
})

/** 上传对话框开关 */
const uploadOpen = ref(false)
function onSubmitUpload(payload: KnowledgeUploadPayload) {
  kb.upload(payload)
  uploadOpen.value = false
  showToast(`「${payload.fileName}」已上传，进入处理流水线（清洗 → 分块 → 向量化）`)
}

function onSearchInput(e: Event) {
  kb.setQuery((e.target as HTMLInputElement).value)
}

function toggleChip(key: FilterKey) {
  openChip.value = openChip.value === key ? null : key
}
function onPick(key: FilterKey, value: string) {
  kb.setFilter(key, value)
  openChip.value = null
}
/** 点页面其他区域关闭所有下拉 */
function closeChips() {
  openChip.value = null
}

function onOpen(id: string) {
  kb.openDetail(id)
}
function onVote(payload: { id: string; vote: FeedbackVote }) {
  kb.vote(payload.id, payload.vote)
  showToast(payload.vote === 'up' ? '已记录：这条有帮助 👍' : '已记录：建议优化，感谢反馈')
}

/* —— 左侧分类导航（count 全部来自 store.navCounts 真实统计，点击按 cat 过滤）—— */
interface NavNode {
  type: 'group' | 'item'
  label: string
  count: number
  badge?: string
  badgeCls?: string
  layer?: string
  cat?: KnowledgeCat
}
const navTree = computed<NavNode[]>(() => {
  const c = kb.navCounts.cats
  return [
    /* L1 平台规则库 */
    { type: 'group', label: 'L1 平台规则库', badge: 'API', badgeCls: 'badge-pub', count: kb.navCounts.l1 },
    { type: 'item', layer: 'L1', label: '巨量引擎规则', count: c.juliang, cat: 'juliang' as KnowledgeCat },
    { type: 'item', layer: 'L1', label: '磁力金牛规则', count: c.cili, cat: 'cili' as KnowledgeCat },
    { type: 'item', layer: 'L1', label: '腾讯广告规则', count: c.tencent, cat: 'tencent' as KnowledgeCat },
    /* L2 公域经验库 */
    { type: 'group', label: 'L2 公域经验库', badge: '运营', badgeCls: 'badge-l2', count: kb.navCounts.l2 },
    { type: 'item', layer: 'L2', label: '行业基准', count: c.benchmark, cat: 'benchmark' as KnowledgeCat },
    { type: 'item', layer: 'L2', label: '拒审案例库', count: c.caselib, cat: 'caselib' as KnowledgeCat },
    /* L3 私域经验库 */
    { type: 'group', label: 'L3 私域经验库', badge: '上传', badgeCls: 'badge-prv', count: kb.navCounts.l3 },
    { type: 'item', layer: 'L3', label: '题材打法', count: c.ticai, cat: 'ticai' as KnowledgeCat },
    { type: 'item', layer: 'L3', label: '出价策略', count: c.chujia, cat: 'chujia' as KnowledgeCat },
    { type: 'item', layer: 'L3', label: '素材模板', count: c.sucai, cat: 'sucai' as KnowledgeCat },
    { type: 'item', layer: 'L3', label: '复盘报告', count: c.review, cat: 'review' as KnowledgeCat },
    { type: 'item', layer: 'L3', label: '审核经验', count: c.auditexp, cat: 'auditexp' as KnowledgeCat },
    { type: 'item', layer: 'L3', label: '群聊会议', count: c.meeting, cat: 'meeting' as KnowledgeCat },
    { type: 'item', layer: 'L3', label: '我的偏好', count: c.pianhao, cat: 'pianhao' as KnowledgeCat },
  ]
})

/** 当前左导航激活项（按 activeCat 联动） */
function navActive(n: { cat?: KnowledgeCat }): boolean {
  return n.cat ? kb.activeCat === n.cat : false
}
function onNav(n: { cat?: KnowledgeCat }) {
  if (n.cat) kb.setCat(n.cat)
}
function onNavAll() {
  kb.clearAll()
}
</script>

<template>
  <div :class="['kb-page', { 'drawer-open': drawerOpen }]" @click="closeChips">
    <!-- ============ 顶部 Header + KPI ============ -->
    <div class="kb-header">
      <div class="kb-header-row1">
        <div class="kb-title">
          私域 + 公域知识库管理
          <span class="kb-title-sub">私域沉淀 + 公域同步，持续供 AI 召回</span>
        </div>
        <button class="btn btn-primary kb-upload-btn" @click.stop="uploadOpen = true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          上传文档
        </button>
      </div>

      <div class="kb-kpi-row">
        <div
          v-for="k in kpis"
          :key="k.label"
          :class="['kb-kpi', { 'kb-kpi-act': k.trend === '需关注', active: k.trend === '需关注' && attention }]"
          :title="k.trend === '需关注' ? '点击筛选出零引用 / 待处理的知识' : ''"
          @click="k.trend === '需关注' && kb.toggleAttention()"
        >
          <div :class="['kb-kpi-icon', k.tone]" v-html="KPI_ICONS[k.tone]" />
          <div>
            <div class="label">{{ k.label }}</div>
            <div class="val">
              {{ k.value }}
              <span v-if="k.trend" :class="['trend', { warn: k.trendWarn }]">{{ k.trend }}</span>
            </div>
          </div>
        </div>
        <div class="kb-sync-note">
          最近一次公域同步<br />
          <span>10 分钟前 · 巨量引擎</span>
        </div>
      </div>
    </div>

    <!-- ============ 主体：双栏 ============ -->
    <div class="kb-body">
      <!-- 左：分类导航 -->
      <aside class="kb-side">
        <div class="kb-side-section">
          <div class="kb-nav-root" :class="{ active: kb.activeCat === null }" @click="onNavAll">
            全部知识 <span class="cnt">{{ kb.navCounts.all }}</span>
          </div>
        </div>
        <template v-for="(n, i) in navTree" :key="i">
          <div v-if="n.type === 'group'" class="kb-side-section kb-group-wrap">
            <div class="kb-group">
              {{ n.label }}
              <span :class="['badge-source', n.badgeCls]">{{ n.badge }}</span>
              <span class="cnt">{{ n.count }}</span>
            </div>
          </div>
          <div
            v-else
            class="kb-nav-sub"
          >
            <div :class="['kb-nav-item', { active: navActive(n) }]" @click="onNav(n)">
              <span :class="['lvl', n.layer?.toLowerCase()]">{{ n.layer }}</span>
              <span class="lbl">{{ n.label }}</span>
              <span class="cnt">{{ n.count }}</span>
            </div>
          </div>
        </template>
      </aside>

      <!-- 中：检索 + 筛选 + 列表 -->
      <section class="kb-main">
        <!-- 筛选条 -->
        <div class="kb-filterbar">
          <div class="kb-search">
            <span class="kb-search-ico" v-html="ICON_SEARCH" />
            <input
              :value="query"
              placeholder="搜索知识、规则、案例 …"
              @input="onSearchInput"
            />
            <span class="kbd">⌘K</span>
          </div>

          <!-- 5 个筛选 chip 真下拉 -->
          <FilterChip
            v-for="def in filterDefs"
            :key="def.key"
            :def="def"
            :value="filters[def.key]"
            :label="chipLabels[def.key]"
            :open="openChip === def.key"
            @toggle="toggleChip(def.key)"
            @pick="(v: string) => onPick(def.key, v)"
          />

          <div class="kb-view-toggle">
            <button class="active" title="列表视图" v-html="ICON_LIST" />
          </div>
        </div>

        <!-- 列表 -->
        <div class="kb-list-wrap">
          <div class="kb-list-meta">
            <span v-if="attention" class="kb-att-tag">⚠ 需关注 · 零引用 / 待处理</span>
            <span>共 <span class="selected">{{ displayTotal }} 条</span></span>
            <template v-if="displayList.length">
              <span class="dot">·</span>
              <span>{{ listMeta.high }} 条命中率 &gt;80% · {{ listMeta.low }} 条命中率偏低</span>
            </template>
            <span v-if="attention" class="kb-att-clear" @click="kb.exitAttention()">退出筛选 ✕</span>
          </div>

          <div v-if="loading && !displayList.length" class="kb-empty">检索中…</div>
          <div v-else-if="!displayList.length" class="kb-empty">{{ attention ? '当前没有需关注的知识 🎉' : '没有符合条件的知识，试试调整筛选条件' }}</div>

          <div v-else class="kb-list">
            <KnowledgeCard
              v-for="it in displayList"
              :key="it.id"
              :item="it"
              :selected="selectedId === it.id"
              @open="onOpen"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- ============ 右侧详情抽屉 ============ -->
    <KnowledgeDrawer
      :open="drawerOpen"
      :loading="detailLoading"
      :detail="detail"
      @close="kb.closeDetail"
      @vote="onVote"
      @toast="showToast"
    />

    <!-- ============ 上传文档对话框 ============ -->
    <KnowledgeUpload
      :open="uploadOpen"
      :uploading="kb.uploading"
      @close="uploadOpen = false"
      @submit="onSubmitUpload"
    />

    <!-- 轻 toast -->
    <Transition name="fade">
      <div v-if="toast" class="kb-toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.kbd { padding: 1px 6px; background: #fff; border: 1px solid var(--border-base); border-radius: 4px; font-size: 11px; color: var(--gray-500); }
.kb-upload-btn { flex-shrink: 0; }
/* ===== 知识库页 · 双栏 + 详情抽屉 ===== */
.kb-page { display: flex; flex-direction: column; height: calc(100vh - var(--topbar-h)); }
/* —— 顶部 page-header 紧凑型 —— */
.kb-header { background: #fff;
  border-bottom: 1px solid var(--border-base);
  padding: 16px 24px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px; }
.kb-header-row1 { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.kb-title { font-size: 18px; font-weight: 700; color: var(--gray-900); display: flex; align-items: center; gap: 10px; }
.kb-title .kb-title-sub { font-size: 12px; color: var(--gray-500); font-weight: 400; }
/* —— KPI 行 —— */
.kb-kpi-row { display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
  gap: 14px;
  align-items: center; }
.kb-kpi { background: var(--gray-50);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px; }
.kb-kpi-icon { width: 32px; height: 32px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; }
.kb-kpi-icon.b { background: var(--brand-50); color: var(--brand-600); }
.kb-kpi-icon.o { background: var(--accent-orange-bg); color: var(--accent-orange); }
.kb-kpi-icon.g { background: var(--success-bg); color: var(--success); }
.kb-kpi-icon.r { background: var(--danger-bg); color: var(--danger); }
.kb-kpi .label { font-size: 11px; color: var(--gray-500); }
.kb-kpi .val { font-size: 20px; font-weight: 700; color: var(--gray-900); line-height: 1.2; }
.kb-kpi .trend { font-size: 11px; color: var(--success); margin-left: 6px; }
.kb-kpi .trend.warn { color: var(--warning); }
.kb-kpi-act { cursor: pointer; transition: background .15s, box-shadow .15s; }
.kb-kpi-act:hover { background: #f1f5f9; }
.kb-kpi.active { background: var(--danger-bg); box-shadow: inset 0 0 0 1px var(--danger); }
.kb-att-tag { color: var(--warning); font-weight: 600; }
.kb-att-clear { margin-left: 10px; color: var(--brand-600); cursor: pointer; font-size: 12px; }
.kb-att-clear:hover { text-decoration: underline; }
/* —— 主体双栏 —— */
.kb-body { flex: 1; display: grid; grid-template-columns: 240px 1fr; gap: 0; overflow: hidden; }
/* —— 左侧分类导航 —— */
.kb-side { background: #fff;
  border-right: 1px solid var(--border-base);
  padding: 14px 8px;
  overflow-y: auto; }
.kb-side-section { margin-bottom: 14px; }
.kb-side-title { padding: 6px 12px 6px;
  font-size: 11px;
  color: var(--gray-400);
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase; }
.kb-nav-item { display: flex; align-items: center; gap: 8px;
  padding: 7px 12px;
  font-size: 13px;
  color: var(--gray-700);
  border-radius: 7px;
  margin-bottom: 1px;
  cursor: pointer;
  transition: background 0.12s;
  position: relative; }
.kb-nav-item:hover { background: var(--gray-50); }
.kb-nav-item.active { background: var(--brand-50); color: var(--brand-700); font-weight: 600; }
.kb-nav-item.active::before { content: "";
  position: absolute;
  left: 0; top: 6px; bottom: 6px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--brand-600); }
.kb-nav-item .lbl { flex: 1; }
.kb-nav-item .cnt { font-size: 11px; color: var(--gray-400); }
.kb-nav-item.active .cnt { color: var(--brand-600); }
/* 顶级（全部） */
.kb-nav-root { display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-900);
  border-radius: 7px;
  cursor: pointer;
  margin-bottom: 4px; }
.kb-nav-root.active { background: var(--brand-50); color: var(--brand-700); }
.kb-nav-root .cnt { margin-left: auto; font-size: 12px; font-weight: 600; color: var(--gray-500); }
.kb-nav-root.active .cnt { color: var(--brand-600); }
/* 公域/私域分组头 */
.kb-group { display: flex; align-items: center; gap: 6px;
  padding: 9px 12px 6px;
  font-size: 12px;
  color: var(--gray-800);
  font-weight: 600; }
.kb-group .badge-source { font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600; }
.kb-group .badge-pub { background: #DBEAFE; color: #1D4ED8; }
.kb-group .badge-l2  { background: #D1FAE5; color: #065F46; }
.kb-group .badge-prv { background: #FED7AA; color: #9A3412; }
.kb-group .cnt { margin-left: auto; font-size: 11px; color: var(--gray-400); font-weight: 500; }
.kb-nav-sub .kb-nav-item { font-size: 12.5px; padding: 6px 10px 6px 14px; }
.kb-nav-sub .kb-nav-item .lvl { font-size: 9.5px;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
  margin-right: 2px; }
.kb-nav-sub .kb-nav-item .lvl.l1 { background: #DBEAFE; color: #1D4ED8; }
.kb-nav-sub .kb-nav-item .lvl.l2 { background: #D1FAE5; color: #065F46; }
.kb-nav-sub .kb-nav-item .lvl.l3 { background: #FED7AA; color: #9A3412; }
.kb-smart-item .cnt { margin-left: auto;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  font-weight: 600; }
.kb-smart-item .cnt.warn { background: var(--warning-bg); color: var(--warning); }
.kb-smart-item .cnt.danger { background: var(--danger-bg); color: var(--danger); }
.kb-smart-item .cnt.info { background: var(--info-bg); color: var(--info); }
/* —— 中间主区 —— */
.kb-main { display: flex; flex-direction: column;
  overflow: hidden;
  background: var(--bg-page); }
/* 筛选条 */
.kb-filterbar { padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid var(--border-base);
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap; }
.kb-search { flex: 1; min-width: 240px;
  height: 32px;
  background: var(--gray-50);
  border: 1px solid var(--border-base);
  border-radius: 7px;
  padding: 0 10px;
  display: flex; align-items: center; gap: 8px; }
.kb-search input { flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: var(--gray-800); }
.kb-search input::placeholder { color: var(--gray-400); }
.kb-search .kbd { font-size: 10px; color: var(--gray-400); padding: 1px 5px; border: 1px solid var(--border-base); border-radius: 4px; background: #fff; }
.kb-view-toggle { display: flex;
  background: var(--gray-100);
  border-radius: 6px;
  padding: 2px; }
.kb-view-toggle button { width: 28px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  color: var(--gray-500); }
.kb-view-toggle button.active { background: #fff; color: var(--brand-700); box-shadow: var(--shadow-xs); }
/* 列表区 */
.kb-list-wrap { flex: 1; overflow-y: auto; padding: 16px 20px; }
.kb-list-meta { font-size: 12px; color: var(--gray-500); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.kb-list-meta .selected { color: var(--brand-700); font-weight: 600; }
.kb-list { display: flex; flex-direction: column; gap: 10px; }
.kbc.selected { border-color: var(--brand-500); background: #FAFCFF; box-shadow: 0 0 0 3px rgba(59, 106, 238, 0.08); }
.drawer-tab .cnt { font-size: 11px; margin-left: 4px; color: var(--gray-400); }
.drawer-tab.active .cnt { color: var(--brand-600); }
/* 选中卡片时主区右边空出抽屉宽度 */
.kb-page.drawer-open .kb-main { padding-right: 0; }
/* —— Toast —— */
.kb-toast { position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--gray-900);
  color: #fff;
  padding: 10px 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  animation: toast-in 0.25s ease; }
.kb-toast.hidden { display: none; }
/* —— 补充：原型未单独定义的 class —— */
.kb-sync-note { margin-left: auto; font-size: 11px; color: var(--gray-400); text-align: right; line-height: 1.5; }
.kb-sync-note span { color: var(--gray-600); font-weight: 500; }
.kb-group-wrap { margin-top: 10px; }
.kb-search-ico { display: inline-flex; align-items: center; color: var(--gray-400); flex-shrink: 0; }
.kb-empty { padding: 40px 20px; text-align: center; color: var(--gray-400); font-size: 13px; }

</style>
