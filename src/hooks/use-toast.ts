import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 3000 // 3초

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  duration?: number
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string, delay: number = TOAST_REMOVE_DELAY) => {
  // 기존 타이머가 있으면 제거
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId))
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, delay)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // DISMISS_TOAST는 open을 false로 설정하고, 애니메이션 완료 후 REMOVE
      // Radix UI의 애니메이션 시간을 고려하여 약간의 딜레이 후 제거
      if (toastId) {
        // 애니메이션 완료를 위한 딜레이 (애니메이션이 끝난 후 제거)
        setTimeout(() => {
          dispatch({ type: "REMOVE_TOAST", toastId: toastId })
        }, 200) // 애니메이션 완료 대기
      } else {
        state.toasts.forEach((toast) => {
          setTimeout(() => {
            dispatch({ type: "REMOVE_TOAST", toastId: toast.id })
          }, 200)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ duration, ...props }: Toast & { duration?: number }) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => {
    // 타이머 정리
    if (toastTimeouts.has(id)) {
      clearTimeout(toastTimeouts.get(id))
      toastTimeouts.delete(id)
    }
    dispatch({ type: "DISMISS_TOAST", toastId: id })
  }

  // duration이 지정되지 않으면 기본값 사용 (밀리초 단위)
  const toastDuration = duration ?? TOAST_REMOVE_DELAY

  // 디버깅: duration 확인
  console.log('[Toast] Creating toast with duration:', toastDuration, 'ms', 'props:', { title: props.title, variant: props.variant })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      duration: toastDuration, // Radix UI Toast에 전달될 duration (밀리초)
      onOpenChange: (open) => {
        if (!open) {
          // 사용자가 수동으로 닫을 때만 처리
          // 자동 닫기는 우리가 설정한 타이머가 처리
          console.log('[Toast] onOpenChange(false) called for toast:', id)
          dispatch({ type: "DISMISS_TOAST", toastId: id })
        }
      },
    },
  })

  // 우리가 직접 타이머를 설정하여 duration 후에 자동으로 닫기
  // Radix UI의 duration에 의존하지 않고, 우리가 직접 제어
  // 기존 타이머가 있으면 먼저 제거 (중복 방지)
  if (toastTimeouts.has(id)) {
    clearTimeout(toastTimeouts.get(id))
  }
  
  const timeout = setTimeout(() => {
    console.log('[Toast] Auto-dismissing toast after', toastDuration, 'ms:', id)
    if (toastTimeouts.has(id)) {
      toastTimeouts.delete(id)
    }
    dispatch({ type: "DISMISS_TOAST", toastId: id })
  }, toastDuration)

  toastTimeouts.set(id, timeout)
  console.log('[Toast] Timer set for toast:', id, 'duration:', toastDuration, 'ms', 'variant:', props.variant)

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

