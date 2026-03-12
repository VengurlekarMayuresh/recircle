"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Truck, Package, Navigation, BarChart3, Leaf,
  CheckCircle2, ArrowUpRight, Clock, RefreshCw, Loader2
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

const STATUS_META: Record<string, { label: string; color: string }> = {
  requested:         { label: "Requested",        color: "bg-yellow-100 text-yellow-700" },
  accepted:          { label: "Accepted",          color: "bg-blue-100 text-blue-700" },
  pickup_scheduled:  { label: "Pickup Scheduled",  color: "bg-purple-100 text-purple-700" },
  collected:         { label: "Collected",         color: "bg-indigo-100 text-indigo-700" },
  in_transit:        { label: "In Transit",        color: "bg-orange-100 text-orange-700" },
  delivered:         { label: "Delivered",         color: "bg-teal-100 text-teal-700" },
  completed:         { label: "Completed",         color: "bg-emerald-100 text-emerald-700" },
  cancelled:         { label: "Cancelled",         color: "bg-red-100 text-red-700" },
}

const ACTIVE_STATUSES = ["accepted","pickup_scheduled","collected","in_transit"]
const DONE_STATUSES   = ["delivered","completed","cancelled"]

const NEXT_STATUS: Record<string, string> = {
  requested:        "accepted",
  accepted:         "pickup_scheduled",
  pickup_scheduled: "collected",
  collected:        "in_transit",
  in_transit:       "delivered",
  delivered:        "completed",
}

export default function TransporterDashboard() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [profile, setProfile]             = useState<any>(null)
  const [bookings, setBookings]           = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [togglingAvail, setTogglingAvail] = useState(false)
  const [updatingId, setUpdatingId]       = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, bRes] = await Promise.all([
        fetch("/api/transporters"),
        fetch("/api/transport-bookings"),
      ])
      if (tRes.ok) {
        const list: any[] = await tRes.json()
        const uid = (session as any)?.user?.id
        setProfile(list.find((t: any) => t.userId === uid) ?? null)
      }
      if (bRes.ok) setBookings(await bRes.json())
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/auth/login")
    if (authStatus === "authenticated") fetchData()
  }, [authStatus, fetchData, router])

  const toggleAvailability = async () => {
    if (!profile) return
    setTogglingAvail(true)
    const next = profile.availabilityStatus === "available" ? "offline" : "available"
    const res = await fetch(`/api/transporters/${profile.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilityStatus: next }),
    })
    if (res.ok) setProfile({ ...profile, availabilityStatus: next })
    setTogglingAvail(false)
  }

  const advanceBooking = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    const res = await fetch(`/api/transport-bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b))
    setUpdatingId(null)
  }

  const requests = bookings.filter(b => b.status === "requested")
  const active   = bookings.filter(b => ACTIVE_STATUSES.includes(b.status))
  const history  = bookings.filter(b => DONE_STATUSES.includes(b.status))
  const isAvail  = profile?.availabilityStatus === "available"

  if (loading || authStatus === "loading") return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
    </div>
  )

  if (!profile) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <Truck className="w-14 h-14 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">No Transporter Profile</h2>
      <p className="text-gray-500 mb-6">You haven&apos;t registered as a transporter yet.</p>
      <Button asChild className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
        <a href="/transporters/register">Register as Transporter</a>
      </Button>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transporter Dashboard</h1>
          <p className="text-gray-500">View and manage your material delivery bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <button
            onClick={toggleAvailability}
            disabled={togglingAvail}
            className={`flex items-center gap-3 px-4 py-2 rounded-xl border font-semibold transition-all ${
              isAvail
                ? "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100"
                : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {togglingAvail
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <div className={`w-3 h-3 rounded-full ${isAvail ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />}
            {isAvail ? "Online & Available" : "Offline"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="bg-gray-100/50 mb-6 font-bold">
              <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
              <TabsTrigger value="requests">
                Requests
                {requests.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">{requests.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">History ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {active.length === 0 ? (
                <EmptyState icon={<Truck className="w-10 h-10 text-gray-300" />} text="No active bookings" />
              ) : active.map(b => (
                <BookingCard key={b.id} booking={b} onAdvance={advanceBooking} updating={updatingId === b.id} />
              ))}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              {requests.length === 0 ? (
                <EmptyState icon={<Clock className="w-10 h-10 text-gray-300" />} text="No pending requests" />
              ) : requests.map(b => (
                <BookingCard key={b.id} booking={b} onAdvance={advanceBooking} updating={updatingId === b.id} isRequest />
              ))}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {history.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="w-10 h-10 text-gray-300" />} text="No completed bookings yet" />
              ) : history.map(b => (
                <BookingCard key={b.id} booking={b} onAdvance={advanceBooking} updating={updatingId === b.id} readOnly />
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="bg-emerald-900 text-white overflow-hidden relative border-none shadow-2xl shadow-emerald-200">
            <CardHeader>
              <CardTitle className="text-emerald-300 uppercase text-xs tracking-widest">Total Deliveries</CardTitle>
              <CardTitle className="text-4xl font-black">{profile.totalDeliveries}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{history.filter(b => b.status !== "cancelled").length} completed this session</span>
              </div>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 text-emerald-800/30">
              <BarChart3 className="w-32 h-32" />
            </div>
          </Card>

          <Card className="border-emerald-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">My Vehicle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Vehicle" value={profile.vehicleType?.replace("_"," ")} />
              <Row label="Capacity" value={`${profile.vehicleCapacityKg} kg`} />
              <Row label="Service Area" value={profile.serviceAreaCity} />
              <Row label="Radius" value={`${profile.serviceRadiusKm} km`} />
              {!profile.isVolunteer && (
                <>
                  <Separator />
                  <Row label="Base Rate" value={`₹${profile.baseRate}`} />
                  <Row label="Per km" value={`₹${profile.pricePerKm}/km`} />
                </>
              )}
              {profile.isVolunteer && (
                <div className="bg-emerald-50 rounded-lg p-2 text-center text-emerald-700 font-semibold text-xs">
                  🌱 Volunteer Transporter — Free Service
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold capitalize">{value}</span>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-14 bg-gray-50 rounded-2xl border border-dashed">
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <p className="text-gray-500">{text}</p>
    </div>
  )
}

function BookingCard({
  booking, onAdvance, updating, isRequest = false, readOnly = false,
}: {
  booking: any; onAdvance: (id: string, status: string) => void
  updating: boolean; isRequest?: boolean; readOnly?: boolean
}) {
  const meta      = STATUS_META[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-600" }
  const nextStatus = NEXT_STATUS[booking.status]
  const tx         = booking.transaction

  return (
    <Card className="overflow-hidden border-gray-100 hover:shadow-md transition-shadow">
      <CardHeader className="bg-gray-50/50 pb-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700 font-bold">#{booking.id.slice(0,8)}</Badge>
            <Badge className={meta.color}>{meta.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-grow space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <Package className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-800">{tx?.material?.title || "Material Transport"}</span>
            </div>
            {(tx?.supplier || tx?.receiver || booking.receiver) && (
              <div className="relative pl-6 space-y-3">
                <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="relative">
                  <div className="absolute -left-[1.375rem] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Supplier</p>
                  <p className="font-semibold text-gray-700">{tx?.supplier?.name ?? "—"}</p>
                  <p className="text-xs text-gray-400">{tx?.supplier?.city ?? ""}</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[1.375rem] top-1.5 w-3 h-3 rounded-full bg-red-500 ring-4 ring-white" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Receiver</p>
                  <p className="font-semibold text-gray-700">{booking.receiver?.name ?? tx?.receiver?.name ?? "—"}</p>
                  <p className="text-xs text-gray-400">{tx?.receiver?.city ?? ""}</p>
                </div>
              </div>
            )}
          </div>
          {!readOnly && nextStatus && (
            <div className="flex flex-col gap-2 justify-center md:w-44">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-10 text-sm"
                onClick={() => onAdvance(booking.id, nextStatus)}
                disabled={updating}
              >
                {updating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : isRequest ? "Accept" : `Mark: ${STATUS_META[nextStatus]?.label ?? nextStatus}`}
              </Button>
              {isRequest && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-10 text-sm text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => onAdvance(booking.id, "cancelled")}
                  disabled={updating}
                >
                  Decline
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
