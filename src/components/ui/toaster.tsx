"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider 
      swipeDirection="right"
    >
      {toasts.map(function ({ id, title, description, action, duration, ...props }) {
        // duration을 Infinity로 설정하여 Radix UI가 자동으로 닫지 않도록 함
        // 우리가 직접 타이머로 제어하므로 Radix UI의 duration은 비활성화
        return (
          <Toast 
            key={id} 
            duration={Infinity}
            {...props}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

