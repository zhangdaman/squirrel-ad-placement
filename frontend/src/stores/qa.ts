/**
 * 智能问答全局态
 * - 当前会话 messages（user/ai 交替）
 * - 历史会话列表（时间分组 + 置顶 + 删除）
 * - 来源抽屉（当前打开的 source detail）
 * - ask 编排：service 取脚本 → useQaStream 流式灌入消息
 *
 * 状态归并集中在此 + composable；组件只读状态、触发 action。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  QaAnswerScript,
  QaFlow,
  QaMessage,
  QaSession,
  SourceDetail,
} from '@/types/qa'
import {
  fetchAnswerScript,
  fetchGrowthResult,
  fetchSessions,
  fetchSourceDetail,
} from '@/services/qa'
import { buildContextTurns, type ContextTurn } from '@/mocks/qa'
import { useQaStream } from '@/composables/useQaStream'

let uid = 0
const nextId = (p: string) => `${p}_${Date.now()}_${uid++}`

export const useQaStore = defineStore('qa', () => {
  /* ---------- 当前会话 ---------- */
  const messages = ref<QaMessage[]>([])
  /** 当前会话标题（toolbar 显示） */
  const currentTitle = ref('新对话')
  /** 当前激活的历史会话 id（null = 新对话未落历史） */
  const activeSessionId = ref<string | null>(null)

  /* ---------- 历史会话 ---------- */
  const sessions = ref<QaSession[]>([])
  /** 待删除确认中的会话 id（行内二次确认） */
  const confirmingDeleteId = ref<string | null>(null)

  /* ---------- 来源抽屉 ---------- */
  const sourceDrawerOpen = ref(false)
  const sourceLoading = ref(false)
  const currentSource = ref<SourceDetail | null>(null)
  /** 抽屉打开但来源无详情时的兜底提示 */
  const sourceMissingHint = ref('')

  /* ---------- 流式 ---------- */
  const stream = useQaStream()
  const isAnswering = computed(() => stream.running.value)

  /** 历史按分组聚合（置顶单独成组，置顶组优先） */
  const groupedSessions = computed(() => {
    const pinned = sessions.value.filter((s) => s.pinned)
    const today = sessions.value.filter((s) => !s.pinned && s.group === 'today')
    const yesterday = sessions.value.filter((s) => !s.pinned && s.group === 'yesterday')
    const week = sessions.value.filter((s) => !s.pinned && s.group === 'week')
    return { pinned, today, yesterday, week }
  })

  const hasMessages = computed(() => messages.value.length > 0)

  /* ============================================================
   * 历史会话
   * ============================================================ */
  async function loadSessions() {
    sessions.value = await fetchSessions()
  }

  /** 置顶 / 取消置顶（可逆操作 → 即时反馈，无需确认） */
  function togglePin(id: string) {
    const s = sessions.value.find((x) => x.id === id)
    if (s) s.pinned = !s.pinned
  }

  /** 进入删除确认态（行内二次确认） */
  function askDelete(id: string) {
    confirmingDeleteId.value = id
  }
  function cancelDelete() {
    confirmingDeleteId.value = null
  }
  /** 确认删除会话 */
  function confirmDelete(id: string) {
    sessions.value = sessions.value.filter((x) => x.id !== id)
    confirmingDeleteId.value = null
    if (activeSessionId.value === id) startNewChat()
  }

  /* ============================================================
   * 会话切换 / 新建
   * ============================================================ */

  /** 新建对话：清空当前消息，回到欢迎区 */
  function startNewChat() {
    stream.cancel()
    messages.value = []
    currentTitle.value = '新对话'
    activeSessionId.value = null
  }

  /** 切换到某历史会话：清空当前 → 用 seedQuestion 重放一轮问答 */
  async function openSession(id: string) {
    const s = sessions.value.find((x) => x.id === id)
    if (!s) return
    stream.cancel()
    messages.value = []
    activeSessionId.value = id
    currentTitle.value = s.title.replace(/^\[Mock\]\s*/, '')
    if (s.seedQuestion) {
      await ask(s.seedQuestion, { recordHistory: false })
    }
  }

  /* ============================================================
   * 提问 / 回答
   * ============================================================ */

  /**
   * 发送一个问题并流式产出回答。
   * @param question 用户问题
   * @param opts.forceFlow 显式 flow（follow-up 跳转用）
   * @param opts.recordHistory 是否在历史栏新增条目（默认 true；重放历史时 false）
   */
  async function ask(
    question: string,
    opts: { forceFlow?: QaFlow; recordHistory?: boolean } = {}
  ): Promise<void> {
    const text = question.trim()
    if (!text || isAnswering.value) return

    // push 用户消息
    messages.value.push({ id: nextId('u'), role: 'user', text })
    currentTitle.value = text.slice(0, 18)

    // 历史栏新增（仅首问、非重放时）
    if (opts.recordHistory !== false && !activeSessionId.value) {
      const sid = nextId('s')
      activeSessionId.value = sid
      sessions.value.unshift({
        id: sid,
        title: text.slice(0, 24),
        timeLabel: '刚刚',
        group: 'today',
        seedQuestion: text,
      })
    }

    // 特例：多轮上下文 flow → 一次铺多轮气泡（演示指代消解 / 话题切换）
    const flow = opts.forceFlow
    const script = await fetchAnswerScript({ question: text }, flow)
    if (flow === 'context' || script.intent.style === 'ASK-11') {
      // runContextDemo 自带第一轮 user 气泡，撤掉 ask 刚 push 的这条避免重复
      messages.value.pop()
      await runContextDemo()
      return
    }

    // 普通：流式灌入一个 ai 消息
    // 注意：push 后必须取数组里的「响应式代理」实例再交给 stream，
    // 否则对原始对象的 blocks 变更不会触发视图更新（卡在 typing 占位）。
    messages.value.push({ id: nextId('a'), role: 'ai', blocks: [], streaming: true })
    const aiMsg = messages.value[messages.value.length - 1]
    await stream.run(aiMsg, script)
  }

  /** follow-up / 边界按钮触发的下一个 flow（如「深入归因」→ review） */
  async function askFlow(flow: QaFlow, label: string) {
    await ask(label, { forceFlow: flow, recordHistory: false })
  }

  /** 起量 flow 第二轮：用户点了槽位选项后，追加「已填信息」+ 诊断结论 */
  async function answerGrowthSlots(summary: string) {
    if (isAnswering.value) return
    messages.value.push({ id: nextId('u'), role: 'user', text: summary })
    const script: QaAnswerScript = await fetchGrowthResult()
    messages.value.push({ id: nextId('a'), role: 'ai', blocks: [], streaming: true })
    const aiMsg = messages.value[messages.value.length - 1]
    await stream.run(aiMsg, script)
  }

  /** 多轮上下文演示：依次铺 4 轮（user + ai），ai 仍走流式 */
  async function runContextDemo() {
    const turns: ContextTurn[] = buildContextTurns()
    for (const turn of turns) {
      messages.value.push({ id: nextId('u'), role: 'user', text: turn.user })
      messages.value.push({ id: nextId('a'), role: 'ai', blocks: [], streaming: true })
      const aiMsg = messages.value[messages.value.length - 1]
      await stream.run(aiMsg, {
        intent: { intent: '多轮上下文', style: 'ASK-11' },
        blocks: turn.blocks,
      })
    }
  }

  /* ============================================================
   * 来源抽屉
   * ============================================================ */
  async function openSource(id: string, fallbackTitle = '') {
    sourceDrawerOpen.value = true
    sourceLoading.value = true
    sourceMissingHint.value = ''
    currentSource.value = null
    const detail = await fetchSourceDetail(id)
    sourceLoading.value = false
    if (detail) {
      currentSource.value = detail
    } else {
      sourceMissingHint.value = `该来源暂无详情：${fallbackTitle || id}`
    }
  }
  function closeSource() {
    sourceDrawerOpen.value = false
    currentSource.value = null
    sourceMissingHint.value = ''
  }

  return {
    // state
    messages,
    currentTitle,
    activeSessionId,
    sessions,
    confirmingDeleteId,
    sourceDrawerOpen,
    sourceLoading,
    currentSource,
    sourceMissingHint,
    // derived
    groupedSessions,
    hasMessages,
    isAnswering,
    streamPhase: stream.phase,
    streamSteps: stream.steps,
    // actions
    loadSessions,
    togglePin,
    askDelete,
    cancelDelete,
    confirmDelete,
    startNewChat,
    openSession,
    ask,
    askFlow,
    answerGrowthSlots,
    openSource,
    closeSource,
  }
})
