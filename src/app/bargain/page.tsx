"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Send, Loader2, IndianRupee, CheckCircle, XCircle, MessageSquare,
  ArrowRight, ArrowLeft, Sparkles, Search, Package, Clock,
  ShoppingBag, Eye, MapPin, Filter,
} from "lucide-react"

// ── Types ───────────────────────────────────────────────
interface ConversationItem {
  sessionId: string
  role: "buyer" | "seller"
  isBuyer: boolean
  isSeller: boolean
  status: string
  material: {
    id: number
    title: string
    price: number
    city: string
    condition: string
    image: string | null
    materialStatus: string
  }
  counterparty: { id: string; name: string; avatarUrl: string | null; city: string | null }
  askingPrice: number
  agreedPrice: number | null
  messageCount: number
  lastMessage: string
  lastMessageTime: string
  createdAt: string
  updatedAt: string
}

interface ThreadMessage {
  role: "buyer" | "assistant" | "seller"
  content: string
  metadata?: { currentOffer?: number; tactic?: string } | null
  createdAt: string
}

interface ThreadData {
  sessionId: string
  materialId: number
  isBuyer: boolean
  isSeller: boolean
  status: string
  askingPrice: number
  agreedPrice: number | null
  material: { id: number; title: string; price: number; city: string; condition: string; image: string | null; materialStatus: string }
  counterparty: { id: string; name: string; avatarUrl: string | null; city: string | null }
  sellerName: string
  negotiationStyle: string
  messages: ThreadMessage[]
}

const STATUS_BADGE: Record<string, { bg: string; label: string }> = {
  active: { bg: "bg-blue-100 text-blue-700", label: "Active" },
  agreed: { bg: "bg-emerald-100 text-emerald-700", label: "Agreed" },
  rejected: { bg: "bg-red-100 text-red-700", label: "Rejected" },
  closed: { bg: "bg-gray-100 text-gray-600", label: "Closed" },
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200"

// ── Helpers ─────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function dateSeparator(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

// ── Main Component ──────────────────────────────────────
export default function BargainInboxPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <BargainInboxContent />
    </Suspense>
  )
}

function BargainInboxContent() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [thread, setThread] = useState<ThreadData | null>(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "agreed" | "closed">("all")
  const [search, setSearch] = useState("")
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const [startingNew, setStartingNew] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

  // Auth guard
  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login")
  }, [authStatus, router])

  // Load conversation list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/bargain/sessions")
      if (res.ok) {
        const data = await res.json()
        setConversations(Array.isArray(data) ? data : [])
      }
    } catch {
      console.error("Failed to load conversations")
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Handle deep-link: ?sessionId= or ?materialId=
  useEffect(() => {
    if (loadingList) return

    const paramSessionId = searchParams.get("sessionId")
    const paramMaterialId = searchParams.get("materialId")
    const paramStreamId = searchParams.get("streamId")
    const paramSupplierId = searchParams.get("supplierId")
    const paramWantId = searchParams.get("wantId")
    const paramIntent = searchParams.get("intent")

    if (paramSessionId) {
      openThread(paramSessionId)
    } else if (paramIntent === "waste_stream" && paramStreamId && paramSupplierId) {
      startSessionFromStream(paramStreamId, paramSupplierId)
    } else if (paramIntent === "want_request" && paramWantId) {
      startSessionFromWant(paramWantId)
    } else if (paramMaterialId) {
      // Find existing session for this material, or start new one
      const existing = conversations.find(
        (c) => c.material.id === parseInt(paramMaterialId) && c.isBuyer
      )
      if (existing) {
        openThread(existing.sessionId)
      } else {
        startNewSession(parseInt(paramMaterialId))
      }
    }
  }, [loadingList, searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load thread messages
  const openThread = async (sessionId: string) => {
    setActiveSessionId(sessionId)
    setMobileShowThread(true)
    setLoadingThread(true)
    setError("")
    try {
      const res = await fetch(`/api/bargain/${sessionId}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.message || "Failed to load conversation")
        setLoadingThread(false)
        return
      }
      const data: ThreadData = await res.json()
      setThread(data)
    } catch {
      setError("Failed to load conversation")
    } finally {
      setLoadingThread(false)
    }
  }

  // Start new bargain session from materialId
  const startNewSession = async (materialId: number) => {
    setStartingNew(true)
    setMobileShowThread(true)
    setError("")
    try {
      const res = await fetch("/api/bargain/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || "Failed to start negotiation")
        setStartingNew(false)
        return
      }
      // Reload conversations then open the new one
      await fetchConversations()
      openThread(data.sessionId)
    } catch {
      setError("Failed to start negotiation")
    } finally {
      setStartingNew(false)
    }
  }

  // Start chat from a Waste Stream
  const startSessionFromStream = async (streamId: string, supplierId: string) => {
    setStartingNew(true)
    setMobileShowThread(true)
    setError("")
    try {
      const res = await fetch("/api/bargain/start-from-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId, supplierId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || "Failed to start chat with supplier")
        setStartingNew(false)
        return
      }
      // Reload list and open the new thread
      await fetchConversations()
      openThread(data.sessionId)
    } catch {
      setError("Failed to connect to supplier")
    } finally {
      setStartingNew(false)
    }
  }

  // Start chat from a Want Request
  const startSessionFromWant = async (wantId: string) => {
    setStartingNew(true)
    setMobileShowThread(true)
    setError("")
    try {
      const res = await fetch("/api/bargain/start-from-want", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wantId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || "Failed to start chat with requester")
        setStartingNew(false)
        return
      }
      // Reload list and open the new thread
      await fetchConversations()
      openThread(data.sessionId)
    } catch {
      setError("Failed to connect to requester")
    } finally {
      setStartingNew(false)
    }
  }

  // Scroll on new messages
  useEffect(() => { scrollToBottom() }, [thread?.messages])

  // Polling: keep conversations and active thread in sync for both buyer and seller
  useEffect(() => {
    const interval = setInterval(async () => {
      fetchConversations()
      // Silently refresh active thread (e.g. seller sees status change)
      if (activeSessionId && !sending) {
        try {
          const res = await fetch(`/api/bargain/${activeSessionId}`)
          if (res.ok) {
            const data: ThreadData = await res.json()
            setThread((prev) => {
              if (!prev) return data
              // Only update if status, messages, or agreedPrice changed
              if (
                prev.status !== data.status ||
                prev.messages.length !== data.messages.length ||
                prev.agreedPrice !== data.agreedPrice
              ) {
                return data
              }
              return prev
            })
          }
        } catch { /* silent */ }
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [activeSessionId, sending, fetchConversations])

  // Send message (buyer only, active sessions only)
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || !activeSessionId || sending) return
    
    // Allow if active and user is either buyer or seller
    const canUserSend = thread?.status === "active" && (thread.isBuyer || thread.isSeller)
    if (!canUserSend) return

    setInput("")
    setError("")

    // Optimistic update
    const role = thread.isBuyer ? "buyer" : "seller"
    const myMsg: ThreadMessage = { role, content: text, createdAt: new Date().toISOString() }
    setThread((prev) => prev ? { ...prev, messages: [...prev.messages, myMsg] } : prev)
    setSending(true)

    try {
      const res = await fetch(`/api/bargain/${activeSessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || "Failed to send")
        return
      }

      // If there's an AI reply, add it
      if (data.reply) {
        const aiMsg: ThreadMessage = {
          role: "assistant",
          content: data.reply,
          metadata: { currentOffer: data.currentOffer, tactic: data.tactic },
          createdAt: new Date().toISOString(),
        }
        setThread((prev) => {
          if (!prev) return prev
          const updated = { ...prev, messages: [...prev.messages, aiMsg] }
          if (data.status && data.status !== "negotiating") updated.status = data.status
          if (data.status === "agreed" && data.currentOffer) updated.agreedPrice = data.currentOffer
          return updated
        })
      } else {
        // No AI reply (human only or seller sent a message)
        // Just update status if it changed
        setThread((prev) => {
          if (!prev) return prev
          const updated = { ...prev }
          if (data.status && data.status !== "negotiating") updated.status = data.status
          return updated
        })
      }

      // Optimistically update sidebar conversation status
      if (data.status && data.status !== "negotiating") {
        setConversations((prev) =>
          prev.map((c) =>
            c.sessionId === activeSessionId
              ? { ...c, status: data.status, agreedPrice: data.currentOffer || c.agreedPrice }
              : c
          )
        )
      }

      // Refresh sidebar from server for confirmation
      await fetchConversations()
    } catch {
      setError("Network error")
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const quickOffer = (pct: number) => {
    if (!thread) return
    const offer = Math.round(thread.askingPrice * (1 - pct / 100))
    sendMessage(`I'd like to offer ₹${offer.toLocaleString()}`)
  }

  // Filter + search conversations
  const filtered = conversations.filter((c) => {
    if (filter === "active" && c.status !== "active") return false
    if (filter === "agreed" && c.status !== "agreed") return false
    if (filter === "closed" && c.status !== "closed" && c.status !== "rejected") return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.material.title.toLowerCase().includes(q) ||
        c.counterparty.name.toLowerCase().includes(q)
      )
    }
    return true
  })

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    )
  }

  const isEnded = thread && ["agreed", "rejected", "closed"].includes(thread.status)
  const canSend = (thread?.isBuyer || thread?.isSeller) && thread?.status === "active"

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-gray-50">
      {/* ─── LEFT: Conversation List ────────────────────── */}
      <div className={`w-full md:w-[380px] lg:w-[420px] border-r border-gray-200 bg-white flex flex-col shrink-0 ${mobileShowThread ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Deals
          </h1>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by material or person..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-gray-50 border-gray-200"
            />
          </div>
          {/* Filter Tabs */}
          <div className="flex gap-1 mt-3">
            {(["all", "active", "agreed", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 px-4">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">No conversations</p>
              <p className="text-sm text-gray-400 mt-1">
                {filter !== "all" ? "Try a different filter." : "Make an offer on a listing to start negotiating."}
              </p>
              {filter === "all" && (
                <Link href="/marketplace">
                  <Button size="sm" className="mt-4 bg-emerald-600 text-xs">Browse Marketplace</Button>
                </Link>
              )}
            </div>
          ) : (
            filtered.map((c) => {
              const sb = STATUS_BADGE[c.status] || STATUS_BADGE.closed
              const isActive = c.sessionId === activeSessionId
              return (
                <button
                  key={c.sessionId}
                  onClick={() => openThread(c.sessionId)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all flex gap-3 ${
                    isActive ? "bg-emerald-50/60 border-l-2 border-l-emerald-500" : ""
                  }`}
                >
                  {/* Material Image */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <img
                      src={c.material.image || FALLBACK_IMG}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {c.material.title}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {timeAgo(c.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-500 truncate">
                        {c.role === "buyer" ? `with ${c.counterparty.name}` : `from ${c.counterparty.name}`}
                      </span>
                      <Badge className={`${sb.bg} text-[10px] px-1.5 py-0 h-4 shrink-0`}>{sb.label}</Badge>
                      {c.role === "seller" && (
                        <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 h-4 shrink-0">Seller</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{c.lastMessage || "No messages yet"}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT: Chat Thread ─────────────────────────── */}
      <div className={`flex-1 flex flex-col bg-white ${!mobileShowThread ? "hidden md:flex" : "flex"}`}>
        {!activeSessionId && !startingNew ? (
          /* No thread selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-700 text-lg">Select a conversation</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                Choose a negotiation from the list or visit the marketplace to start a new one.
              </p>
            </div>
          </div>
        ) : loadingThread || startingNew ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-sm text-gray-500">{startingNew ? "Starting negotiation…" : "Loading…"}</p>
            </div>
          </div>
        ) : thread ? (
          <>
            {/* Thread Header */}
            <div className="border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Mobile back button */}
                <button
                  onClick={() => { setMobileShowThread(false); setActiveSessionId(null); setThread(null) }}
                  className="md:hidden shrink-0 p-1 rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>

                {/* Material image */}
                <Link href={`/materials/${thread.material.id}`} className="shrink-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={thread.material.image || FALLBACK_IMG}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG }}
                    />
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/materials/${thread.material.id}`} className="font-bold text-sm text-gray-900 truncate hover:text-emerald-600">
                      {thread.material.title}
                    </Link>
                    <Badge className={`${(STATUS_BADGE[thread.status] || STATUS_BADGE.closed).bg} text-[10px] px-1.5 py-0 h-4 shrink-0`}>
                      {(STATUS_BADGE[thread.status] || STATUS_BADGE.closed).label}
                    </Badge>
                    {thread.isSeller && (
                      <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 h-4">You're the seller</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      {thread.isBuyer ? "Seller" : "Buyer"}: <strong>{thread.counterparty.name}</strong>
                    </span>
                    {thread.counterparty.city && (
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{thread.counterparty.city}</span>
                    )}
                  </div>
                </div>

                {/* Price info */}
                <div className="hidden sm:flex items-center gap-4 text-xs shrink-0">
                  <div className="text-center">
                    <p className="text-gray-400">Listed</p>
                    <p className="font-bold text-gray-700">₹{thread.askingPrice.toLocaleString()}</p>
                  </div>
                  {thread.agreedPrice && (
                    <>
                      <ArrowRight className="w-3 h-3 text-gray-300" />
                      <div className="text-center">
                        <p className="text-emerald-500">Agreed</p>
                        <p className="font-bold text-emerald-700">₹{thread.agreedPrice.toLocaleString()}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50/50">
              {thread.messages.map((msg, i) => {
                // Date separator
                const showDate = i === 0 || dateSeparator(msg.createdAt) !== dateSeparator(thread.messages[i - 1].createdAt)
                const isMine = (thread.isBuyer && msg.role === "buyer") || (thread.isSeller && msg.role === "seller")

                return (
                  <div key={i}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="bg-white text-[10px] text-gray-400 px-3 py-1 rounded-full shadow-sm border border-gray-100 font-medium">
                          {dateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMine
                          ? "bg-emerald-600 text-white rounded-br-md"
                          : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                      }`}>
                        {msg.role === "assistant" && (
                          <p className="text-[11px] font-bold text-emerald-600 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> {thread.negotiationStyle === "human" ? "System Message" : `${thread.sellerName}'s Assistant`}
                          </p>
                        )}
                        {msg.role === "buyer" && thread.isSeller && (
                          <p className="text-[11px] font-bold text-emerald-200 mb-1">
                            {thread.counterparty.name}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.metadata?.currentOffer && msg.role === "assistant" && (
                          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 w-fit">
                            <IndianRupee className="w-3 h-3" />
                            Offer: ₹{msg.metadata.currentOffer.toLocaleString()}
                          </div>
                        )}
                        <p className={`text-[10px] mt-1 ${msg.role === "buyer" ? "text-emerald-200" : "text-gray-400"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {sending && (
                <div className="flex justify-start mb-1">
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Thinking…</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Deal Agreed Banner */}
            {thread.status === "agreed" && (
              <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 text-center space-y-1">
                <p className="font-bold text-emerald-800 flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Deal agreed at ₹{thread.agreedPrice?.toLocaleString()}!
                </p>
                <p className="text-xs text-emerald-600">
                  {thread.isBuyer
                    ? "A transaction has been created. Coordinate pickup with the seller."
                    : "The buyer has been notified. The listing has been marked as claimed."}
                </p>
                {thread.isBuyer && (
                  <Link href="/dashboard/my-deals">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs mt-1 gap-1">
                      <ShoppingBag className="w-3.5 h-3.5" /> View My Deals
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {/* Ended Banner */}
            {(thread.status === "rejected" || thread.status === "closed") && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
                <p className="font-medium text-gray-600 flex items-center justify-center gap-1">
                  <XCircle className="w-4 h-4" /> Negotiation ended
                </p>
                {thread.isBuyer && (
                  <p className="text-xs text-gray-400 mt-1">You can still request this material at the listed price.</p>
                )}
              </div>
            )}

            {/* AI Banner - hide if human negotiation */}
            {thread.isSeller && thread.status === "active" && thread.negotiationStyle !== "human" && (
              <div className="px-4 py-2.5 bg-purple-50 border-t border-purple-100 text-center">
                <p className="text-xs text-purple-700 font-medium flex items-center justify-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Your AI assistant is handling this negotiation. This is a read-only view.
                </p>
              </div>
            )}

            {/* Composer — buyer + active only */}
            {canSend && (
              <div className="border-t border-gray-200 p-3 bg-white space-y-2">
                {/* Quick offers — early in conversation */}
                {thread.messages.length <= 3 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[10, 20, 30].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => quickOffer(pct)}
                        disabled={sending}
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-50"
                      >
                        Offer {pct}% less (₹{Math.round(thread.askingPrice * (1 - pct / 100)).toLocaleString()})
                      </button>
                    ))}
                  </div>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your offer or message…"
                    className="flex-1 text-sm"
                    disabled={sending}
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || sending}
                    size="icon"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            {error ? (
              <div className="text-center px-4">
                <XCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
                <p className="font-medium text-gray-700">{error}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => { setError(""); setMobileShowThread(false) }}>
                  Go Back
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
