<script setup lang="ts">
/**
 * QaPage —— 智能问答页（默认首页）
 * 套在已有 AppShell 内（外壳不重做）。三区：
 *   左 HistoryList（历史会话）｜ 中 ChatStream（对话流）+ 底 QaInput（输入）｜ 右 SourceDrawer（来源抽屉，按需弹出）
 * 全程 Mock：service 取脚本 → useQaStream 流式渲染；视频 / 图片在 QaInput 拦截不调后端。
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useQaStore } from '@/stores/qa'
import { useAuthStore } from '@/stores/auth'
import type { EdgeAction, QaFlow, SourceRef } from '@/types/qa'
import HistoryList from '@/components/qa/HistoryList.vue'
import ChatStream from '@/components/qa/ChatStream.vue'
import QaInput from '@/components/qa/QaInput.vue'
import SourceDrawer from '@/components/qa/SourceDrawer.vue'

const router = useRouter()
const qa = useQaStore()
const auth = useAuthStore()
const {
  messages,
  currentTitle,
  activeSessionId,
  confirmingDeleteId,
  groupedSessions,
  isAnswering,
  sourceDrawerOpen,
  sourceLoading,
  currentSource,
  sourceMissingHint,
} = storeToRefs(qa)

/** 历史栏折叠态 */
const historyCollapsed = ref(false)

/** 全局轻 toast */
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2000)
}

const userName = ref('investor')

onMounted(async () => {
  await qa.loadSessions()
  // 头像名取当前登录用户（去 [Mock] 前缀）
  userName.value = (auth.user?.name || '同学').replace(/^\[Mock\]\s*/, '')
})

/* ---------- 发送 / 场景 / 边界 ---------- */
function onSend(text: string) {
  qa.ask(text)
}
function onScene(flow: QaFlow) {
  // 欢迎区场景卡 → 直接以该 flow 的典型问题发起
  qa.askFlow(flow, sceneQuestion(flow))
}
function onEdge(flow: QaFlow) {
  qa.askFlow(flow, sceneQuestion(flow))
}

/** 各 flow 的典型提问（点卡片 / chip 时作为用户问题展示） */
function sceneQuestion(flow: QaFlow): string {
  const map: Partial<Record<QaFlow, string>> = {
    bid: '现言短剧巨量引擎 OCPM 起量出价多少？',
    reject: '我们做了一段短剧素材，前 5 秒有"追凶"对白，能过审吗？',
    review: 'A001 户今天 ROI 比昨天掉了 30%，帮我分析下原因',
    growth: 'A005 户的计划学习了一天还学不出来，怎么办？',
    data: '今天 A001 户消耗多少？ROI 怎么样？',
    knowledge: '巨量审核规则 4.1 条具体说什么？',
    guide: '快手磁力短剧定向怎么设置？',
    cross_platform: '为什么我的素材巨量过了，广点通却被拒？',
    reject_trend: '最近审核是不是变严了？我们拒审越来越多',
    account_diag: '我的账户为什么被限流了，消耗跑不出去',
    targeting: '现言短剧定向应该放宽还是收紧？人群包怎么选？',
    creative: '什么类型的素材比较容易起量？口播还是剪辑好？',
    budget: '日预算怎么分配合理？什么时段投效果最好？',
    shutdown: '这周已经亏了十几万，到底该不该止损关计划？',
    report_gen: '帮我生成本周投放周报，把亮点和问题都总结一下',
    material_rank: '最近哪条素材跑得最好？帮我做个素材排行',
    strategy_review: '上周调了出价之后，效果怎么样？',
    material_diag: 'M789 为什么跑不动了？CTR 越来越低',
    vague: '帮我看看',
    context: 'A001 现在 ROI 怎么样？',
    unknown: '广点通视频号的分成政策是怎样的？',
    refuse: '帮我想个能绕过审核的擦边素材创意',
    confirm: '把 A001 所有计划都暂停',
    video: '这条短剧视频帮我看下能不能过审',
    error: '帮我分析 A001 这周的消耗趋势',
  }
  return map[flow] || '帮我看看'
}

/* ---------- 消息内交互 ---------- */
function onSource(ref: SourceRef) {
  qa.openSource(ref.id, ref.title)
}
/** 对 AI 这次引用的知识反馈（有帮助 / 没帮助），沉淀到知识召回质量 */
function onSourceFeedback(vote: 'up' | 'down') {
  showToast(
    vote === 'up'
      ? '已记录：这条引用有帮助，将强化该知识的召回'
      : '已记录：这条引用没帮助，该知识将进入待优化复审',
  )
  qa.closeSource()
}
function onFollow(label: string, flow?: QaFlow) {
  if (flow) qa.askFlow(flow, label)
  else showToast(`继续追问：${label}`)
}
function onSlots(summary: string) {
  qa.answerGrowthSlots(summary)
}
function onMeta(kind: 'adopt' | 'dislike' | 'retry') {
  if (kind === 'adopt') showToast('已采纳，沉淀到团队知识库（L2）')
  else if (kind === 'dislike') showToast('感谢反馈，AI 将基于你的意见持续优化')
  else showToast('AI 正在重新理解')
}
function onExec(label: string) {
  showToast(`${label} —— 已加入执行队列，预计 4 小时内完成`)
}

/** 边界卡 / 跳页按钮 */
function onAction(action: EdgeAction) {
  if (action.nextFlow) {
    qa.askFlow(action.nextFlow, action.label)
    return
  }
  if (action.goto) {
    router.push(action.goto)
    return
  }
  if (action.toast) showToast(action.toast)
}

/* ---------- 历史会话 ---------- */
function onOpenSession(id: string) {
  qa.openSession(id)
}
function onNewChat() {
  qa.startNewChat()
  showToast('已开启新对话')
}

/* ---------- 视频 / 图片拦截 ---------- */
function onGuard(kind: 'video' | 'image') {
  // 不调后端：在对话流里直接给「兜底」AI 回复（ASK-15 视频 / 图片转文字·人工）
  qa.askFlow('video', kind === 'video' ? '这条短剧视频帮我看下能不能过审' : '这张素材图帮我看下能不能过审')
  showToast(kind === 'video' ? '暂不支持视频，已转文字 / 人工引导' : '暂不支持图片，已转文字 / 人工引导')
}
</script>

<template>
  <div :class="['qa-layout', { 'history-collapsed': historyCollapsed }]">
    <!-- 左：历史 -->
    <HistoryList
      :grouped="groupedSessions"
      :active-id="activeSessionId"
      :confirming-id="confirmingDeleteId"
      :collapsed="historyCollapsed"
      @new="onNewChat"
      @open="onOpenSession"
      @pin="qa.togglePin"
      @ask-delete="qa.askDelete"
      @confirm-delete="qa.confirmDelete"
      @cancel-delete="qa.cancelDelete"
      @toggle="historyCollapsed = !historyCollapsed"
    />

    <!-- 中：对话主区 -->
    <main class="qa-main">
      <div class="qa-toolbar">
        <div class="qa-toolbar-title">{{ currentTitle }}</div>
        <div class="qa-toolbar-flex" />
      </div>

      <ChatStream
        :messages="messages"
        :user-name="userName"
        :stream-phase="qa.streamPhase"
        :stream-steps="qa.streamSteps"
        @scene="onScene"
        @edge="onEdge"
        @source="onSource"
        @follow="onFollow"
        @action="onAction"
        @slots="onSlots"
        @meta="onMeta"
        @exec="onExec"
      />

      <QaInput :disabled="isAnswering" @send="onSend" @toast="showToast" @guard="onGuard" />
    </main>

    <!-- 右：来源抽屉（按需弹出） -->
    <SourceDrawer
      :open="sourceDrawerOpen"
      :loading="sourceLoading"
      :detail="currentSource"
      :missing-hint="sourceMissingHint"
      @close="qa.closeSource"
      @go-knowledge="() => { qa.closeSource(); router.push('/knowledge') }"
      @feedback="onSourceFeedback"
    />

    <!-- 轻 toast -->
    <Transition name="fade">
      <div v-if="toast" class="qa-toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.qa-toolbar-flex { flex: 1; }
.qa-mock-badge { margin-left: 10px; }
</style>
