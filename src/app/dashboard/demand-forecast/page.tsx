"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Minus, Loader2, ArrowUpRight, Lightbulb } from "lucide-react"

const CITIES = ["Mumbai","Delhi","Pune","Bangalore","Surat","Ahmedabad","Chennai","Kolkata","Hyderabad","Jaipur"]

const TREND_ICONS = {
  rising:  <TrendingUp  className="w-4 h-4 text-emerald-500" />,
  falling: <TrendingDown className="w-4 h-4 text-red-500" />,
  stable:  <Minus className="w-4 h-4 text-gray-400" />,
}
const TREND_LABELS = {
  rising:  { text: "Rising",  color: "text-emerald-600" },
  falling: { text: "Falling", color: "text-red-600" },
  stable:  { text: "Stable",  color: "text-gray-500" },
}

const CAT_COLORS = [
  "#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#84cc16","#f97316",
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-900 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-bold">{entry.value ?? "—"}</span>
          {entry.strokeDasharray && <span className="text-gray-400">(predicted)</span>}
        </div>
      ))}
    </div>
  )
}

export default function DemandForecastPage() {
  const { data: session }       = useSession()
  const userCity                = (session?.user as any)?.city || ""
  const [city, setCity]         = useState("")
  const [data, setData]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [selectedCat, setSelectedCat] = useState<string>("all")

  useEffect(() => {
    if (!city && userCity) setCity(userCity)
  }, [userCity])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (city) params.set("city", city)
    fetch(`/api/dashboard/forecast?${params}`)
      .then(r => r.json())
      .then(res => { setData(res.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [city])

  const now = new Date()
  const currentLabel = `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][now.getMonth()+1]} ${now.getFullYear()}`

  const displayed = selectedCat === "all"
    ? data
    : data.filter(d => d.category.slug === selectedCat)

  // Build chart data by merging all categories' dataPoints by label
  const allLabels = data.length > 0 ? data[0].dataPoints.map((p: any) => p.label) : []
  const chartData = allLabels.map((label: string) => {
    const row: any = { label }
    displayed.forEach((cat: any) => {
      const pt = cat.dataPoints.find((p: any) => p.label === label)
      if (pt) {
        row[`${cat.category.name}_actual`]    = pt.actual
        row[`${cat.category.name}_predicted`] = pt.predicted
      }
    })
    return row
  })

  const risingCount  = data.filter(d => d.trend === "rising").length
  const peakCat      = data.find(d => d.trend === "rising")

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <TrendingUp className="w-3 h-3" /> AI Demand Forecast
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Demand Predictions</h1>
            <p className="text-gray-500">Actual data + AI-predicted demand for the next 3 months</p>
          </div>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Best Time Banner */}
      {peakCat && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">
              Best Time to List: {peakCat.category.name}
            </p>
            <p className="text-emerald-700 text-sm">
              Demand is {TREND_LABELS[peakCat.trend as keyof typeof TREND_LABELS]?.text} (+{peakCat.changePct}%) during <strong>{peakCat.currentSeason}</strong>.
              List your {peakCat.category.name.toLowerCase()} materials NOW for maximum visibility.
            </p>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setSelectedCat("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
            selectedCat === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All Categories
        </button>
        {data.map(d => (
          <button
            key={d.category.slug}
            onClick={() => setSelectedCat(d.category.slug)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              selectedCat === d.category.slug ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d.category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          {/* Main Chart */}
          <Card className="border-none shadow-md mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Listing Demand Trend
                {city && <span className="text-gray-500 font-normal text-sm ml-2">— {city}</span>}
              </CardTitle>
              <p className="text-xs text-gray-400">Solid = actual · Dashed = AI predicted · Vertical line = today</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine x={currentLabel} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "Now", fill: "#6366f1", fontSize: 11 }} />
                  {displayed.map((cat, i) => (
                    <>
                      <Line
                        key={`${cat.category.slug}_actual`}
                        type="monotone"
                        dataKey={`${cat.category.name}_actual`}
                        name={`${cat.category.name} (actual)`}
                        stroke={CAT_COLORS[i % CAT_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                      <Line
                        key={`${cat.category.slug}_predicted`}
                        type="monotone"
                        dataKey={`${cat.category.name}_predicted`}
                        name={`${cat.category.name} (predicted)`}
                        stroke={CAT_COLORS[i % CAT_COLORS.length]}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                    </>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((d, i) => {
              const trend = TREND_LABELS[d.trend as keyof typeof TREND_LABELS] || TREND_LABELS.stable
              return (
                <Card key={d.category.id} className="border-none shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{d.category.name}</h3>
                        <p className="text-xs text-gray-500">{d.currentSeason}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {TREND_ICONS[d.trend as keyof typeof TREND_ICONS]}
                        <span className={`text-sm font-bold ${trend.color}`}>
                          {d.trend === "rising" ? "+" : d.trend === "falling" ? "" : ""}{d.changePct}%
                        </span>
                      </div>
                    </div>
                    <Badge className={`text-xs ${d.trend === "rising" ? "bg-emerald-100 text-emerald-700" : d.trend === "falling" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                      {trend.text}
                    </Badge>
                    {d.bestListingMonth && (
                      <p className="text-xs text-gray-500 mt-2">
                        📅 Best listing month: <strong>{d.bestListingMonth}</strong>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
