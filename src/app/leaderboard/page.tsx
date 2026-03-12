"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Leaf, TrendingUp, Award, Crown, Medal, Star, Loader2 } from "lucide-react"

const LEVELS: Record<string, { label: string; color: string }> = {
  seedling: { label: "Seedling",  color: "bg-gray-100 text-gray-600" },
  sprout:   { label: "Sprout",    color: "bg-green-100 text-green-700" },
  sapling:  { label: "Sapling",   color: "bg-teal-100 text-teal-700" },
  tree:     { label: "Tree",      color: "bg-emerald-100 text-emerald-700" },
  forest:   { label: "Forest",    color: "bg-emerald-800 text-white" },
}

const ROLE_COLORS: Record<string, string> = {
  individual: "bg-blue-100 text-blue-700",
  business:   "bg-purple-100 text-purple-700",
  ngo:        "bg-orange-100 text-orange-700",
  volunteer:  "bg-teal-100 text-teal-700",
  transporter:"bg-indigo-100 text-indigo-700",
}

const RANK_STYLE = [
  "bg-yellow-50 border-yellow-200 shadow-yellow-100",
  "bg-gray-50 border-gray-200 shadow-gray-100",
  "bg-orange-50 border-orange-200 shadow-orange-100",
]

const RANK_ICONS = [
  <Crown key="1" className="w-5 h-5 text-yellow-500" />,
  <Medal key="2" className="w-5 h-5 text-gray-400" />,
  <Medal key="3" className="w-5 h-5 text-orange-400" />,
]

export default function LeaderboardPage() {
  const { data: session } = useSession()
  const [users, setUsers]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [category, setCategory] = useState("impact")

  useEffect(() => {
    fetch("/api/admin/users?role=")
      .then(r => r.json())
      .then((data: any[]) => {
        // Sort by greenPoints descending by default
        const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => b.greenPoints - a.greenPoints)
        setUsers(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const sorted = (() => {
    const base = [...users]
    if (category === "impact")    return base.sort((a, b) => b.greenPoints - a.greenPoints)
    if (category === "suppliers") return base.sort((a, b) => b.totalRatings - a.totalRatings)
    if (category === "trust")     return base.sort((a, b) => b.trustScore - a.trustScore)
    return base
  })()

  const myRank = session ? sorted.findIndex(u => u.id === (session.user as any)?.id) + 1 : 0
  const me     = session ? sorted.find(u => u.id === (session.user as any)?.id) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
          <Trophy className="w-4 h-4" /> Circular Economy Champions
        </div>
        <h1 className="text-3xl font-bold text-gray-900">ReCircle Leaderboard</h1>
        <p className="text-gray-500 mt-1">Top contributors driving India&apos;s circular economy</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-52 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="impact">🌱 Top Impact (Green Points)</SelectItem>
            <SelectItem value="suppliers">📦 Top Suppliers (Most listings)</SelectItem>
            <SelectItem value="trust">🛡️ Most Trusted (Trust Score)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-400">{sorted.length} participants</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {sorted.slice(0, 3).length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[sorted[1], sorted[0], sorted[2]].filter(Boolean).map((u, i) => {
                const rank = i === 0 ? 2 : i === 1 ? 1 : 3
                return (
                  <div
                    key={u.id}
                    className={`flex flex-col items-center p-5 rounded-2xl border-2 shadow-md transition-transform ${RANK_STYLE[rank - 1]} ${rank === 1 ? "scale-105" : ""}`}
                  >
                    <div className="mb-2">{RANK_ICONS[rank - 1]}</div>
                    <Avatar className={`mb-2 ${rank === 1 ? "h-16 w-16" : "h-12 w-12"}`}>
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-lg">
                        {u.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-bold text-gray-900 text-center text-sm">{u.name}</p>
                    <Badge className={`${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"} text-xs mt-1`}>
                      {u.role}
                    </Badge>
                    <div className="mt-2 text-center">
                      <p className="font-black text-emerald-600 text-xl">{u.greenPoints} GP</p>
                      <Badge className={`${LEVELS[u.level]?.color || "bg-gray-100 text-gray-600"} text-xs mt-1`}>
                        {LEVELS[u.level]?.label || u.level}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-300" />
                      {Number(u.avgRating).toFixed(1)} · {u.totalRatings} reviews
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <Card className="border-none shadow-md">
            <CardContent className="p-0">
              {sorted.map((u, i) => (
                <div
                  key={u.id}
                  className={`flex items-center gap-4 px-5 py-4 border-b last:border-0 hover:bg-gray-50 transition-colors ${
                    u.id === (session?.user as any)?.id ? "bg-emerald-50" : ""
                  }`}
                >
                  <div className="w-8 text-center font-black text-gray-400 text-lg">{i + 1}</div>
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                      {u.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 truncate">{u.name}</p>
                      {u.id === (session?.user as any)?.id && (
                        <span className="text-xs text-emerald-600 font-bold">(You)</span>
                      )}
                      <Badge className={`${ROLE_COLORS[u.role] || "bg-gray-100"} text-xs`}>{u.role}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">{u.city}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-emerald-600">{u.greenPoints} GP</p>
                    <Badge className={`${LEVELS[u.level]?.color || "bg-gray-100 text-gray-600"} text-xs`}>
                      {LEVELS[u.level]?.label || u.level}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Your Rank Sticky */}
          {me && myRank > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-white border border-emerald-200 shadow-2xl shadow-emerald-100 rounded-2xl px-6 py-3 flex items-center gap-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Your Rank: #{myRank}</p>
                  <p className="text-xs text-gray-500">{me.greenPoints} GP · {LEVELS[me.level]?.label || me.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Trust Score</p>
                  <p className="font-bold text-emerald-600">{me.trustScore}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
