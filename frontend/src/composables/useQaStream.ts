/**
 * useQaStream —— 问答 SSE 流式消费（事件解析 / 归并集中在此，组件只消费状态）
 *
 * 设计（对齐 dev-standards 第 8.3 节「SSE 事件解析放在 composables」）：
 *   - 真实后端：POST /api/qa/ask 返回 text/event-stream（type: intent/step/chunk/source/done/error）。
 *   - Mock 阶段：service 给出 QaAnswerScript，本 composable 按
 *       intent → step(逐条) → chunk(逐块「打字」) → source → done
 *     的节奏用 setTimeout 模拟流式 push，归并进目标 QaMessage。
 *   - 组件不感知 Mock / 真实差异，只拿到一个随时间填充的 ai 消息。
 *
 * 注意：本项目 ask 为 POST + 流式，真实接入应走 fetch + ReadableStream（封装在此），
 *       不可用 EventSource（仅支持 GET）。当前 Mock 不实际发请求。
 */
import { ref } from 'vue'
import type { OutputBlock, QaAnswerScript, QaMessage } from '@/types/qa'

/** 流式状态机阶段 */
export type StreamPhase = 'idle' | 'thinking' | 'streaming' | 'done' | 'error'

export interface RunStreamHandlers {
  /** intent 解析完成（拿到样式 / 意图标签） */
  onIntent?: (script: QaAnswerScript) => void
  /** 每收到一条 step 过程文案 */
  onStep?: (step: string) => void
  /** 流结束（done） */
  onDone?: (msg: QaMessage) => void
}

/** 简易等待 */
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function useQaStream() {
  /** 当前流式阶段 */
  const phase = ref<StreamPhase>('idle')
  /** 过程 step 文案（thinking 阶段展示） */
  const steps = ref<string[]>([])
  /** 是否正在运行（禁用发送按钮等） */
  const running = ref(false)

  let cancelled = false

  /**
   * 把一个答案脚本「流式」灌入目标消息。
   * @param target 目标 ai 消息（reactive，由 store 持有）；本函数原地填充其 blocks / streaming
   * @param script 答案脚本
   */
  async function run(target: QaMessage, script: QaAnswerScript, handlers: RunStreamHandlers = {}) {
    cancelled = false
    running.value = true
    steps.value = []
    target.style = script.intent.style
    target.streaming = true
    // 起手：先放一个 typing 占位（ASK-14 加载动画）
    target.blocks = [{ kind: 'typing' }]

    // 1) intent
    phase.value = 'thinking'
    await wait(260)
    if (cancelled) return finish(target)
    handlers.onIntent?.(script)

    // 2) step（逐条过程，thinking 态）
    for (const s of script.steps ?? []) {
      if (cancelled) return finish(target)
      steps.value = [...steps.value, s]
      handlers.onStep?.(s)
      await wait(360)
    }

    // 3) chunk（逐块渲染最终 blocks，模拟「打字」逐步出现）
    phase.value = 'streaming'
    const out: OutputBlock[] = []
    target.blocks = out
    for (const block of script.blocks) {
      if (cancelled) return finish(target)
      out.push(block)
      // 触发响应式更新：替换数组引用
      target.blocks = [...out]
      await wait(blockDelay(block))
    }

    // 4) source 已含在 blocks（sources block）；done
    phase.value = 'done'
    finish(target)
    handlers.onDone?.(target)
  }

  /** 不同 block 的「出字」节奏：文本/卡片慢一点，小元素快一点 */
  function blockDelay(block: OutputBlock): number {
    switch (block.kind) {
      case 'text':
      case 'ansCard':
      case 'edgeCard':
      case 'recommendMulti':
        return 280
      case 'steps':
      case 'stepList':
      case 'dataCard':
      case 'priceGrid':
        return 220
      default:
        return 120
    }
  }

  function finish(target: QaMessage) {
    target.streaming = false
    running.value = false
    if (phase.value !== 'error') phase.value = 'done'
  }

  /** 取消当前流（切换会话 / 新建对话时） */
  function cancel() {
    cancelled = true
    running.value = false
    phase.value = 'idle'
  }

  return { phase, steps, running, run, cancel }
}
