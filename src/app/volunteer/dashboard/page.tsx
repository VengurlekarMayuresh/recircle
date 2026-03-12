"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Truck, Package, CheckCircle2, Clock, Leaf, Star, Camera,
  Shield, Upload, Loader2, RefreshCw, Navigation, MapPin,
  ArrowUpRight, BarChart3, AlertTriangle, Phone, Eye
} from "lucide-react"

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending_approval: { label: "Pending Approval", color: "bg-yellow-100 text-yellow-700" },
  accepted:         { label: "Accepted",         color: "bg-blue-100 text-blue-700" },
  pickup_scheduled: { label: "Pickup Scheduled", color: "bg-purple-100 text-purple-700" },
  collected:        { label: "Collected",         color: "bg-indigo-100 text-indigo-700" },
  in_transit:       { label: "In Transit",        color: "bg-orange-100 text-orange-700" },
  delivered:        { label: "Delivered",         color: "bg-teal-100 text-teal-700" },
  completed:        { label: "Completed",         color: "bg-emerald-100 text-emerald-700" },
  cancelled:        { label: "Cancelled",         color: "bg-red-100 text-red-700" },
  rejected:         { label: "Rejected",          color: "bg-red-100 text-red-700" },
}

const NEXT_STATUS: Record<string, string> = {
  accepted:         "pickup_scheduled",
  pickup_scheduled: "collected",
  collected:        "in_transit",
  in_transit:       "delivered",
}

export default function VolunteerDashboard() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Verification
  const [verif, setVerif] = useState<any>(null)
  const [verifUploading, setVerifUploading] = useState(false)
  const [verifError, setVerifError] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, bookingsRes] = await Promise.all([
        fetch("/api/volunteer/profile"),
        fetch("/api/transport-bookings"),
      ])
      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfile(data)
        setVerif(data.verification)
      }
      if (bookingsRes.ok) setBookings(await bookingsRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login")
    if (authStatus === "authenticated") fetchData()
  }, [authStatus, fetchData, router])

  const advanceBooking = async (bookingId: number, newStatus: string) => {
    setUpdatingId(bookingId)
    const res = await fetch(`/api/transport-bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      )
    }
    setUpdatingId(null)
  }

  // Photo upload for proof
  const uploadProof = async (bookingId: number, type: "pickup" | "delivery", file: File) => {
    setUpdatingId(bookingId)
    try {
      // Upload to Cloudinary
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      if (!uploadRes.ok) return
      const { url } = await uploadRes.json()

      // Submit proof
      await fetch(`/api/volunteer/upload-proof/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, photoUrl: url }),
      })

      // Refresh
      fetchData()
    } finally {
      setUpdatingId(null)
    }
  }

  // Verification submission
  const handleVerification = async (files: { selfie: File; idProof: File; vehiclePhoto: File; addressProof?: File }) => {
    setVerifUploading(true)
    setVerifError("")
    try {
      const uploads = await Promise.all([
        uploadFile(files.selfie),
        uploadFile(files.idProof),
        uploadFile(files.vehiclePhoto),
        files.addressProof ? uploadFile(files.addressProof) : Promise.resolve(null),
      ])

      const res = await fetch("/api/volunteer/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfieUrl: uploads[0],
          idProofUrl: uploads[1],
          vehiclePhotoUrl: uploads[2],
          addressProofUrl: uploads[3],
        }),
      })

      if (res.ok) {
        setVerif({ status: "pending" })
      } else {
        const d = await res.json()
        setVerifError(d.error || "Submission failed")
      }
    } catch {
      setVerifError("Upload failed")
    } finally {
      setVerifUploading(false)
    }
  }

  const pending = bookings.filter((b) => b.status === "pending_approval")
  const active = bookings.filter((b) =>
    ["accepted", "pickup_scheduled", "collected", "in_transit", "delivered"].includes(b.status)
  )
  const history = bookings.filter((b) => ["completed", "cancelled", "rejected"].includes(b.status))

  if (loading || authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Truck className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Volunteer Profile</h2>
        <p className="text-gray-500 mb-6">Register as a volunteer courier to get started.</p>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
          <Link href="/transporters/register">Register as Volunteer</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Volunteer Dashboard</h1>
          <p className="text-gray-500">Manage your deliveries and earn Green Points 🌱</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
            <Link href="/volunteer/available">
              <Package className="w-4 h-4" /> Find Deliveries
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Verification Banner */}
          {(!verif || verif.status !== "verified") && (
            <VerificationSection
              verif={verif}
              uploading={verifUploading}
              error={verifError}
              onSubmit={handleVerification}
            />
          )}

          {/* Bookings Tabs */}
          <Tabs defaultValue={pending.length > 0 ? "pending" : "active"} className="w-full">
            <TabsList className="bg-gray-100/50 mb-6 font-bold">
              <TabsTrigger value="pending">
                Pending
                {pending.length > 0 && (
                  <span className="ml-1 bg-yellow-500 text-white rounded-full px-1.5 py-0.5 text-xs">
                    {pending.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
              <TabsTrigger value="history">History ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pending.length === 0 ? (
                <EmptyState icon={<Clock className="w-10 h-10 text-gray-300" />} text="No pending approvals" />
              ) : (
                pending.map((b) => (
                  <DeliveryCard
                    key={b.id}
                    booking={b}
                    onAdvance={advanceBooking}
                    onUploadProof={uploadProof}
                    updating={updatingId === b.id}
                    isPending
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {active.length === 0 ? (
                <EmptyState icon={<Truck className="w-10 h-10 text-gray-300" />} text="No active deliveries" />
              ) : (
                active.map((b) => (
                  <DeliveryCard
                    key={b.id}
                    booking={b}
                    onAdvance={advanceBooking}
                    onUploadProof={uploadProof}
                    updating={updatingId === b.id}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {history.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="w-10 h-10 text-gray-300" />} text="No completed deliveries yet" />
              ) : (
                history.map((b) => (
                  <DeliveryCard key={b.id} booking={b} onAdvance={advanceBooking} onUploadProof={uploadProof} updating={false} readOnly />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card className="bg-emerald-900 text-white overflow-hidden relative border-none shadow-2xl shadow-emerald-200">
            <CardHeader>
              <CardTitle className="text-emerald-300 uppercase text-xs tracking-widest">Green Points</CardTitle>
              <CardTitle className="text-4xl font-black">{profile.user.greenPoints}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Leaf className="w-4 h-4" />
                <span>Level: {profile.user.level}</span>
              </div>
              {profile.stats.hasStreak && (
                <div className="mt-2 text-yellow-300 text-xs font-bold">🔥 Streak active! 1.5× bonus</div>
              )}
            </CardContent>
            <div className="absolute -bottom-4 -right-4 text-emerald-800/30">
              <BarChart3 className="w-32 h-32" />
            </div>
          </Card>

          {/* Delivery Stats */}
          <Card className="border-emerald-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Delivery Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatRow label="Total Deliveries" value={String(profile.stats.totalDeliveries)} />
              <StatRow label="Active" value={String(profile.stats.activeDeliveries)} />
              <StatRow label="This Week" value={String(profile.stats.recentDeliveriesThisWeek)} />
              <StatRow label="Total Distance" value={`${profile.stats.totalDistanceKm} km`} />
              <Separator />
              <StatRow label="Rating" value={profile.stats.avgRating > 0 ? `${Number(profile.stats.avgRating).toFixed(1)} ⭐` : "No ratings yet"} />
              <StatRow label="Vehicle" value={profile.profile.vehicleType?.replace("_", " ")} />
              <StatRow label="Capacity" value={`${profile.profile.vehicleCapacityKg} kg`} />
              <StatRow label="Service Area" value={profile.profile.serviceAreaCity} />
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${verif?.status === "verified" ? "text-emerald-600" : "text-gray-400"}`} />
                <span className="font-bold text-sm">
                  {verif?.status === "verified" ? "Verified Volunteer ✅" :
                   verif?.status === "pending" ? "Verification Pending ⏳" :
                   verif?.status === "rejected" ? "Verification Rejected ❌" :
                   "Not Verified"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// --- Sub-components ---

function StatRow({ label, value }: { label: string; value: string }) {
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

function DeliveryCard({
  booking, onAdvance, onUploadProof, updating, isPending = false, readOnly = false,
}: {
  booking: any
  onAdvance: (id: number, status: string) => void
  onUploadProof: (id: number, type: "pickup" | "delivery", file: File) => void
  updating: boolean
  isPending?: boolean
  readOnly?: boolean
}) {
  const meta = STATUS_META[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-600" }
  const nextStatus = NEXT_STATUS[booking.status]
  const tx = booking.transaction
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [proofType, setProofType] = useState<"pickup" | "delivery">("pickup")

  const needsPickupPhoto = booking.status === "accepted" || booking.status === "pickup_scheduled"
  const needsDeliveryPhoto = booking.status === "collected" || booking.status === "in_transit"

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUploadProof(booking.id, proofType, file)
  }

  const triggerPhotoUpload = (type: "pickup" | "delivery") => {
    setProofType(type)
    setTimeout(() => fileInputRef.current?.click(), 0)
  }

  return (
    <Card className="overflow-hidden border-gray-100 hover:shadow-md transition-shadow">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
      <CardHeader className="bg-gray-50/50 pb-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700 font-bold">#{String(booking.id).slice(0, 8)}</Badge>
            <Badge className={meta.color}>{meta.label}</Badge>
          </div>
          {!readOnly && (
            <Link href={`/volunteer/tracking/${booking.id}`}>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <Eye className="w-3 h-3" /> Track
              </Button>
            </Link>
          )}
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

            {/* Route */}
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="relative">
                <div className="absolute -left-[1.375rem] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pickup</p>
                <p className="font-semibold text-gray-700">{booking.pickupAddress || "—"}</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[1.375rem] top-1.5 w-3 h-3 rounded-full bg-red-500 ring-4 ring-white" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Delivery</p>
                <p className="font-semibold text-gray-700">{booking.deliveryAddress || "—"}</p>
              </div>
            </div>

            {/* Distance + contact info (only after accepted) */}
            {booking.status !== "pending_approval" && (
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span><Navigation className="w-3 h-3 inline" /> {booking.distanceKm} km</span>
                {booking.estimatedCost === 0 && (
                  <span className="text-emerald-600 font-bold">FREE (Volunteer)</span>
                )}
              </div>
            )}

            {/* Proof photos */}
            {booking.pickupPhotoUrl && (
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <Camera className="w-3 h-3" /> Pickup photo uploaded ✓
              </div>
            )}
            {booking.deliveryPhotoUrl && (
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <Camera className="w-3 h-3" /> Delivery photo uploaded ✓
              </div>
            )}
          </div>

          {/* Actions */}
          {!readOnly && (
            <div className="flex flex-col gap-2 justify-center md:w-48">
              {isPending && (
                <div className="text-center p-3 bg-yellow-50 rounded-xl text-yellow-700 text-sm">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Waiting for buyer &amp; seller to confirm
                  <div className="mt-1 text-xs text-yellow-600">
                    {booking.supplierConfirmed ? "✅ Seller confirmed" : "⏳ Seller pending"}
                    {" · "}
                    {booking.receiverConfirmed ? "✅ Buyer confirmed" : "⏳ Buyer pending"}
                  </div>
                </div>
              )}

              {needsPickupPhoto && (
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-10 text-sm gap-2"
                  onClick={() => triggerPhotoUpload("pickup")}
                  disabled={updating}
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  Upload Pickup Photo
                </Button>
              )}

              {needsDeliveryPhoto && (
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700 rounded-xl h-10 text-sm gap-2"
                  onClick={() => triggerPhotoUpload("delivery")}
                  disabled={updating}
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  Upload Delivery Photo
                </Button>
              )}

              {nextStatus && !needsPickupPhoto && !needsDeliveryPhoto && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-10 text-sm"
                  onClick={() => onAdvance(booking.id, nextStatus)}
                  disabled={updating}
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `Mark: ${STATUS_META[nextStatus]?.label ?? nextStatus}`
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function VerificationSection({
  verif, uploading, error, onSubmit,
}: {
  verif: any
  uploading: boolean
  error: string
  onSubmit: (files: { selfie: File; idProof: File; vehiclePhoto: File; addressProof?: File }) => void
}) {
  const [selfie, setSelfie] = useState<File | null>(null)
  const [idProof, setIdProof] = useState<File | null>(null)
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null)
  const [addressProof, setAddressProof] = useState<File | null>(null)

  if (verif?.status === "pending") {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-5 flex items-center gap-3">
          <Clock className="w-6 h-6 text-yellow-600" />
          <div>
            <p className="font-bold text-yellow-800">Verification Under Review</p>
            <p className="text-yellow-700 text-sm">Your documents are being reviewed. This usually takes a few hours.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (verif?.status === "verified") return null

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-amber-600" />
          Identity Verification
        </CardTitle>
        {verif?.status === "rejected" && (
          <p className="text-red-600 text-sm font-medium">Your previous submission was rejected. Please re-upload.</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm">
          Upload these documents to verify your identity. Required before claiming deliveries.
        </p>

        {error && <div className="p-2 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileInput label="Live Selfie *" icon={<Camera className="w-4 h-4" />} file={selfie} onSelect={setSelfie} accept="image/*" capture="user" />
          <FileInput label="ID Proof *" icon={<Shield className="w-4 h-4" />} file={idProof} onSelect={setIdProof} accept="image/*" />
          <FileInput label="Vehicle Photo *" icon={<Truck className="w-4 h-4" />} file={vehiclePhoto} onSelect={setVehiclePhoto} accept="image/*" />
          <FileInput label="Address Proof" icon={<MapPin className="w-4 h-4" />} file={addressProof} onSelect={setAddressProof} accept="image/*" />
        </div>

        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11"
          disabled={!selfie || !idProof || !vehiclePhoto || uploading}
          onClick={() => {
            if (selfie && idProof && vehiclePhoto) {
              onSubmit({ selfie, idProof, vehiclePhoto, addressProof: addressProof || undefined })
            }
          }}
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Submit Verification</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function FileInput({
  label, icon, file, onSelect, accept, capture,
}: {
  label: string; icon: React.ReactNode; file: File | null
  onSelect: (f: File) => void; accept?: string; capture?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <input
        type="file"
        ref={ref}
        className="hidden"
        accept={accept}
        capture={capture as any}
        onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`w-full p-3 border-2 border-dashed rounded-xl text-sm flex items-center gap-2 transition-all ${
          file
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-gray-200 hover:border-emerald-300 text-gray-500"
        }`}
      >
        {icon}
        {file ? file.name : label}
        {file && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-600" />}
      </button>
    </div>
  )
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/upload", { method: "POST", body: formData })
  if (!res.ok) throw new Error("Upload failed")
  const data = await res.json()
  return data.url
}
