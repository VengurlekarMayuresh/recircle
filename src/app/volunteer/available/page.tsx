"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Package, MapPin, Leaf, ArrowRight, Loader2, Truck, Weight,
  Navigation, RefreshCw, AlertTriangle
} from "lucide-react"

export default function AvailableDeliveriesPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [verificationStatus, setVerificationStatus] = useState<string>("loading")

  const fetchDeliveries = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/volunteer/available-deliveries")
      if (res.ok) {
        setDeliveries(await res.json())
      } else {
        const d = await res.json()
        setError(d.error || "Failed to load deliveries")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const fetchVerification = async () => {
    try {
      const res = await fetch("/api/volunteer/verify")
      if (res.ok) {
        const d = await res.json()
        setVerificationStatus(d.status || "none")
      }
    } catch {
      setVerificationStatus("none")
    }
  }

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login")
    if (authStatus === "authenticated") {
      fetchDeliveries()
      fetchVerification()
    }
  }, [authStatus, router])

  const handleClaim = async (transactionId: string) => {
    setClaiming(transactionId)
    try {
      const res = await fetch("/api/volunteer/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      })
      const data = await res.json()
      if (res.ok) {
        // Remove from list and redirect to dashboard
        setDeliveries((prev) => prev.filter((d) => d.transactionId !== transactionId))
        router.push("/volunteer/dashboard")
      } else {
        setError(data.error || "Failed to claim")
      }
    } catch {
      setError("Network error")
    } finally {
      setClaiming(null)
    }
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    )
  }

  const needsVerification = verificationStatus !== "verified"

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Available Deliveries</h1>
          <p className="text-gray-500 mt-1">Claim a delivery to earn Green Points and help the community</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={fetchDeliveries}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Verification Warning */}
      {needsVerification && verificationStatus !== "loading" && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Verification Required</p>
            <p className="text-amber-700 text-sm mt-1">
              {verificationStatus === "pending"
                ? "Your verification is under review. You'll be able to claim deliveries once approved."
                : verificationStatus === "rejected"
                ? "Your verification was declined. Please re-submit your documents."
                : "You need to complete identity verification before claiming deliveries."}
            </p>
            {verificationStatus !== "pending" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => router.push("/volunteer/dashboard")}
              >
                Go to Verification
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      {deliveries.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed">
          <Truck className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No deliveries available</h3>
          <p className="text-gray-500">Check back soon — new deliveries appear when items need transport.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deliveries.map((d: any) => {
            const images = d.material.images ? d.material.images.split(",") : []
            const firstImage = images[0]

            return (
              <Card key={d.transactionId} className="border-none shadow-md hover:shadow-lg transition-all overflow-hidden">
                <CardContent className="p-0">
                  {/* Image */}
                  {firstImage && (
                    <div className="h-40 bg-gray-100 overflow-hidden">
                      <img src={firstImage} alt={d.material.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="p-5 space-y-4">
                    {/* Title + badges */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-900">{d.material.title}</h3>
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs capitalize">
                          {d.material.listingType}
                        </Badge>
                      </div>
                      {d.material.category && (
                        <span className="text-xs text-gray-400">{d.material.category.name}</span>
                      )}
                    </div>

                    {/* Route info */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Pickup</p>
                          <p className="text-sm text-gray-700">{d.pickupAddress || d.supplier.city}</p>
                          <p className="text-xs text-gray-400">From: {d.supplier.name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Delivery</p>
                          <p className="text-sm text-gray-700">{d.deliveryAddress || d.receiver.city}</p>
                          <p className="text-xs text-gray-400">To: {d.receiver.name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {d.estimatedDistance > 0 && (
                        <div className="flex items-center gap-1">
                          <Navigation className="w-4 h-4 text-blue-500" />
                          <span>{d.estimatedDistance} km</span>
                        </div>
                      )}
                      {d.material.weightKg && (
                        <div className="flex items-center gap-1">
                          <Weight className="w-4 h-4 text-gray-400" />
                          <span>{d.material.weightKg} kg</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Leaf className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-emerald-600">+{d.estimatedPoints} GP</span>
                      </div>
                    </div>

                    {/* Claim button */}
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11 gap-2"
                      disabled={needsVerification || claiming === d.transactionId}
                      onClick={() => handleClaim(d.transactionId)}
                    >
                      {claiming === d.transactionId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Package className="w-4 h-4" />
                          Claim This Delivery
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
