"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { MapPin, Plus, Clock, AlertCircle, Search, Package, ChevronRight } from "lucide-react"

const URGENCY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200"
}

const URGENCY_LABELS: Record<string, string> = {
  high: "🔴 Urgent",
  medium: "🟡 Medium",
  low: "🟢 Low"
}

export default function WantBoardPage() {
  const { data: session } = useSession()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/want-requests").then(r => r.json()),
      fetch("/api/categories").then(r => r.json()).catch(() => [])
    ]).then(([reqs, cats]) => {
      setRequests(Array.isArray(reqs) ? reqs : [])
      setCategories(Array.isArray(cats) ? cats : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const currentUserId = (session?.user as any)?.id

  const filtered = requests.filter(r => {
    // Hide the current user's own want requests
    if (currentUserId && r.user?.id === currentUserId) return false
    const matchSearch = !search ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.keywords?.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === "All" || r.category?.name === selectedCategory
    return matchSearch && matchCat
  })

  const daysAgo = (date: string) => {
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Want Board</h1>
          <p className="text-gray-500 mt-1">Browse what people are looking for. If you have it, list it!</p>
        </div>
        {session && (
          <Link href="/want-board/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Post Want Request
            </Button>
          </Link>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            className="pl-9 h-11"
            placeholder="Search want requests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {["All", ...categories.map((c: any) => c.name)].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-emerald-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-8 text-sm text-gray-500">
        <span>{filtered.length} requests found</span>
        <span>•</span>
        <span className="text-red-600 font-medium">{requests.filter(r => r.urgency === "high").length} urgent</span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading want requests...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No want requests found.</p>
          {session && (
            <Link href="/want-board/new" className="text-emerald-600 hover:underline mt-2 inline-block">
              Post the first request →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((req: any) => (
            <Card key={req.id} className="border-gray-100 hover:shadow-md transition-all hover:-translate-y-0.5 bg-white">
              <CardContent className="p-5">
                {/* Urgency badge */}
                <div className="flex items-center justify-between mb-3">
                  <Badge className={`text-xs font-semibold border ${URGENCY_STYLES[req.urgency]}`}>
                    {URGENCY_LABELS[req.urgency]}
                  </Badge>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {daysAgo(req.createdAt)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-800 text-lg mb-1 line-clamp-2">{req.title}</h3>

                {/* Category */}
                {req.category && (
                  <Badge variant="outline" className="text-xs mb-2">{req.category.name}</Badge>
                )}

                {/* Description */}
                {req.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{req.description}</p>
                )}

                {/* Keywords */}
                {req.keywords && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {req.keywords.split(",").slice(0, 4).map((kw: string) => (
                      <span key={kw} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{kw.trim()}</span>
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={req.user?.avatarUrl} />
                      <AvatarFallback className="text-[8px]">{req.user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span>{req.user?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{req.city || req.user?.city}</span>
                  </div>
                </div>

                {/* Need qty */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-700">
                    Needs: {req.quantityNeeded} units
                  </span>
                  {session && (
                    <Link href={`/materials/new?prefill=${encodeURIComponent(req.keywords || req.title)}`}>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7">
                        I Have This <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
