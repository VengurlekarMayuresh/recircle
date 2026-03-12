"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wrench, MapPin, Globe, Clock, Search, Loader2, ExternalLink, MessageSquare } from "lucide-react"

const RepairMap = dynamic(() => import("@/components/repair-map"), { ssr: false })

const TYPE_COLORS: Record<string, string> = {
  workshop:   "bg-blue-100 text-blue-700",
  makerspace: "bg-purple-100 text-purple-700",
  event:      "bg-orange-100 text-orange-700",
}

const CITIES = ["", "Mumbai", "Delhi", "Pune", "Bangalore", "Surat", "Ahmedabad", "Chennai", "Kolkata", "Hyderabad", "Jaipur"]
const CATEGORIES = ["", "electronics", "furniture", "construction", "textiles", "metal", "plastic"]

export default function RepairHubsPage() {
  const [hubs, setHubs]           = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [city, setCity]           = useState("")
  const [type, setType]           = useState("")
  const [category, setCategory]   = useState("")
  const [selected, setSelected]   = useState<any>(null)

  useEffect(() => {
    fetch("/api/repair-hubs")
      .then(r => r.json())
      .then(data => { setHubs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = hubs.filter(h => {
    if (city && !h.address?.toLowerCase().includes(city.toLowerCase())) return false
    if (type && h.type !== type) return false
    if (category && !h.categories?.toLowerCase().includes(category.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 flex items-center gap-3">
        <Wrench className="w-5 h-5 shrink-0" />
        <span className="text-sm font-semibold">
          🛠️ Don&apos;t discard it, repair it! Find community repair hubs near you and give materials a second life.
        </span>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-36 h-9 text-sm bg-gray-50">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map(c => <SelectItem key={c || "_all"} value={c}>{c || "All Cities"}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36 h-9 text-sm bg-gray-50">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="workshop">Workshop</SelectItem>
            <SelectItem value="makerspace">Makerspace</SelectItem>
            <SelectItem value="event">Event</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40 h-9 text-sm bg-gray-50">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c || "_all"} value={c}>{c || "All Categories"}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-400">{filtered.length} hubs found</span>
      </div>

      {/* Main content: sidebar + map */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 shrink-0 overflow-y-auto border-r bg-gray-50">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No repair hubs found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(hub => (
                <div
                  key={hub.id}
                  onClick={() => setSelected(hub)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-white ${selected?.id === hub.id ? "bg-white border-l-4 border-emerald-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug">{hub.name}</h3>
                    <Badge className={`${TYPE_COLORS[hub.type] || "bg-gray-100 text-gray-600"} text-xs shrink-0 capitalize`}>
                      {hub.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" /> {hub.address}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {hub.categories?.split(",").map((c: string) => (
                      <Badge key={c.trim()} className="bg-emerald-50 text-emerald-700 text-xs">
                        {c.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {!loading && (
            <RepairMap
              hubs={filtered}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            </div>
          )}

          {/* Hub detail popup */}
          {selected && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 border border-emerald-100 max-w-md">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{selected.name}</h3>
                  <Badge className={`${TYPE_COLORS[selected.type] || "bg-gray-100"} text-xs capitalize mt-1`}>
                    {selected.type}
                  </Badge>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-gray-400" /> {selected.address}
              </p>
              {selected.hours && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-gray-400" /> {selected.hours}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mb-3">
                {selected.categories?.split(",").map((c: string) => (
                  <Badge key={c.trim()} className="bg-emerald-50 text-emerald-700 text-xs">{c.trim()}</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-1 text-xs"
                  asChild
                >
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selected.locationLat},${selected.locationLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3" /> Get Directions
                  </a>
                </Button>
                {selected.website && (
                  <Button variant="outline" size="sm" className="rounded-xl gap-1 text-xs" asChild>
                    <a href={selected.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-3 h-3" /> Website
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" className="rounded-xl gap-1 text-xs">
                  <MessageSquare className="w-3 h-3" /> Ask AI
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
