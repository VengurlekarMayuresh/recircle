"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Loader2, Search, MessageSquare, TrendingUp, MapPin, 
  Filter, Tag, ArrowRight, Building2, Package
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/ui/use-toast"

export default function SuppliersDeskPage() {
  const router = useRouter()
  const [streams, setStreams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const fetchWasteStreams = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/suppliers/waste")
      if (res.ok) {
        const data = await res.json()
        setStreams(data.wasteStreams)
      } else {
        throw new Error("Failed to load waste streams")
      }
    } catch (error) {
      console.error(error)
      toast({ 
        title: "Could not load Suppliers Desk", 
        description: "Please try refreshing the page.", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWasteStreams() }, [])

  const filteredStreams = streams.filter(s => {
    const matchesSearch = 
      (s.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.user.orgName || s.user.name).toLowerCase().includes(search.toLowerCase()) ||
      (s.user.city || "").toLowerCase().includes(search.toLowerCase())
    
    const matchesCategory = selectedCategory === "all" || s.category.name === selectedCategory

    return matchesSearch && matchesCategory
  })

  const categories = ["all", ...new Set(streams.map(s => s.category.name))]

  const handleStartChat = async (stream: any) => {
    // If there's an existing material we could link to, we'd find it.
    // For now, we'll navigate to bargain with search params to indicate interest in a waste stream
    // The bargain page handles starting new sessions
    router.push(`/bargain?supplierId=${stream.userId}&intent=waste_stream&streamId=${stream.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Header */}
      <div className="bg-emerald-900 border-b border-emerald-800 pt-16 pb-24 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Suppliers <span className="text-emerald-400">Desk</span>
            </h1>
            <p className="text-emerald-100/80 text-lg mt-4 max-w-2xl mx-auto">
              Connect directly with industrial giants and local businesses. 
              View their waste generation profiles and secure high-volume surplus materials.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 md:p-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by supplier, city, or material..."
                className="pl-10 h-12 bg-gray-50 border-gray-100 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="md:col-span-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  className="w-full h-12 pl-9 bg-gray-50 border border-gray-100 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c === "all" ? "All Categories" : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl text-gray-600 hover:text-emerald-600 border-gray-100"
                onClick={() => { setSearch(""); setSelectedCategory("all") }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Brewing the waste streams...</p>
          </div>
        ) : filteredStreams.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No matches found</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2">
              Try adjusting your search filters or check back later for new supplier updates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredStreams.map((stream, idx) => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  layout
                >
                  <Card className="h-full border-none shadow-premium hover:shadow-premium-hover transition-all duration-300 rounded-3xl overflow-hidden flex flex-col group">
                    <CardHeader className="pb-0 pt-6 px-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-emerald-50 p-4 rounded-2xl text-3xl group-hover:scale-110 transition-transform">
                          {stream.category?.icon || "♻️"}
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                          {stream.category?.name}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 line-clamp-1 mb-1">
                        {stream.title || stream.category?.name}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <MapPin className="w-3.5 h-3.5" />
                        {stream.user.city}
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 px-6 pt-4 pb-6 space-y-5">
                      {stream.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 italic">
                          "{stream.description}"
                        </p>
                      )}

                      <div className="bg-emerald-50/50 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Monthly Production</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-emerald-700">{stream.monthlyVolumeKg}</span>
                            <span className="text-emerald-600 text-sm font-medium">{stream.unit}</span>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-600">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-gray-100">
                          <AvatarImage src={stream.user.avatarUrl} />
                          <AvatarFallback className="bg-gray-100 text-gray-600 font-bold">
                            {(stream.user.orgName || stream.user.name).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5 uppercase tracking-tighter">Supplier</p>
                          <p className="text-sm font-bold text-gray-800 truncate">
                            {stream.user.orgName || stream.user.name}
                          </p>
                        </div>
                        {stream.user.role === "business" && (
                          <Badge variant="secondary" className="ml-auto bg-blue-50 text-blue-600 text-[10px] h-5 border-none">
                            Verified Co.
                          </Badge>
                        )}
                      </div>

                      {stream.tags && (
                        <div className="flex flex-wrap gap-1.5">
                          {JSON.parse(stream.tags).slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[10px] bg-white border border-gray-100 text-gray-500 px-2 py-1 rounded-lg">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="p-0 border-t border-gray-50">
                      <Button 
                        onClick={() => handleStartChat(stream)}
                        className="w-full h-14 rounded-none bg-white hover:bg-emerald-600 text-emerald-600 hover:text-white font-bold transition-all gap-2"
                      >
                        <MessageSquare className="w-4 h-4" /> 
                        Start Chat to Secure Batch 
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-16 bg-gradient-to-br from-gray-900 to-emerald-950 rounded-[2.5rem] p-8 md:p-12 text-center text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <div className="bg-emerald-500/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="text-emerald-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black italic">Are you a Business?</h2>
            <p className="text-emerald-100/70 text-lg">
              Automate your waste management. List your production outputs and let recyclers come to you.
            </p>
            <div className="pt-4">
              <Button 
                onClick={() => router.push("/dashboard/business/waste")}
                className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl h-14 px-10 font-black text-lg shadow-lg shadow-emerald-900/40 transition-all hover:-translate-y-1"
              >
                Setup Your Waste Streams
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  )
}
