"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, X, Send, Bot, User, Loader2, Zap, ChevronDown, MapPin, ArrowRight } from "lucide-react"

interface MaterialResult {
  id: number
  title: string
  condition: string
  price: number
  city: string
  category?: string
  image?: string
  listing_type?: string
}

interface Message {
  role: "user" | "assistant"
  content: string
  tools?: string[]
  materials?: MaterialResult[]
  loading?: boolean
}

const TOOL_LABELS: Record<string, string> = {
  search_materials:        "🔍 Searching materials…",
  get_impact_estimate:     "📊 Calculating impact…",
  suggest_reuse_ideas:     "💡 Finding reuse ideas…",
  find_repair_hubs:        "🔧 Finding repair hubs…",
  get_demand_forecast:     "📈 Checking demand…",
  get_symbiosis_suggestions: "🔄 Exploring symbiosis…",
  get_want_board:          "📋 Checking want board…",
  get_repair_guide:        "🛠️ Generating repair guide…",
}

const SUGGESTIONS = [
  "What materials are available in Mumbai?",
  "How do I repair a wobbly wooden chair?",
  "What is the CO₂ impact of reusing 100kg of steel?",
  "Who needs construction materials right now?",
]

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm ReCircle's AI Sustainability Advisor. I can help you find materials, estimate environmental impact, suggest reuse ideas, and more. How can I help you today? 🌱",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [toolActivity, setToolActivity] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, toolActivity])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput("")

    setMessages(prev => [...prev, { role: "user", content: msg }])
    setLoading(true)
    setToolActivity("🤔 Thinking…")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()

      if (data.tools_used?.length > 0) {
        for (const tool of data.tools_used) {
          setToolActivity(TOOL_LABELS[tool] || `⚡ Running ${tool}…`)
          await new Promise(r => setTimeout(r, 500))
        }
      }

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || data.error || "Sorry, I couldn't process that.",
          tools: data.tools_used,
          materials: data.materials?.length > 0 ? data.materials : undefined,
        },
      ])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }])
    } finally {
      setLoading(false)
      setToolActivity(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center ${open ? "scale-0" : "scale-100"}`}
        aria-label="Open AI Advisor"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Slide-out panel */}
      <div className={`fixed bottom-0 right-0 z-50 flex flex-col transition-all duration-300 ease-in-out
        ${open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}
        w-full sm:w-96 h-[600px] sm:bottom-4 sm:right-4 sm:rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-emerald-600 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Sustainability Advisor</p>
              <p className="text-xs text-emerald-200 leading-tight">AI-powered · India-first</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-emerald-500 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              )}
              <div className={`max-w-[85%] space-y-1`}>
                {msg.tools && msg.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {msg.tools.map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />{t.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-br-sm"
                    : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                {/* Inline Material Cards */}
                {msg.materials && msg.materials.length > 0 && (
                  <div className="mt-2 overflow-x-auto pb-1">
                    <div className="flex gap-2" style={{ minWidth: "max-content" }}>
                      {msg.materials.map((mat) => (
                        <Link
                          key={mat.id}
                          href={`/materials/${mat.id}`}
                          className="block w-44 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                        >
                          <div className="h-24 w-full overflow-hidden bg-gray-100">
                            <img
                              src={mat.image || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b"}
                              alt={mat.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b"
                              }}
                            />
                          </div>
                          <div className="p-2 space-y-1">
                            <p className="text-xs font-bold text-gray-800 line-clamp-1">{mat.title}</p>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                              <MapPin className="w-2.5 h-2.5" />
                              <span className="truncate">{mat.city}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-emerald-600">
                                {mat.price === 0 ? "FREE" : `₹${mat.price}`}
                              </span>
                              <Badge variant="outline" className="text-[8px] px-1 py-0 capitalize border-gray-200">
                                {mat.condition?.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                              View <ArrowRight className="w-2.5 h-2.5" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                </div>
              )}
            </div>
          ))}

          {/* Tool activity indicator */}
          {toolActivity && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              </div>
              <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-gray-500 italic">
                {toolActivity}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (shown when few messages) */}
        {messages.length <= 1 && (
          <div className="px-3 pb-2 bg-gray-50">
            <p className="text-xs text-gray-400 mb-1.5">Try asking:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about materials, impact, repairs…"
              className="flex-1 h-10 text-sm rounded-xl border-gray-200 focus:border-emerald-400"
              disabled={loading}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 rounded-xl shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Backdrop on mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  )
}
