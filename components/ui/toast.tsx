'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  CheckCircle, AlertCircle, 
  Info, AlertTriangle, X
} from 'lucide-react'
import { Toast as ToastType } from '@/contexts/toast-context'
import { useToastContext } from '@/contexts/toast-context'

interface ToastProps {
  toast: ToastType
}

export function Toast({ toast }: ToastProps) {
  const { dismiss } = useToastContext()
  
  const statusIcon = {
    success: <CheckCircle className="w-6 h-6 text-green-500 animate-bounce" />,
    error: <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />,
    info: <Info className="w-6 h-6 text-blue-500 animate-bounce" />,
  }
  
  const icon = toast.status ? statusIcon[toast.status] : null
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3, ease: "easeOut" } }}
      className={cn(
        "relative flex w-full max-w-md overflow-hidden rounded-xl shadow-2xl backdrop-blur-sm",
        "border-2 p-4 pr-12 transition-all duration-300 hover:shadow-xl",
        toast.status === "success" && "border-green-500 bg-green-100/90 dark:bg-green-900/90 text-green-900 dark:text-green-100",
        toast.status === "error" && "border-red-500 bg-red-100/90 dark:bg-red-900/90 text-red-900 dark:text-red-100",
        toast.status === "warning" && "border-amber-500 bg-amber-100/90 dark:bg-amber-900/90 text-amber-900 dark:text-amber-100",
        toast.status === "info" && "border-blue-500 bg-blue-100/90 dark:bg-blue-900/90 text-blue-900 dark:text-blue-100",
        !toast.status && "border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90"
      )}
    >
      <div className="flex gap-4 w-full">
        {icon && (
          <div className="flex-shrink-0 self-start pt-0.5 transition-transform duration-200 hover:scale-110">
            {icon}
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="font-semibold text-lg leading-tight tracking-tight">
            {toast.title}
          </div>
          {toast.description && (
            <div className="text-sm opacity-90 font-medium leading-relaxed">
              {toast.description}
            </div>
          )}
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={toast.action.onClick}
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold 
                  ring-offset-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 
                  focus-visible:ring-offset-2 disabled:opacity-50 h-10 rounded-lg px-4 
                  bg-primary/90 text-primary-foreground hover:bg-primary hover:scale-105 
                  active:scale-95 shadow-md hover:shadow-lg"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        className="absolute right-2 top-2 rounded-full p-1.5 backdrop-blur-sm bg-black/5 
          dark:bg-white/10 transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/20 
          hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}
