"use client"

import { useState, useEffect } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Leaf, TrendingUp, Package, IndianRupee, Bot, Download,
  Zap, Activity, Users, BarChart3, RefreshCw
} from "lucide-react"
import { SankeyDiagram } from "@/components/sankey-diagram"
import { toast } from "@/components/ui/use-toast"
import { DashboardStatsSkeleton } from "@/components/skeleton-card"
import { motion } from "framer-motion"

const AGENT_COLORS: Record<string, string> = {
  scout:    "bg-blue-100 text-blue-700",
  advisor:  "bg-purple-100 text-purple-700",
  quality:  "bg-teal-100 text-teal-700",
  sentinel: "bg-red-100 text-red-700",
}

const PIE_COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#06b6d4","#ef4444","#84cc16","#f97316"]

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/stats")
      if (!res.ok) throw new Error("Failed to load stats")
      setStats(await res.json())
    } catch (err) {
      console.error(err)
      toast({
        title: "Could not load dashboard",
        description: "Stats may be unavailable. Please try refreshing.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const handleExportCSV = () => {
    if (!stats) return
    const rows = [
      ["Metric", "Value"],
      ["Total Materials", stats.total_materials],
      ["Total Transactions", stats.total_transactions],
      ["kg Diverted", stats.kg_diverted],
      ["CO2 Saved (kg)", stats.co2_saved],
      ["Rupees Saved", stats.rupees_saved],
    ]
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "recircle-impact.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <DashboardStatsSkeleton />
      </div>
    )
  }

  const heroStats = [
    { label: "Materials Listed", value: stats?.total_materials ?? 0, icon: <Package className="w-6 h-6" />, color: "from-emerald-500 to-teal-600" },
    { label: "Exchanges Completed", value: stats?.total_transactions ?? 0, icon: <Activity className="w-6 h-6" />, color: "from-blue-500 to-indigo-600" },
    { label: "kg Diverted", value: `${stats?.kg_diverted ?? 0}`, icon: <TrendingUp className="w-6 h-6" />, color: "from-purple-500 to-pink-600" },
    { label: "CO₂ Saved (kg)", value: `${stats?.co2_saved ?? 0}`, icon: <Leaf className="w-6 h-6" />, color: "from-green-500 to-emerald-700" },
  ]

  const cumulativeData = (stats?.monthly_trend ?? []).map((m: any, i: number, arr: any[]) => ({
    month: m.month,
    cumulative: arr.slice(0, i + 1).reduce((s: number, x: any) => s + x.materials, 0),
    transactions: arr.slice(0, i + 1).reduce((s: number, x: any) => s + x.transactions, 0),
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Impact Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform-wide circular economy metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats} className="gap-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button size="sm" onClick={handleExportCSV} className="bg-emerald-600 gap-1">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Hero stats */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {heroStats.map(({ label, value, icon, color }) => (
          <motion.div
            key={label}
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          >
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${color} p-5 text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{label}</p>
                      <p className="text-3xl font-black mt-1">{value}</p>
                    </div>
                    <div className="opacity-70">{icon}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Weekly platform health */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "New Users This Week", value: stats?.weekly_new_users ?? 0, icon: <Users className="w-5 h-5 text-blue-500" /> },
          { label: "New Listings This Week", value: stats?.weekly_new_listings ?? 0, icon: <BarChart3 className="w-5 h-5 text-emerald-500" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label} className="border-none shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              {icon}
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts grid */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-gray-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="overview" className="rounded-lg px-4">Overview</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg px-4">Categories</TabsTrigger>
          <TabsTrigger value="flow" className="rounded-lg px-4">Material Flow</TabsTrigger>
          <TabsTrigger value="agents" className="rounded-lg px-4">Agent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Monthly materials + transactions bar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-gray-700">Monthly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats?.monthly_trend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="materials" name="Materials" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="transactions" name="Transactions" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cumulative area chart */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-gray-700">Cumulative Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="cumulative" name="Total Materials" stroke="#10b981" fill="url(#emeraldGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart by category */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-gray-700">Materials by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats?.category_breakdown ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="count" name="Materials" fill="#10b981" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie chart */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-gray-700">Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats?.category_breakdown ?? []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {(stats?.category_breakdown ?? []).map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flow" className="space-y-4">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700">Material Flow: Sources → Categories → Destinations</CardTitle>
              <p className="text-xs text-gray-500">Visualizes how surplus materials flow from supplier types through categories to their final route (Reuse/Repair/Recycle/Dispose)</p>
            </CardHeader>
            <CardContent className="pt-2">
              <SankeyDiagram
                data={stats?.sankey_data || undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-500" /> Recent Agent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!stats?.agent_logs || stats.agent_logs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No agent activity yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.agent_logs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50">
                      <Badge className={AGENT_COLORS[log.agent] || "bg-gray-100 text-gray-700"}>
                        {log.agent}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {log.action}
                          {log.material && <span className="text-gray-500"> — {log.material}</span>}
                        </p>
                        {log.user && <p className="text-xs text-gray-400">by {log.user}</p>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(log.created_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Equivalency callouts */}
      <Card className="border-none shadow-md bg-gradient-to-br from-emerald-900 to-teal-800 text-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4">🌍 Platform Impact = …</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { emoji: "🌳", label: "Trees Planted", value: Math.round((stats?.co2_saved ?? 0) / 22) },
              { emoji: "🏠", label: "Households Powered", value: Math.round((stats?.co2_saved ?? 0) / 500) },
              { emoji: "🛺", label: "Auto Trips Offset", value: Math.round((stats?.co2_saved ?? 0) / 1200) },
            ].map(({ emoji, label, value }) => (
              <div key={label} className="text-center">
                <div className="text-4xl mb-1">{emoji}</div>
                <p className="text-2xl font-black">{value.toLocaleString()}</p>
                <p className="text-sm text-emerald-300">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
