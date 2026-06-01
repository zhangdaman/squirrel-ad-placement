/**
 * 知识库全局态
 * - 检索关键词 query + 5 个筛选 chip 的选中值 filters
 * - 列表 items / total / 选中卡片
 * - 详情抽屉（点卡片打开，取 chunk / 元数据 / 版本 / 赞踩）
 * - 赞 / 踩反馈（乐观更新 + service 落库）
 *
 * 状态归并集中在此；组件只读状态、触发 action。检索结果随 query / filters 变化自动重取。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  FilterKey,
  FilterState,
  KnowledgeCat,
  KnowledgeDetail,
  KnowledgeKpi,
  KnowledgeListItem,
  KnowledgeNavCounts,
  KnowledgeUploadPayload,
  FeedbackVote,
} from '@/types/knowledge'
import {
  searchKnowledge,
  fetchKnowledgeDetail,
  sendFeedback,
  fetchNavCounts,
  uploadKnowledge,
  stepUpload,
} from '@/services/knowledge'
import { mockKpis, mockFilters, defaultFilterState, filterDefMap, chipLabel } from '@/mocks/knowledge'

export const useKnowledgeStore = defineStore('knowledge', () => {
  /* ---------- 检索 + 筛选 ---------- */
  const query = ref('')
  const filters = ref<FilterState>(defaultFilterState())

  /** 5 个筛选 chip 定义（含下拉选项） */
  const filterDefs = ref(mockFilters())
  const defMap = filterDefMap()

  /* ---------- 列表 ---------- */
  const items = ref<KnowledgeListItem[]>([])
  const total = ref(0)
  const loading = ref(false)
  /** 当前选中卡片 id（列表高亮 + 抽屉联动） */
  const selectedId = ref<string | null>(null)

  /* ---------- 详情抽屉 ---------- */
  const drawerOpen = ref(false)
  const detailLoading = ref(false)
  const detail = ref<KnowledgeDetail | null>(null)

  /* ---------- KPI ---------- */
  const kpis = ref<KnowledgeKpi[]>(mockKpis())

  /* ---------- 左侧导航真实计数 + 当前分类 ---------- */
  const navCounts = ref<KnowledgeNavCounts>({
    all: 0,
    pub: 0,
    prv: 0,
    cats: { juliang: 0, cili: 0, tencent: 0, ticai: 0, chujia: 0, sucai: 0, pianhao: 0 },
  })
  /** 当前选中的导航分类（叶子），null = 全部 */
  const activeCat = ref<KnowledgeCat | null>(null)
  /** 上传处理中 */
  const uploading = ref(false)

  /** 各 chip 的展示文案（前缀 或「前缀：值」） */
  const chipLabels = computed<Record<FilterKey, string>>(() => {
    const out = {} as Record<FilterKey, string>
    for (const def of filterDefs.value) {
      out[def.key] = chipLabel(def, filters.value[def.key])
    }
    return out
  })

  /** 列表区统计副标题：命中率 >80% / 偏低 计数 */
  const listMeta = computed(() => {
    const high = items.value.filter((i) => i.hit_rate >= 0.8).length
    const low = items.value.filter((i) => i.hit_rate > 0 && i.hit_rate < 0.5).length
    return { high, low }
  })

  /* ============================================================
   * 检索
   * ============================================================ */
  async function search() {
    loading.value = true
    const data = await searchKnowledge(query.value, filters.value, 1, activeCat.value)
    items.value = data.items
    total.value = data.total
    loading.value = false
  }

  /** 加载左侧导航真实计数（与列表同源，杜绝写死注水数） */
  async function loadNavCounts() {
    navCounts.value = await fetchNavCounts()
  }

  /** 选中导航分类（再点同项 = 取消）并重新检索 */
  function setCat(cat: KnowledgeCat | null) {
    activeCat.value = activeCat.value === cat ? null : cat
    void search()
  }

  /** 「全部知识」：清空分类 + 关键词 + 筛选，回到全量 */
  function clearAll() {
    activeCat.value = null
    query.value = ''
    filters.value = {
      source: '',
      type: '',
      tag: '',
      hit_rate: '',
      sort: filters.value.sort || 'cited',
    }
    void search()
  }

  /** 更新关键词并重新检索 */
  function setQuery(v: string) {
    query.value = v
    void search()
  }

  /** 选中某筛选值（再点同值 = 取消）并重新检索 */
  function setFilter(key: FilterKey, value: string) {
    filters.value[key] = filters.value[key] === value ? '' : value
    void search()
  }

  /* ============================================================
   * 选中 + 详情抽屉
   * ============================================================ */
  async function openDetail(id: string) {
    selectedId.value = id
    drawerOpen.value = true
    detailLoading.value = true
    detail.value = null
    const d = await fetchKnowledgeDetail(id)
    detailLoading.value = false
    detail.value = d
  }

  function closeDetail() {
    drawerOpen.value = false
    selectedId.value = null
    detail.value = null
  }

  /* ============================================================
   * 赞 / 踩反馈（乐观更新当前详情计数 + 落库）
   * ============================================================ */
  async function vote(id: string, v: FeedbackVote) {
    // 乐观更新抽屉里的计数
    if (detail.value && detail.value.id === id) {
      if (v === 'up') detail.value.feedback.up += 1
      else detail.value.feedback.down += 1
    }
    const res = await sendFeedback(id, v)
    // 用服务端权威值回填（Mock 已 +1，避免重复，这里直接覆盖）
    if (res && detail.value && detail.value.id === id) {
      detail.value.feedback.up = res.up
      detail.value.feedback.down = res.down
    }
  }

  /* ============================================================
   * 私域文档上传（RAG pipeline：清洗 → 分块 → 元数据 → 标签 → 向量化）
   * ============================================================ */
  async function upload(payload: KnowledgeUploadPayload) {
    uploading.value = true
    const id = await uploadKnowledge(payload, Date.now())
    uploading.value = false
    // 新卡片以「处理中」插入列表首位，并刷新计数 / KPI
    await refreshAll()
    runPipeline(id)
  }

  /** 逐步推进上传处理流水线，每步刷新进度，完成后回填计数 / KPI */
  function runPipeline(id: string) {
    let step = 1
    const tick = async () => {
      const done = await stepUpload(id, step)
      await search()
      if (done) {
        await refreshAll()
        return
      }
      step += 1
      setTimeout(() => void tick(), 800)
    }
    setTimeout(() => void tick(), 800)
  }

  /** 列表 + 导航计数 + KPI 一并刷新（数据变更后统一调用） */
  async function refreshAll() {
    await Promise.all([search(), loadNavCounts()])
    kpis.value = mockKpis()
  }

  return {
    // state
    query,
    filters,
    filterDefs,
    items,
    total,
    loading,
    selectedId,
    drawerOpen,
    detailLoading,
    detail,
    kpis,
    // derived
    chipLabels,
    listMeta,
    defMap,
    // nav + upload state
    navCounts,
    activeCat,
    uploading,
    // actions
    search,
    setQuery,
    setFilter,
    openDetail,
    closeDetail,
    vote,
    loadNavCounts,
    setCat,
    clearAll,
    upload,
  }
})
