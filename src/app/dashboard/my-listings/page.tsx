"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Leaf, IndianRupee, Clock, BarChart3, Package, Users, Recycle,
  CheckCircle, XCircle, Inbox, Bell, MapPin, Truck, MessageCircle, Phone, MessageSquare, ArrowRight } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-emerald-100 text-emerald-700",
  rejected:  "bg-red-100 text-red-700",
  available: "bg-blue-100 text-blue-700",
  claimed:   "bg-gray-100 text-gray-700",
  archived:  "bg-orange-100 text-orange-700",
  future:    "bg-purple-100 text-purple-700",
}

const TRANSPORT_LABELS: Record<string, string> = {
  self_pickup:          "Self Pickup",
  supplier_delivery:    "Supplier Delivery",
  platform_transporter: "Book Transporter",
  flexible:             "Flexible",
}

export default function SupplierDashboard() {
  const { data: session } = useSession()
  const [listings, setListings] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [discoveryNotifs, setDiscoveryNotifs] = useState<any[]>([])
  const [bargainSessions, setBargainSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [respondingTo, setRespondingTo] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")

  const fetchAll = async () => {
    try {
      const [lRes, rRes, nRes, bRes] = await Promise.all([
        fetch("/api/materials?own=true"),
        fetch("/api/material-requests?type=received"),
        fetch("/api/notifications?type=supplier_discovery&limit=20"),
        fetch("/api/bargain/seller"),
      ])
      if (lRes.ok) {
        const lData = await lRes.json()
        setListings(Array.isArray(lData) ? lData : [])
      }
      if (rRes.ok) {
        const rData = await rRes.json()
        setRequests(Array.isArray(rData) ? rData : [])
      }
      if (nRes.ok) {
        const nData = await nRes.json()
        const notifs = Array.isArray(nData) ? nData : nData.notifications || []
        setDiscoveryNotifs(notifs.filter((n: any) => n.type === 'supplier_discovery'))
      }
      if (bRes.ok) {
        const bData = await bRes.json()
        setBargainSessions(Array.isArray(bData) ? bData : [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiscoveryResponse = async (notif: any, response: string) => {
    setRespondingTo(notif.id)
    try {
      let data: any = { type: 'supplier_discovery' }
      try { data = JSON.parse(notif.data) } catch {}

      const res = await fetch('/api/supplier-discovery/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notif.id,
          response,
          want_request_id: data?.wantRequestId,
          available_date: selectedDate || undefined
        })
      })
      const result = await res.json()
      if (result.redirect) {
        window.location.href = result.redirect
      } else {
        await fetchAll()
      }
    } finally {
      setRespondingTo(null)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleRequestAction = async (id: number, action: "accept" | "reject") => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/material-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) await fetchAll()
    } finally {
      setActionLoading(null)
    }
  }

  // Calculate live stats
  const totalCo2 = listings.reduce((acc, curr) => acc + (curr.co2SavedKg || curr.quantity * 0.5), 0).toFixed(0)
  const totalValue = listings.reduce((acc, curr) => acc + (curr.price || 0), 0).toLocaleString()
  const activeCount = listings.filter(l => l.status === 'available').length
  const pendingRequests = requests.filter(r => r.status === 'pending').length
  const activeBargains = bargainSessions.filter((s: any) => s.status === 'active').length

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Recycle className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Listings</h1>
          <p className="text-gray-500">Manage your surplus materials and incoming requests.</p>
        </div>
        <Link href="/materials/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl gap-2">
            <Plus className="w-5 h-5" /> New Listing
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total CO₂ Saved", value: `${totalCo2} kg`, icon: <Leaf className="w-10 h-10" />, bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-900", icon_color: "text-emerald-200" },
          { label: "Circular Value", value: `₹${totalValue}`, icon: <IndianRupee className="w-10 h-10" />, bg: "bg-blue-50 border-blue-100", text: "text-blue-900", icon_color: "text-blue-200" },
          { label: "Active Listings", value: activeCount, icon: <Package className="w-10 h-10" />, bg: "bg-amber-50 border-amber-100", text: "text-amber-900", icon_color: "text-amber-200" },
          { label: "Pending Requests", value: pendingRequests, icon: <Inbox className="w-10 h-10" />, bg: "bg-purple-50 border-purple-100", text: "text-purple-900", icon_color: "text-purple-200" },
        ].map(({ label, value, icon, bg, text, icon_color }) => (
          <Card key={label} className={`${bg} overflow-hidden relative border`}>
            <CardHeader className="pb-2">
              <p className={`text-xs font-bold uppercase tracking-wider ${text.replace("900","700")}`}>{label}</p>
              <CardTitle className={`text-2xl font-black ${text}`}>{value}</CardTitle>
            </CardHeader>
            <div className={`absolute top-4 right-4 ${icon_color}`}>{icon}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList className="bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="listings" className="rounded-lg px-5">My Listings</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-lg px-5 relative">
            Incoming Requests
            {pendingRequests > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingRequests}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="negotiations" className="rounded-lg px-5 relative">
            Negotiations
            {activeBargains > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeBargains}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="discovery" className="rounded-lg px-5">Discovery</TabsTrigger>
        </TabsList>

        {/* Tab 1: My Listings */}
        <TabsContent value="listings" className="space-y-4">
          {listings.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No listings yet</h3>
              <p className="text-gray-500 mb-6">Create your first material listing to get started.</p>
              <Link href="/materials/new"><Button className="bg-emerald-600">Create Listing</Button></Link>
            </div>
          ) : (
            listings.map((listing) => {
              const imgs = Array.isArray(listing.images) ? listing.images : listing.images?.split(',') || []
              return (
                <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-all border-gray-100">
                  <CardContent className="p-0 flex flex-col md:flex-row">
                    <div className="w-full md:w-40 h-40 md:h-auto shrink-0 overflow-hidden bg-gray-100">
                      {imgs[0] ? (
                        <img src={imgs[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="w-10 h-10" /></div>
                      )}
                    </div>
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{listing.title}</h3>
                          <div className="flex gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {listing.quantity} {listing.unit}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {listing.city}</span>
                            {listing.price > 0 && <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> {listing.price}</span>}
                          </div>
                        </div>
                        <Badge className={STATUS_COLORS[listing.status] || "bg-gray-100 text-gray-700"}>{listing.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-3">
                        <div className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                          <Leaf className="w-3 h-3" /> {listing.co2SavedKg || (listing.quantity * 0.5).toFixed(1)} kg CO₂
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/materials/${listing.id}`}>
                            <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs">View</Button>
                          </Link>
                          <Link href={`/materials/${listing.id}?edit=1`}>
                            <Button variant="secondary" size="sm" className="rounded-lg h-8 text-xs">Edit</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Tab 2: Incoming Requests */}
        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed">
              <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No incoming requests</h3>
              <p className="text-gray-500">When receivers request your materials, they'll appear here.</p>
            </div>
          ) : (
            requests.map((req: any) => (
              <Card key={req.id} className="border-gray-100 hover:shadow-sm transition-all">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">{req.receiver?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{req.receiver?.name || "Receiver"}</span>
                          <Badge className={STATUS_COLORS[req.status] || "bg-gray-100 text-gray-700"} variant="secondary">{req.status}</Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">
                          Requesting: <span className="text-emerald-700">{req.material?.title}</span>
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                          <span><Package className="w-3 h-3 inline mr-0.5" />{req.quantityRequested || req.quantity_requested} units</span>
                          <span><Truck className="w-3 h-3 inline mr-0.5" />{TRANSPORT_LABELS[req.preferredTransport || req.preferred_transport] || "—"}</span>
                          <span><Clock className="w-3 h-3 inline mr-0.5" />{new Date(req.createdAt || req.created_at).toLocaleDateString("en-IN")}</span>
                        </div>
                        {req.message && <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg max-w-md">&ldquo;{req.message}&rdquo;</p>}
                      </div>
                    </div>
                    {req.status === "pending" && (
                      <div className="flex gap-2 shrink-0 items-start">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 h-9 gap-1 text-xs"
                          disabled={actionLoading === req.id}
                          onClick={() => handleRequestAction(req.id, "accept")}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          disabled={actionLoading === req.id}
                          onClick={() => handleRequestAction(req.id, "reject")}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab 3: Negotiations */}
        <TabsContent value="negotiations" className="space-y-4">
          {bargainSessions.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No negotiations yet</h3>
              <p className="text-gray-500">When buyers negotiate on your listings, they'll appear here.</p>
            </div>
          ) : (
            bargainSessions.map((s: any) => {
              const statusConfig: Record<string, { bg: string; label: string }> = {
                active:   { bg: "bg-blue-100 text-blue-700", label: "Negotiating" },
                agreed:   { bg: "bg-emerald-100 text-emerald-700", label: "Deal Agreed" },
                rejected: { bg: "bg-red-100 text-red-700", label: "Rejected" },
                closed:   { bg: "bg-gray-100 text-gray-700", label: "Closed" },
              }
              const sc = statusConfig[s.status] || statusConfig.closed
              return (
                <Card key={s.sessionId} className={`border transition-all hover:shadow-md ${
                  s.status === "agreed" ? "border-emerald-200 bg-emerald-50/30" :
                  s.status === "active" ? "border-blue-200" : "border-gray-100"
                }`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                      <div className="flex gap-4">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-orange-100 text-orange-700">
                            {s.buyer?.name?.charAt(0) || "B"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{s.buyer?.name || "Buyer"}</span>
                            {s.buyer?.city && <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{s.buyer.city}</span>}
                            <Badge className={sc.bg} variant="secondary">{sc.label}</Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-800 mt-0.5">
                            Material: <Link href={`/materials/${s.material?.id}`} className="text-emerald-700 hover:underline">{s.material?.title}</Link>
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                            <span className="flex items-center gap-1">
                              <IndianRupee className="w-3 h-3" /> Listed: ₹{s.askingPrice?.toLocaleString()}
                            </span>
                            {s.agreedPrice && (
                              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle className="w-3 h-3" /> Agreed: ₹{s.agreedPrice?.toLocaleString()}
                              </span>
                            )}
                            {s.discount !== null && (
                              <span className="text-orange-600 font-medium">{s.discount}% off</span>
                            )}
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" /> {s.messageCount} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {new Date(s.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                      {s.status === "agreed" && (
                        <div className="shrink-0 flex items-center">
                          <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl text-center">
                            <p className="text-xs font-medium">Deal Price</p>
                            <p className="text-xl font-black">₹{s.agreedPrice?.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Post-deal coordination for agreed deals */}
                    {s.status === "agreed" && (
                      <div className="mt-4 pt-3 border-t border-emerald-100 space-y-3">
                        <div className="bg-emerald-50 rounded-xl p-3 space-y-2">
                          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Buyer Contact & Pickup</p>
                          {s.material?.address && s.material.address !== "Default Address" && (
                            <div className="flex items-start gap-2 text-sm text-gray-700">
                              <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <span>Pickup from: {s.material.address}</span>
                            </div>
                          )}
                          {s.buyer?.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <a href={`tel:${s.buyer.phone}`} className="text-emerald-700 font-semibold hover:underline">
                                {s.buyer.phone}
                              </a>
                              <span className="text-xs text-gray-400">(Buyer: {s.buyer.name})</span>
                            </div>
                          )}
                          <p className="text-xs text-gray-500">
                            Coordinate pickup timing with the buyer. Make sure the material is ready for collection.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {s.transaction?.id && (
                            <Link href={`/transactions/${s.transaction.id}`} className="flex-1">
                              <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs h-8">
                                <MessageSquare className="w-3 h-3 mr-1" /> Message Buyer
                              </Button>
                            </Link>
                          )}
                          <Link href={`/materials/${s.material?.id}`}>
                            <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-8">
                              View Listing <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Tab 4: Discovery Responses */}
        <TabsContent value="discovery">
          <div className="space-y-4">
            <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-5 flex gap-4">
                <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                  <Bell className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900">Predictive Supplier Discovery</h3>
                  <p className="text-sm text-amber-700 mt-0.5">
                    ReCircle AI notifies you when someone nearby needs materials you've listed before.
                    Respond to let them know your availability!
                  </p>
                </div>
              </CardContent>
            </Card>

            {discoveryNotifs.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No discovery alerts yet</h3>
                <p className="text-gray-500 text-sm">We'll notify you when someone near you is looking for materials you typically supply.</p>
              </div>
            ) : (
              discoveryNotifs.map((notif: any) => {
                let notifData: any = {}
                try { notifData = JSON.parse(notif.data || '{}') } catch {}
                const isResponding = respondingTo === notif.id
                return (
                  <Card key={notif.id} className={`border transition-all ${notif.read ? 'border-gray-100 opacity-70' : 'border-amber-200 shadow-sm'}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                          <Bell className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800">{notif.title}</p>
                            {!notif.read && <span className="w-2 h-2 bg-amber-500 rounded-full" />}
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">{notif.body}</p>
                          {notifData.query && (
                            <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg mt-2 inline-block">
                              Looking for: {notifData.query}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleDateString('en-IN')}</p>

                          {!notif.read && (
                            <div className="mt-4 space-y-3">
                              <p className="text-xs font-semibold text-gray-700">Your response:</p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-xs h-9"
                                  disabled={isResponding}
                                  onClick={() => handleDiscoveryResponse(notif, 'available_now')}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Available Now
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5 text-xs h-9"
                                  disabled={isResponding}
                                  onClick={() => handleDiscoveryResponse(notif, 'available_later')}
                                >
                                  <Clock className="w-3.5 h-3.5" /> Available Later
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-gray-500 hover:text-red-600 gap-1.5 text-xs h-9"
                                  disabled={isResponding}
                                  onClick={() => handleDiscoveryResponse(notif, 'not_available')}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Not Available
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
                                  value={selectedDate}
                                  onChange={(e) => setSelectedDate(e.target.value)}
                                  placeholder="Optional: available date"
                                />
                                <span className="text-xs text-gray-400">(optional: set future date)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
