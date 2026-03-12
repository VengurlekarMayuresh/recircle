"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Send, Loader2, ArrowLeft, MapPin, Phone, Package,
  IndianRupee, CheckCircle, Recycle, ImageIcon
} from "lucide-react"

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  scheduled:    { bg: "bg-blue-100 text-blue-700", label: "Pickup Scheduled" },
  in_transit:   { bg: "bg-amber-100 text-amber-700", label: "In Transit" },
  delivered:    { bg: "bg-emerald-100 text-emerald-700", label: "Delivered" },
  confirmed:    { bg: "bg-emerald-100 text-emerald-700", label: "Confirmed" },
  negotiating:  { bg: "bg-blue-100 text-blue-700", label: "Negotiating" },
  cancelled:    { bg: "bg-red-100 text-red-700", label: "Cancelled" },
}

export default function TransactionMessagesPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

  const userId = (session?.user as any)?.id

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login")
  }, [authStatus, router])

  const fetchTransaction = async () => {
    try {
      const res = await fetch(`/api/transactions/${id}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.message || "Failed to load transaction")
        return
      }
      const data = await res.json()
      setTransaction(data)
    } catch {
      setError("Failed to load transaction")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id && authStatus === "authenticated") fetchTransaction()
  }, [id, authStatus])

  useEffect(() => {
    scrollToBottom()
  }, [transaction?.messages])

  // Poll for new messages every 10s
  useEffect(() => {
    if (!id || authStatus !== "authenticated") return
    const interval = setInterval(fetchTransaction, 10000)
    return () => clearInterval(interval)
  }, [id, authStatus])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/transactions/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      })
      if (res.ok) {
        setInput("")
        await fetchTransaction()
      } else {
        const data = await res.json()
        setError(data.message || "Failed to send message")
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Recycle className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading conversation...</p>
      </div>
    )
  }

  if (error && !transaction) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-red-500 font-medium">{error}</p>
        <Link href="/dashboard/my-deals" className="text-emerald-600 hover:underline mt-2 inline-block">
          ← Back to My Deals
        </Link>
      </div>
    )
  }

  if (!transaction) return null

  const isBuyer = userId === transaction.receiverId
  const otherParty = isBuyer ? transaction.supplier : transaction.receiver
  const sc = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.scheduled
  const messages = transaction.messages || []

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div className="shrink-0 space-y-3 mb-4">
        <Link href="/dashboard/my-deals" className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to My Deals
        </Link>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Material thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                <img
                  src={transaction.material?.images?.split(",")[0] || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200"}
                  alt={transaction.material?.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/materials/${transaction.materialId}`} className="font-bold text-gray-900 hover:text-emerald-600 truncate">
                    {transaction.material?.title}
                  </Link>
                  <Badge className={sc.bg} variant="secondary">{sc.label}</Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                  {transaction.notes && (
                    <span className="flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      {transaction.notes}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" /> {transaction.quantity} {transaction.material?.unit || "units"}
                  </span>
                </div>

                {/* Pickup info */}
                {transaction.pickupAddress && transaction.pickupAddress !== "Default Address" && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3 text-red-400" />
                    <span>Pickup: {transaction.pickupAddress}</span>
                  </div>
                )}
              </div>

              {/* Other party */}
              <div className="shrink-0 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <div>
                    <p className="text-xs text-gray-400">{isBuyer ? "Seller" : "Buyer"}</p>
                    <p className="text-sm font-semibold text-gray-800">{otherParty?.name}</p>
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={otherParty?.avatarUrl} />
                    <AvatarFallback className="bg-emerald-50 text-emerald-700 text-sm font-bold">
                      {otherParty?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-2">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-medium">No messages yet</p>
            <p className="text-gray-400 text-sm mt-1">Start the conversation to coordinate pickup details.</p>
          </div>
        ) : (
          messages.map((msg: any, i: number) => {
            const isMe = msg.senderId === userId
            return (
              <div key={msg.id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? "bg-emerald-600 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                }`}>
                  {!isMe && (
                    <p className={`text-xs font-semibold mb-0.5 ${isMe ? "text-emerald-100" : "text-gray-500"}`}>
                      {msg.sender?.name || "User"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Attached" className="mt-2 max-w-full rounded-lg" />
                  )}
                  <p className={`text-[10px] mt-1 ${isMe ? "text-emerald-200" : "text-gray-400"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="shrink-0 pt-3 border-t border-gray-100">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-11 rounded-xl border-gray-200"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-emerald-600 hover:bg-emerald-700 h-11 w-11 rounded-xl p-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  )
}
