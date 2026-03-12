"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MapPin, Mail, User, Leaf, Award, Shield, Star,
  Edit3, Save, X, TrendingUp, CheckCircle, Package
} from "lucide-react"
import Link from "next/link"

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
const LEVEL_XP: Record<string, number> = {
  seedling: 100, sprout: 500, sapling: 1500, tree: 5000, forest: 99999,
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const user = session?.user as any

  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [impact, setImpact] = useState<any>(null)
  const [form, setForm] = useState({
    name: "", phone: "", bio: "", orgName: "", address: "", city: "",
  })

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        bio: user.bio || "",
        orgName: user.orgName || "",
        address: user.address || "",
        city: user.city || "",
      })
    }
  }, [user])

  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/users/${user.id}/reviews`).then(r => r.ok ? r.json() : []).then(setReviews).catch(() => {})
    fetch(`/api/dashboard/impact`).then(r => r.ok ? r.json() : null).then(setImpact).catch(() => {})
  }, [user?.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) { await update(); setEditMode(false) }
    } finally { setSaving(false) }
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Please log in to view your profile</h1>
        <Link href="/login"><Button className="bg-emerald-600">Login</Button></Link>
      </div>
    )
  }

  const level = user?.level || "seedling"
  const gp = user?.greenPoints ?? user?.green_points ?? 0
  const nextThreshold = LEVEL_XP[level] ?? 100
  const levelProgress = Math.min((gp / nextThreshold) * 100, 100)
  const verLevel = user?.verificationLevel || user?.verification_level || "unverified"

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header card */}
        <Card className="border-none shadow-xl overflow-hidden mb-8">
          <div className="h-36 bg-gradient-to-br from-emerald-600 to-teal-700" />
          <CardContent className="px-8 pb-8 pt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16">
              <Avatar className="h-28 w-28 border-4 border-white shadow-lg shrink-0">
                <AvatarImage src={user?.image || user?.avatarUrl} />
                <AvatarFallback className="text-3xl bg-emerald-100 text-emerald-700">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-1">
                <h1 className="text-2xl font-bold text-gray-900 mt-2 sm:mt-0">{user?.name}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="capitalize gap-1"><User className="w-3 h-3" /> {user?.role}</Badge>
                  <Badge className={LEVEL_COLORS[level]}><Leaf className="w-3 h-3 mr-1" />{level.charAt(0).toUpperCase() + level.slice(1)}</Badge>
                  <Badge className={VERIFICATION_COLORS[verLevel]}><Shield className="w-3 h-3 mr-1" />{verLevel.charAt(0).toUpperCase() + verLevel.slice(1)}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600"><Save className="w-4 h-4 mr-1" />{saving ? "Saving…" : "Save"}</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditMode(false)}><X className="w-4 h-4 mr-1" />Cancel</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditMode(true)}><Edit3 className="w-4 h-4 mr-1" />Edit Profile</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar */}
          <div className="space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" />Green Points</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-black text-emerald-700">🌱 {gp} GP</div>
                <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${levelProgress}%` }} /></div>
                <p className="text-xs text-gray-500">{gp}/{nextThreshold} GP to next level</p>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Trust Score</span>
                  <span className="font-bold text-emerald-700">{user?.trustScore ?? user?.trust_score ?? 0}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg Rating</span>
                  <span className="font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />{user?.avgRating ?? user?.avg_rating ?? 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-gray-700">Contact Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {editMode ? (
                  <div className="space-y-3">
                    <div><Label className="text-xs">Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                    <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                    <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                    <div><Label className="text-xs">Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                    {(user?.role === "business" || user?.role === "ngo") && (
                    <div><Label className="text-xs">Organisation</Label><Input value={form.orgName} onChange={e => setForm({ ...form, orgName: e.target.value })} /></div>
                    )}
                    <div><Label className="text-xs">Bio</Label><Textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself…" /></div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{user?.email}</div>
                    <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{user?.city || "—"}</div>
                    {(user?.orgName || user?.org_name) && <div className="flex items-center gap-2 text-gray-600"><User className="w-4 h-4 text-gray-400" />{user?.orgName || user?.org_name}</div>}
                    {user?.bio && <p className="text-gray-500 text-xs leading-relaxed mt-2">{user.bio}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="badges">
              <TabsList className="bg-gray-100 p-1 rounded-xl mb-6">
                <TabsTrigger value="badges" className="rounded-lg px-5">Badges</TabsTrigger>
                <TabsTrigger value="impact" className="rounded-lg px-5">Impact</TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-lg px-5">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="badges">
                <Card className="border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-5">
                      {["Early Adopter","Waste Warrior","Green Hero","Community Champion"].map(b => (
                        <div key={b} className="flex flex-col items-center gap-1.5 w-20">
                          <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow ring-4 ring-orange-50 hover:scale-105 transition-transform">
                            <Award className="w-7 h-7" />
                          </div>
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide text-center">{b}</span>
                        </div>
                      ))}
                      <div className="flex flex-col items-center gap-1.5 w-20 opacity-30 grayscale">
                        <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 shadow ring-4 ring-gray-50"><Award className="w-7 h-7" /></div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center">Locked</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="impact">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "CO₂ Saved", value: `${impact?.co2_saved ?? 0} kg`, color: "bg-emerald-50", icon: <Leaf className="w-5 h-5 text-emerald-500" /> },
                      { label: "₹ Saved", value: `₹${impact?.rupees_saved ?? 0}`, color: "bg-blue-50", icon: <TrendingUp className="w-5 h-5 text-blue-500" /> },
                      { label: "kg Diverted", value: `${impact?.kg_diverted ?? 0} kg`, color: "bg-purple-50", icon: <Package className="w-5 h-5 text-purple-500" /> },
                      { label: "Transactions", value: impact?.transaction_count ?? 0, color: "bg-teal-50", icon: <CheckCircle className="w-5 h-5 text-teal-500" /> },
                    ].map(({ label, value, color, icon }) => (
                      <Card key={label} className={`border-none shadow-sm ${color}`}>
                        <CardContent className="p-5 flex items-center gap-3">
                          {icon}<div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-black text-gray-800">{value}</p></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-sm mb-3">Impact Equivalencies</h3>
                      <div className="space-y-1.5 text-sm text-gray-600">
                        <p>🌳 <strong>{Math.round((impact?.co2_saved ?? 0) / 22)} trees planted</strong></p>
                        <p>🏠 <strong>{Math.round((impact?.co2_saved ?? 0) / 500)} households</strong> powered for a month</p>
                        <p>🛺 <strong>{Math.round((impact?.co2_saved ?? 0) / 1200)} auto-rickshaw trips</strong> offset</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="reviews">
                {reviews.length === 0 ? (
                  <div className="text-center py-14 bg-gray-50 rounded-2xl border border-dashed">
                    <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No reviews received yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r: any) => (
                      <Card key={r.id} className="border-none shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                              {r.reviewer?.name?.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-semibold text-sm">{r.reviewer?.name}</span>
                                <span className="text-xs text-gray-400">{new Date(r.createdAt || r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>
                              </div>
                              <div className="flex gap-0.5 mt-1">
                                {Array.from({length:5}).map((_,i)=>(
                                  <Star key={i} className={`w-3.5 h-3.5 ${i<r.rating?"text-yellow-500 fill-yellow-400":"text-gray-200"}`} />
                                ))}
                              </div>
                              {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
