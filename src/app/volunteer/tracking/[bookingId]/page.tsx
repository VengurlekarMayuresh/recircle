"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Truck, Phone, MapPin, Navigation, CheckCircle2, Clock,
  Loader2, Package, Camera, ArrowLeft, User, Star, RefreshCw
} from "lucide-react"

// Dynamic import for Leaflet (SSR-incompatible)
const TrackingMap = dynamic(() => import("./tracking-map"), { ssr: false })

const STATUS_STEPS = [
  { key: "pending_approval", label: "Claimed", icon: "📋" },
  { key: "accepted", label: "Confirmed", icon: "✅" },
  { key: "pickup_scheduled", label: "Pickup Scheduled", icon: "📅" },
  { key: "collected", label: "Picked Up", icon: "📦" },
  { key: "in_transit", label: "In Transit", icon: "🚴" },
  { key: "delivered", label: "Delivered", icon: "🎉" },
  { key: "completed", label: "Completed", icon: "⭐" },
]

export default function TrackingPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const bookingId = params.bookingId as string

  const [booking, setBooking] = useState<any>(null)
  const [location, setLocation] = useState<{ lat: number | null; lng: number | null; updatedAt: string | null }>({
    lat: null, lng: null, updatedAt: null,
  })
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/transport-bookings`)
      if (res.ok) {
        const all = await res.json()
        const found = all.find((b: any) => String(b.id) === bookingId)
        if (found) setBooking(found)
      }
    } catch {}
    setLoading(false)
  }, [bookingId])

  const fetchLocation = useCallback(async () => {
    try {
      const res = await fetch(`/api/volunteer/location/${bookingId}`)
      if (res.ok) {
        const data = await res.json()
        setLocation(data)
      }
    } catch {}
  }, [bookingId])

  // Send live location if volunteer
  const sendMyLocation = useCallback(async () => {
    if (!booking) return
    const isVolunteer = booking.transporter?.userId === (session?.user as any)?.id
    if (!isVolunteer) return

    const activeStatuses = ["accepted", "pickup_scheduled", "collected", "in_transit"]
    if (!activeStatuses.includes(booking.status)) return

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        await fetch(`/api/volunteer/location/${bookingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {})
      }, () => {}, { enableHighAccuracy: true })
    }
  }, [booking, bookingId, session])

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login")
    if (authStatus === "authenticated") {
      fetchBooking()
      fetchLocation()
    }
  }, [authStatus, fetchBooking, fetchLocation, router])

  // Poll location every 15 seconds
  useEffect(() => {
    if (!booking) return
    const interval = setInterval(() => {
      fetchLocation()
      sendMyLocation()
    }, 15000)
    // Send immediately once
    sendMyLocation()
    return () => clearInterval(interval)
  }, [booking, fetchLocation, sendMyLocation])

  // Confirm delivery (receiver only)
  const confirmDelivery = async () => {
    setConfirming(true)
    const res = await fetch(`/api/transport-bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    })
    if (res.ok) {
      setBooking((prev: any) => ({ ...prev, status: "completed" }))
    }
    setConfirming(false)
  }

  // Confirm volunteer (supplier/receiver)
  const confirmVolunteer = async (action: "confirm" | "reject") => {
    setConfirming(true)
    await fetch(`/api/volunteer/confirm/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    fetchBooking()
    setConfirming(false)
  }

  if (loading || authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const tx = booking.transaction
  const volunteer = booking.transporter
  const userId = (session?.user as any)?.id
  const isVolunteer = volunteer?.userId === userId
  const isSupplier = tx?.supplierId === userId
  const isReceiver = tx?.receiverId === userId

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === booking.status)

  // Time since last location update
  const lastUpdated = location.updatedAt ? new Date(location.updatedAt) : null
  const minutesAgo = lastUpdated ? Math.round((Date.now() - lastUpdated.getTime()) / 60000) : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Tracking</h1>
          <p className="text-gray-500 text-sm">Booking #{bookingId}</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={() => { fetchBooking(); fetchLocation() }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-none shadow-lg">
            <div className="h-[400px] bg-gray-100">
              <TrackingMap
                pickupLat={booking.pickupLat}
                pickupLng={booking.pickupLng}
                deliveryLat={booking.deliveryLat}
                deliveryLng={booking.deliveryLng}
                volunteerLat={location.lat}
                volunteerLng={location.lng}
              />
            </div>
          </Card>

          {/* Status Timeline */}
          <Card className="mt-6 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Delivery Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx <= currentStepIdx
                  const active = idx === currentStepIdx
                  return (
                    <div key={step.key} className="flex items-center">
                      <div className={`flex flex-col items-center min-w-[80px] ${active ? "scale-110" : ""}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                          done ? "bg-emerald-100" : "bg-gray-100"
                        } ${active ? "ring-2 ring-emerald-500" : ""}`}>
                          {step.icon}
                        </div>
                        <span className={`text-xs mt-1 text-center ${done ? "text-emerald-700 font-bold" : "text-gray-400"}`}>
                          {step.label}
                        </span>
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`h-0.5 w-6 ${idx < currentStepIdx ? "bg-emerald-400" : "bg-gray-200"}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Proof Photos */}
          {(booking.pickupPhotoUrl || booking.deliveryPhotoUrl) && (
            <Card className="mt-6 border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Proof Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                {booking.pickupPhotoUrl && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-bold">Pickup</p>
                    <img src={booking.pickupPhotoUrl} alt="Pickup proof" className="w-40 h-40 object-cover rounded-xl border" />
                  </div>
                )}
                {booking.deliveryPhotoUrl && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-bold">Delivery</p>
                    <img src={booking.deliveryPhotoUrl} alt="Delivery proof" className="w-40 h-40 object-cover rounded-xl border" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Volunteer Info (visible to buyer & seller) */}
          <Card className="border-emerald-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5" /> Volunteer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-lg font-bold">
                  {volunteer?.user?.name?.charAt(0) || "V"}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{volunteer?.user?.name || "Volunteer"}</p>
                  <p className="text-xs text-gray-500 capitalize">{volunteer?.vehicleType?.replace("_", " ")}</p>
                </div>
              </div>

              {booking.status !== "pending_approval" && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span>{volunteer?.vehicleCapacityKg} kg capacity</span>
                    </div>
                    {volunteer?.avgRating > 0 && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>{Number(volunteer.avgRating).toFixed(1)} ({volunteer.totalRatings} reviews)</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Location status */}
              {location.lat && (
                <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-700">
                  <Navigation className="w-3 h-3 inline mr-1" />
                  Live location active
                  {minutesAgo !== null && (
                    <span className="ml-1">
                      · {minutesAgo === 0 ? "just now" : `${minutesAgo}m ago`}
                    </span>
                  )}
                  {minutesAgo !== null && minutesAgo > 120 && (
                    <span className="text-red-600 font-bold ml-1">⚠ Stale</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Route Info */}
          <Card className="border-gray-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Route</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Pickup</p>
                <p className="text-gray-700">{booking.pickupAddress}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Delivery</p>
                <p className="text-gray-700">{booking.deliveryAddress}</p>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-500">Distance</span>
                <span className="font-bold">{booking.distanceKm} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cost</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {booking.status === "pending_approval" && (isSupplier || isReceiver) && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4 space-y-3">
                <p className="font-bold text-yellow-800 text-sm">Confirm this volunteer?</p>
                <div className="text-xs text-yellow-700">
                  {booking.supplierConfirmed ? "✅ Seller confirmed" : "⏳ Seller pending"}
                  {" · "}
                  {booking.receiverConfirmed ? "✅ Buyer confirmed" : "⏳ Buyer pending"}
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl h-10"
                    disabled={confirming}
                    onClick={() => confirmVolunteer("confirm")}
                  >
                    {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl h-10 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={confirming}
                    onClick={() => confirmVolunteer("reject")}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {booking.status === "delivered" && isReceiver && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 text-lg"
              disabled={confirming}
              onClick={confirmDelivery}
            >
              {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : "✅ Confirm Delivery Received"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
