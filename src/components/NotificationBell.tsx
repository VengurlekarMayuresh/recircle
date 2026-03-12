"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, Package, CheckCircle, XCircle, Handshake, RefreshCw, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Notification {
  id: number
  userId: string
  type: string
  title: string
  body: string | null
  data: string
  read: boolean
  createdAt: string
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  new_request: <Package className="w-4 h-4 text-blue-500 shrink-0" />,
  request_accepted: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
  request_rejected: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  bargain_agreed: <Handshake className="w-4 h-4 text-emerald-500 shrink-0" />,
  transaction_update: <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />,
  dispute: <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />,
}

function getNotificationIcon(type: string) {
  return NOTIFICATION_ICONS[type] || <Info className="w-4 h-4 text-gray-400 shrink-0" />
}

function getNotificationLink(notification: Notification): string | null {
  try {
    const data = JSON.parse(notification.data)
    switch (notification.type) {
      case "new_request":
        return "/my-requests"
      case "request_accepted":
      case "request_rejected":
        return data.transactionId
          ? `/transactions/${data.transactionId}`
          : "/my-requests"
      case "bargain_agreed":
        return data.materialId
          ? `/dashboard/my-deals`
          : "/bargain"
      case "transaction_update":
        return data.transactionId
          ? `/transactions/${data.transactionId}`
          : "/dashboard/my-deals"
      default:
        return null
    }
  } catch {
    return null
  }
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

const POLL_INTERVAL = 30000 // 30 seconds

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=true")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch {
      // silently fail
    }
  }, [])

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const dismissNotification = async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {})
  }

  const markAllAsRead = async () => {
    setLoading(true)
    setNotifications([])
    await fetch("/api/notifications/mark-all-read", { method: "PATCH" }).catch(() => {})
    setLoading(false)
  }

  const handleNotificationClick = (notification: Notification) => {
    dismissNotification(notification.id)
    const link = getNotificationLink(notification)
    if (link) {
      setIsOpen(false)
      window.location.href = link
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-gray-500 hover:text-emerald-600 transition-colors"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchNotifications()
        }}
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-white">
            {notifications.length > 99 ? "99+" : notifications.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 bg-emerald-50/50"
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm truncate font-semibold text-gray-900">
                        {notification.title}
                      </p>
                      <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                    </div>
                    {notification.body && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
