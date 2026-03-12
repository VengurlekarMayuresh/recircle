"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send,
  Loader2,
  IndianRupee,
  CheckCircle,
  XCircle,
  MessageSquare,
  ArrowRight,
  Sparkles,
  ShoppingBag,
} from "lucide-react"
import Link from "next/link"

interface ChatMessage {
  role: "buyer" | "assistant"
  content: string
  metadata?: { currentOffer?: number; tactic?: string } | null
  createdAt?: string | Date
}

interface BargainChatProps {
  materialId: number
  materialTitle: string
  askingPrice: number
  sellerName: string
}

export default function BargainChat({
  materialId,
  materialTitle,
  askingPrice,
  sellerName,
}: BargainChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [status, setStatus] = useState<string>("idle") // idle, active, agreed, rejected, closed
  const [currentOffer, setCurrentOffer] = useState<number | null>(askingPrice)
  const [error, setError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Start or resume a bargain session
  const startSession = async () => {
    setStarting(true)
    setError("")
    try {
      const res = await fetch("/api/bargain/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Failed to start bargaining")
        return
      }

      setSessionId(data.sessionId)
      setMessages(data.messages)
      setStatus("active")

      if (data.messages?.length > 0) {
        const lastAssistant = [...data.messages]
          .reverse()
          .find((m: ChatMessage) => m.role === "assistant")
        if (lastAssistant?.metadata?.currentOffer) {
          setCurrentOffer(lastAssistant.metadata.currentOffer)
        }
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setStarting(false)
    }
  }

  // Send a message
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || !sessionId || loading) return

    setInput("")
    setError("")

    // Add buyer message immediately
    const buyerMsg: ChatMessage = { role: "buyer", content: text, createdAt: new Date() }
    setMessages((prev) => [...prev, buyerMsg])
    setLoading(true)

    try {
      const res = await fetch(`/api/bargain/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Failed to send message")
        return
      }

      // Add AI response
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        metadata: { currentOffer: data.currentOffer, tactic: data.tactic },
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (data.currentOffer) setCurrentOffer(data.currentOffer)
      if (data.status) setStatus(data.status)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Quick offer buttons
  const quickOffer = (percent: number) => {
    const offer = Math.round(askingPrice * (1 - percent / 100))
    sendMessage(`I'd like to offer ₹${offer.toLocaleString()}`)
  }

  // Idle state — show start button
  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="bg-emerald-100 p-4 rounded-full">
          <MessageSquare className="w-8 h-8 text-emerald-600" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-bold text-gray-800">Negotiate the Price</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Chat with {sellerName}&apos;s AI assistant to negotiate a better price for{" "}
            <strong>{materialTitle}</strong>
          </p>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          onClick={startSession}
          disabled={starting}
          className="bg-emerald-600 hover:bg-emerald-700 px-8 font-bold"
        >
          {starting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...
            </>
          ) : (
            <>
              Start Bargaining <ArrowRight className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    )
  }

  const isEnded = ["agreed", "rejected", "closed"].includes(status)

  return (
    <div className="flex flex-col h-[500px]">
      {/* Price Tracker */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 rounded-t-lg">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-400 text-xs">Listed</span>
            <p className="font-bold text-gray-600">₹{askingPrice.toLocaleString()}</p>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <div>
            <span className="text-gray-400 text-xs">Current Offer</span>
            <p className="font-bold text-emerald-600">
              {currentOffer ? `₹${currentOffer.toLocaleString()}` : "—"}
            </p>
          </div>
        </div>
        {status === "agreed" && (
          <div className="flex items-center gap-1 text-emerald-600 text-sm font-bold">
            <CheckCircle className="w-4 h-4" /> Deal Agreed!
          </div>
        )}
        {(status === "rejected" || status === "closed") && (
          <div className="flex items-center gap-1 text-red-500 text-sm font-bold">
            <XCircle className="w-4 h-4" /> Ended
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "buyer" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "buyer"
                  ? "bg-emerald-600 text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" && (
                <p className="text-xs font-bold text-emerald-600 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {sellerName}&apos;s Assistant
                </p>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.metadata?.currentOffer && msg.role === "assistant" && (
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 w-fit">
                  <IndianRupee className="w-3 h-3" />
                  Offer: ₹{msg.metadata.currentOffer.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Deal Agreed State */}
      {status === "agreed" && (
        <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 text-center space-y-2">
          <p className="font-bold text-emerald-800">
            🎉 Deal agreed at ₹{currentOffer?.toLocaleString()}!
          </p>
          <p className="text-xs text-emerald-600">
            The seller has been notified. A transaction has been created for you.
          </p>
          <Link href="/dashboard/my-deals">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs mt-1 gap-1">
              <ShoppingBag className="w-3.5 h-3.5" /> View My Deals
            </Button>
          </Link>
        </div>
      )}

      {/* Ended State */}
      {(status === "rejected" || status === "closed") && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="font-medium text-gray-600">Negotiation ended</p>
          <p className="text-xs text-gray-400 mt-1">
            You can still request this material at the listed price.
          </p>
        </div>
      )}

      {/* Input Area */}
      {!isEnded && (
        <div className="border-t border-gray-100 p-3 space-y-2">
          {/* Quick Offer Buttons */}
          {messages.length <= 2 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[10, 20, 30].map((pct) => (
                <button
                  key={pct}
                  onClick={() => quickOffer(pct)}
                  disabled={loading}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-50"
                >
                  Offer {pct}% less (₹{Math.round(askingPrice * (1 - pct / 100)).toLocaleString()})
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
              placeholder="Type your offer or message..."
              className="flex-1 text-sm"
              disabled={loading}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              size="icon"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
