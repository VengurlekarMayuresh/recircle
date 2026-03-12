"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  MapPin, Package, Weight, Tag, Eye, Clock, Leaf,
  IndianRupee, Droplets, AlertTriangle, Share2,
  Star, CheckCircle, ArrowRight, TreePine, Recycle,
  Wrench, Trash2, Zap, Users, ChevronLeft, ChevronRight,
  QrCode, ExternalLink
} from "lucide-react"
import { routeMaterial, ROUTE_COLORS, ROUTE_ICONS } from "@/lib/material-router"

const CONDITION_INFO: Record<string, { label: string; color: string; desc: string }> = {
  new: { label: "New", color: "emerald", desc: "Unused, still in original packaging or mint condition" },
  like_new: { label: "Like New", color: "green", desc: "Minimal use, no visible defects, fully functional" },
  good: { label: "Good", color: "teal", desc: "Minor wear/scratches, fully functional, structurally sound" },
  fair: { label: "Fair", color: "yellow", desc: "Visible wear, minor damage, may need minor repair" },
  salvage: { label: "Salvage", color: "orange", desc: "Significant damage, best for parts/recycling/scrap" },
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const router = useRouter()

  const [material, setMaterial] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestQty, setRequestQty] = useState(1)
  const [requestMsg, setRequestMsg] = useState("")
  const [requestTransport, setRequestTransport] = useState("flexible")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const user = session?.user as any

  useEffect(() => {
    fetch(`/api/materials/${id}`)
      .then(r => r.json())
      .then(data => { setMaterial(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const handleRequest = async () => {
    if (!session) { router.push("/login"); return }
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/material-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: id,
          quantityRequested: requestQty,
          message: requestMsg,
          preferredTransport: requestTransport
        })
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.message || "Failed to send request"); return }
      setSubmitSuccess(true)
      setTimeout(() => { setRequestOpen(false); setSubmitSuccess(false) }, 2000)
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Recycle className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-gray-500">Loading material details...</p>
        </div>
      </div>
    )
  }

  if (!material || material.message) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 text-lg">Material not found.</p>
        <Link href="/marketplace" className="text-emerald-600 hover:underline mt-2 inline-block">← Back to Marketplace</Link>
      </div>
    )
  }

  // Parse JSON fields (stored as strings in SQLite)
  const images: string[] = (() => {
    try { return typeof material.images === "string" ? JSON.parse(material.images) : (material.images || []) }
    catch { return material.images?.split?.(",") || [] }
  })()
  const tags: string[] = (() => {
    try { return typeof material.tags === "string" ? JSON.parse(material.tags) : (material.tags || []) }
    catch { return material.tags?.split?.(",") || [] }
  })()
  const aiUseCases: string[] = (() => {
    try { return typeof material.aiUseCases === "string" ? JSON.parse(material.aiUseCases) : (material.aiUseCases || []) }
    catch { return [] }
  })()

  const isOwner = user?.id === material.userId
  const isFuture = material.status === "future"
  const condInfo = CONDITION_INFO[material.condition] || CONDITION_INFO.good
  const route = routeMaterial(material.condition, material.category?.slug || "", material.weightKg || 0)
  const routeColor = ROUTE_COLORS[route.route]
  const routeIcon = ROUTE_ICONS[route.route]

  const rps = material.reusePostentialScore ?? material.reusePotentialScore ?? null
  const rpsColor = rps === null ? "gray" : rps >= 70 ? "emerald" : rps >= 40 ? "yellow" : "red"

  const co2Saved = material.co2SavedKg || 0
  const rupeesSaved = material.rupeesSaved || 0
  const treeEquiv = Math.max(1, Math.round(co2Saved / 21))

  const statusColors: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-700",
    reserved: "bg-yellow-100 text-yellow-700",
    claimed: "bg-red-100 text-red-700",
    future: "bg-blue-100 text-blue-700",
    archived: "bg-gray-100 text-gray-500"
  }

  const daysAgo = material.createdAt
    ? Math.floor((Date.now() - new Date(material.createdAt).getTime()) / 86400000)
    : 0
  const createdLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`

  const fallbackImg = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/marketplace" className="hover:text-emerald-600">Marketplace</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-400">{material.category?.name}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="font-medium text-gray-700 truncate max-w-[200px]">{material.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── LEFT COLUMN ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Image Gallery */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-video shadow-md">
            <img
              src={images[activeImage] || fallbackImg}
              alt={material.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg }}
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage(i => Math.max(0, i - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveImage(i => Math.min(images.length - 1, i + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${statusColors[material.status] || statusColors.available}`}>
              {material.status === "future" ? `Available from ${new Date(material.availableFromDate).toLocaleDateString()}` : material.status?.charAt(0).toUpperCase() + material.status?.slice(1)}
            </div>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${activeImage === i ? "border-emerald-500" : "border-transparent"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg }} />
                </button>
              ))}
            </div>
          )}

          {/* Title + badges */}
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-3">{material.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              {material.category && (
                <Badge className="bg-emerald-100 text-emerald-800 font-semibold">
                  {material.category.name}
                </Badge>
              )}
              <Badge className={`font-semibold ${
                condInfo.color === "emerald" ? "bg-emerald-100 text-emerald-800" :
                condInfo.color === "green" ? "bg-green-100 text-green-800" :
                condInfo.color === "teal" ? "bg-teal-100 text-teal-800" :
                condInfo.color === "yellow" ? "bg-yellow-100 text-yellow-800" :
                "bg-orange-100 text-orange-800"
              }`}>
                {condInfo.label}
              </Badge>
              <Badge className={material.listingType === "donate" ? "bg-purple-100 text-purple-800" : material.listingType === "exchange" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                {material.listingType === "donate" ? "🎁 Free / Donate" : material.listingType === "sell" ? `💰 ₹${material.price}` : "🔄 Exchange"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 italic">{condInfo.desc}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Package className="w-3.5 h-3.5" /> Quantity</div>
              <p className="font-bold text-gray-800">{material.quantity} {material.unit}</p>
            </div>
            {material.weightKg && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Weight className="w-3.5 h-3.5" /> Weight</div>
                <p className="font-bold text-gray-800">{material.weightKg} kg</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><MapPin className="w-3.5 h-3.5" /> Location</div>
              <p className="font-bold text-gray-800">{material.city}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Listed</div>
              <p className="font-bold text-gray-800">{createdLabel}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Eye className="w-3.5 h-3.5" /> Views</div>
              <p className="font-bold text-gray-800">{material.viewsCount || 0}</p>
            </div>
            {material.reuseCount > 0 && (
              <div className="bg-emerald-50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-emerald-600 text-xs mb-1"><Recycle className="w-3.5 h-3.5" /> Reused</div>
                <p className="font-bold text-emerald-700">{material.reuseCount}× redistributed</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Description</h2>
            <p className="text-gray-600 leading-relaxed">{material.description}</p>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-600">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <Link key={i} href={`/marketplace?search=${tag}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-emerald-50 hover:border-emerald-300">#{tag.trim()}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* AI Reuse Suggestions */}
          {aiUseCases.length > 0 && (
            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
                  <Zap className="w-4 h-4" /> AI Reuse Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aiUseCases.map((useCase, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white/70 rounded-lg p-3">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span className="text-sm text-gray-700">{useCase}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Material Router Flowchart */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {route.route === "reuse" ? <Recycle className="w-4 h-4 text-emerald-600" /> :
                 route.route === "repair" ? <Wrench className="w-4 h-4 text-amber-600" /> :
                 route.route === "recycle" ? <ArrowRight className="w-4 h-4 text-blue-600" /> :
                 <Trash2 className="w-4 h-4 text-red-600" />}
                Material Route Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-gray-100 rounded-full px-3 py-1.5 text-sm font-medium text-gray-700">
                  {condInfo.label} Condition
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                  routeColor === "emerald" ? "bg-emerald-100 text-emerald-700" :
                  routeColor === "amber" ? "bg-amber-100 text-amber-700" :
                  routeColor === "blue" ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {routeIcon} {route.route.charAt(0).toUpperCase() + route.route.slice(1)}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">{route.reason}</p>
              <p className="text-sm text-gray-500 mt-1 italic">{route.action}</p>
              {route.repair_hub && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800">Nearest Repair Hub: {route.repair_hub.name}</p>
                  <p className="text-amber-700">{route.repair_hub.distance_km}km away • Est. repair cost: ₹{route.repair_hub.estimated_cost}</p>
                </div>
              )}
              {route.scrap_value && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800">Scrap Value: ₹{route.scrap_value.per_kg}/kg</p>
                  {route.scrap_value.total > 0 && <p className="text-blue-700">Estimated total: ₹{route.scrap_value.total.toLocaleString()}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Environmental Impact */}
          <Card className="border-green-100 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-800">
                <Leaf className="w-4 h-4" /> Environmental Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-600">{co2Saved.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 font-medium">kg CO₂ Saved</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-green-600">₹{rupeesSaved.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 font-medium">Rupees Saved</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-teal-600">{treeEquiv}</p>
                  <p className="text-xs text-gray-500 font-medium">🌳 Trees Equiv.</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-blue-600">{material.category?.decompositionYears || "?"}y</p>
                  <p className="text-xs text-gray-500 font-medium">Landfill Life</p>
                </div>
              </div>
              {material.category?.decompositionYears && (
                <p className="text-xs text-gray-500 mt-3 italic">
                  ♻️ This material takes ~{material.category.decompositionYears} years to decompose in landfill.
                  By reusing it, you're giving it a new life and avoiding that waste.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── RIGHT SIDEBAR ────────────────────────── */}
        <div className="space-y-4">

          {/* Supplier Card */}
          {material.user && (
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-12 w-12 border-2 border-emerald-100">
                    <AvatarImage src={material.user.avatarUrl} />
                    <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold">
                      {material.user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/profile/${material.user.id}`} className="font-bold text-gray-800 hover:text-emerald-600">
                      {material.user.name}
                    </Link>
                    <p className="text-xs text-gray-500 capitalize">{material.user.role} · {material.user.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(material.user.avgRating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                    ))}
                    <span className="text-gray-500 text-xs">({material.user.totalRatings || 0})</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                    material.user.verificationLevel === "trusted" ? "bg-emerald-100 text-emerald-700" :
                    material.user.verificationLevel === "verified" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {material.user.verificationLevel === "trusted" ? "✅ Trusted" :
                     material.user.verificationLevel === "verified" ? "🔵 Verified" : "⚪ Basic"}
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                    Trust: {material.user.trustScore || 0}/100
                  </div>
                </div>
                <Link href={`/profile/${material.user.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                    View Profile <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* RPS Badge */}
          {rps !== null && (
            <Card className="border-gray-100">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-semibold text-gray-500 mb-2">Reuse Potential Score</p>
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black border-4 ${
                  rpsColor === "emerald" ? "border-emerald-400 text-emerald-700 bg-emerald-50" :
                  rpsColor === "yellow" ? "border-yellow-400 text-yellow-700 bg-yellow-50" :
                  "border-red-400 text-red-700 bg-red-50"
                }`}>
                  {rps}
                </div>
                <p className={`text-xs font-bold mt-2 ${rpsColor === "emerald" ? "text-emerald-600" : rpsColor === "yellow" ? "text-yellow-600" : "text-red-600"}`}>
                  {rps >= 70 ? "High Reuse Value" : rps >= 40 ? "Moderate Value" : "Low Reuse Value"}
                </p>
                <p className="text-xs text-gray-400 mt-1">out of 100</p>
              </CardContent>
            </Card>
          )}

          {/* Price */}
          <Card className="border-gray-100 bg-gradient-to-br from-gray-50 to-white">
            <CardContent className="p-4">
              <div className="text-3xl font-black text-emerald-600 mb-1">
                {material.price === 0 ? "FREE" : `₹${material.price.toLocaleString()}`}
              </div>
              <p className="text-xs text-gray-500">
                {material.listingType === "donate" ? "This item is being donated for free" :
                 material.listingType === "exchange" ? "Available for exchange / barter" :
                 "Selling price per lot"}
              </p>
            </CardContent>
          </Card>

          {/* CTA Buttons */}
          {isOwner ? (
            <div className="space-y-2">
              <Link href={`/materials/${id}/edit`}>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Edit Listing</Button>
              </Link>
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  if (confirm("Archive this listing?")) {
                    await fetch(`/api/materials/${id}`, { method: "DELETE" })
                    router.push("/dashboard/my-listings")
                  }
                }}
              >
                Deactivate Listing
              </Button>
            </div>
          ) : (
            <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
              <DialogTrigger asChild>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-lg shadow-lg shadow-emerald-100"
                  disabled={material.status === "claimed" || material.status === "archived"}
                >
                  {isFuture ? "🔔 Reserve This Material" : "📦 Request This Material"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Request Material</DialogTitle>
                  <DialogDescription>
                    Send a request to the supplier for <strong>{material.title}</strong>.
                  </DialogDescription>
                </DialogHeader>
                {submitSuccess ? (
                  <div className="py-8 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="font-semibold text-gray-800">Request sent successfully!</p>
                    <p className="text-sm text-gray-500 mt-1">The supplier will be notified.</p>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    <div>
                      <Label htmlFor="qty">Quantity Needed</Label>
                      <input
                        id="qty"
                        type="number"
                        min={1}
                        max={material.quantity}
                        value={requestQty}
                        onChange={e => setRequestQty(parseInt(e.target.value) || 1)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">{material.quantity} {material.unit} available</p>
                    </div>
                    <div>
                      <Label htmlFor="msg">Message to Supplier</Label>
                      <Textarea
                        id="msg"
                        placeholder="Why do you need this material? How will you use it?"
                        value={requestMsg}
                        onChange={e => setRequestMsg(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Preferred Transport</Label>
                      <Select value={requestTransport} onValueChange={setRequestTransport}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self_pickup">Self Pickup (I'll come to supplier)</SelectItem>
                          <SelectItem value="need_delivery">Need Delivery (supplier delivers)</SelectItem>
                          <SelectItem value="flexible">Flexible (we'll decide)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                  </div>
                )}
                {!submitSuccess && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
                    <Button onClick={handleRequest} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                      {submitting ? "Sending..." : "Send Request"}
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          )}

          {/* No Returns Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800">⚠️ No Returns Policy</p>
              <p className="text-xs text-amber-700 mt-0.5">Inspect material thoroughly before accepting. All transactions are final.</p>
              <Link href="/faq" className="text-xs text-amber-600 underline">Learn more →</Link>
            </div>
          </div>

          {/* QR Code */}
          <Card className="border-gray-100">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                <QrCode className="w-4 h-4" />
                <span className="text-xs font-medium">Material Passport</span>
              </div>
              <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                <div className="grid grid-cols-4 gap-0.5 w-16">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className={`w-4 h-4 ${Math.random() > 0.5 ? "bg-gray-800" : "bg-white"}`} />
                  ))}
                </div>
              </div>
              <Link href={`/materials/${id}/passport`} className="text-xs text-emerald-600 hover:underline mt-2 inline-block">
                View Digital Passport →
              </Link>
            </CardContent>
          </Card>

          {/* Share Button */}
          <Button variant="outline" className="w-full" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            {copied ? "Link Copied! ✓" : "Share Listing"}
          </Button>

        </div>
      </div>
    </div>
  )
}
