"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  MapPin, Star, Package, ArrowUpRight, Award, Shield,
  Truck, Leaf, CheckCircle, User, Building2, Heart
} from "lucide-react"

const LEVEL_COLORS: Record<string, string> = {
  seedling: "bg-green-100 text-green-700",
  sprout:   "bg-lime-100 text-lime-700",
  sapling:  "bg-teal-100 text-teal-700",
  tree:     "bg-emerald-100 text-emerald-700",
  forest:   "bg-emerald-200 text-emerald-900",
}

const VERIFICATION_COLORS: Record<string, string> = {
  unverified: "bg-gray-100 text-gray-600",
  basic:      "bg-blue-100 text-blue-700",
  verified:   "bg-indigo-100 text-indigo-700",
  trusted:    "bg-purple-100 text-purple-700",
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  individual:  <User className="w-4 h-4" />,
  business:    <Building2 className="w-4 h-4" />,
  ngo:         <Heart className="w-4 h-4" />,
  transporter: <Truck className="w-4 h-4" />,
  volunteer:   <Leaf className="w-4 h-4" />,
}

export default function PublicProfilePage() {
  const params = useParams()
  const userId = params.id as string

  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      try {
        const [pRes, rRes, lRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/users/${userId}/reviews`),
          fetch(`/api/materials?userId=${userId}&status=available&limit=6`),
        ])
        if (pRes.ok) setProfile(await pRes.json())
        if (rRes.ok) setReviews(await rRes.json())
        if (lRes.ok) {
          const data = await lRes.json()
          setListings(Array.isArray(data) ? data : data.materials || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500">Loading profile…</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
          <p className="text-gray-500 mt-2">This profile does not exist.</p>
          <Link href="/marketplace">
            <Button className="mt-4 bg-emerald-600">Go to Marketplace</Button>
          </Link>
        </div>
      </div>
    )
  }

  const verificationLabel = profile.verificationLevel
    ? profile.verificationLevel.charAt(0).toUpperCase() + profile.verificationLevel.slice(1)
    : "Unverified"
  const levelLabel = profile.level
    ? profile.level.charAt(0).toUpperCase() + profile.level.slice(1)
    : "Seedling"
  const roleLabel = profile.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "Member"

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header card */}
        <Card className="border-none shadow-xl overflow-hidden mb-8">
          <div className="h-36 bg-gradient-to-br from-emerald-600 to-teal-700" />
          <CardContent className="px-8 pb-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16">
              <Avatar className="h-28 w-28 border-4 border-white shadow-lg shrink-0">
                <AvatarImage src={profile.avatarUrl} />
                <AvatarFallback className="text-3xl bg-emerald-100 text-emerald-700">
                  {profile.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-2xl font-bold text-gray-900 mt-2 sm:mt-0">{profile.name}</h1>
                {profile.orgName && (
                  <p className="text-gray-500 text-sm mt-0.5">{profile.orgName}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="capitalize gap-1">
                    {ROLE_ICONS[profile.role]} {roleLabel}
                  </Badge>
                  {profile.city && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="w-3 h-3" /> {profile.city}
                    </Badge>
                  )}
                  <Badge className={VERIFICATION_COLORS[profile.verificationLevel || "unverified"]}>
                    <Shield className="w-3 h-3 mr-1" /> {verificationLabel}
                  </Badge>
                  <Badge className={LEVEL_COLORS[profile.level || "seedling"]}>
                    <Leaf className="w-3 h-3 mr-1" /> {levelLabel}
                  </Badge>
                </div>
                {profile.bio && (
                  <p className="text-gray-600 text-sm mt-3 max-w-xl">{profile.bio}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar: stats */}
          <div className="space-y-6">
            {/* Trust & Points */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-700">Trust & Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Trust Score</span>
                  <span className="font-bold text-emerald-700">{profile.trustScore ?? 0}/100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${profile.trustScore ?? 0}%` }}
                  />
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Green Points</span>
                  <span className="font-bold text-green-700">🌱 {profile.greenPoints ?? 0} GP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Avg Rating</span>
                  <span className="font-bold flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                    {profile.avgRating ? Number(profile.avgRating).toFixed(1) : "N/A"}
                    <span className="text-gray-400 text-xs">({profile.totalRatings ?? 0})</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-700">Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: <Package className="w-4 h-4 text-blue-500" />, label: "Total Listings", value: profile.total_listings ?? listings.length },
                  { icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, label: "Completed Exchanges", value: profile.total_exchanges ?? 0 },
                  { icon: <Leaf className="w-4 h-4 text-green-500" />, label: "CO₂ Saved", value: `${profile.co2_saved ?? 0} kg` },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-500">{icon}{label}</span>
                    <span className="font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Transporter info */}
            {(profile.role === "transporter" || profile.role === "volunteer") && profile.transporter && (
              <Card className="border-none shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Transporter Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vehicle</span>
                    <span className="capitalize font-medium">{profile.transporter.vehicleType?.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-medium">{profile.transporter.vehicleCapacityKg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rate</span>
                    <span className="font-medium">
                      {profile.transporter.isVolunteer ? "FREE (Volunteer)" : `₹${profile.transporter.pricePerKm}/km`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deliveries</span>
                    <span className="font-medium">{profile.transporter.totalDeliveries}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Badges */}
            {profile.badges && profile.badges.length > 0 && (
              <Card className="border-none shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" /> Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {profile.badges.map((ub: any) => (
                      <div
                        key={ub.badge?.id}
                        title={ub.badge?.description}
                        className="flex flex-col items-center gap-1 w-16"
                      >
                        <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-sm">
                          <Award className="w-6 h-6" />
                        </div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide text-center leading-tight">
                          {ub.badge?.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Reviews + Listings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent listings */}
            {listings.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Active Listings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listings.map((m: any) => (
                    <Link key={m.id} href={`/materials/${m.id}`}>
                      <Card className="border hover:shadow-md transition-all overflow-hidden group">
                        <div className="h-36 overflow-hidden bg-gray-100">
                          {m.images?.[0] ? (
                            <img
                          src={m.images?.split(",")[0]}
                              alt={m.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package className="w-10 h-10" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">{m.title}</h3>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className="text-xs capitalize">{m.condition?.replace(/_/g, " ")}</Badge>
                            <span className="text-xs text-gray-500 flex items-center gap-0.5">
                              <ArrowUpRight className="w-3 h-3" /> View
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Reviews ({reviews.length})
              </h2>
              {reviews.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed">
                  <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r: any) => (
                    <Card key={r.id} className="border-none shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={r.reviewer?.avatarUrl} />
                            <AvatarFallback className="text-sm bg-emerald-100 text-emerald-700">
                              {r.reviewer?.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-gray-900">{r.reviewer?.name}</span>
                              <span className="text-xs text-gray-400">
                              {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                            <div className="flex gap-0.5 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < r.rating ? "text-yellow-500 fill-yellow-400" : "text-gray-200"}`}
                                />
                              ))}
                            </div>
                            {r.comment && <p className="text-sm text-gray-600 mt-1.5">{r.comment}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
