"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2, Recycle, IndianRupee, Heart, ArrowLeft, Save,
  MessageSquare, Shield, Zap
} from "lucide-react"

const conditionOptions = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "salvage", label: "Salvage" },
]
const units = ["kg", "tonnes", "pieces", "meters", "sq ft", "liters"]
const cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Surat", "Nagpur", "Indore", "Bhopal", "Chandigarh", "Kochi"]

export default function EditMaterialPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    condition: "",
    quantity: "",
    unit: "kg",
    price: "",
    listingType: "sell",
    city: "",
    status: "available",
    bargainEnabled: false,
    floorPrice: "",
    negotiationStyle: "moderate",
    autoAcceptPrice: "",
    dealSweeteners: "",
  })

  useEffect(() => {
    fetch(`/api/materials/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.message) {
          toast({ title: "Error", description: data.message, variant: "destructive" })
          router.push("/dashboard/my-listings")
          return
        }
        // Check ownership
        if (session?.user?.id && data.userId !== session.user.id) {
          toast({ title: "Forbidden", description: "You can only edit your own listings.", variant: "destructive" })
          router.push(`/materials/${id}`)
          return
        }
        setFormData({
          title: data.title || "",
          description: data.description || "",
          condition: data.condition || "good",
          quantity: String(data.quantity || 1),
          unit: data.unit || "kg",
          price: String(data.price || 0),
          listingType: data.listingType || "sell",
          city: data.city || "",
          status: data.status || "available",
          bargainEnabled: data.bargainEnabled || false,
          floorPrice: data.floorPrice ? String(data.floorPrice) : "",
          negotiationStyle: data.negotiationStyle || "moderate",
          autoAcceptPrice: data.autoAcceptPrice ? String(data.autoAcceptPrice) : "",
          dealSweeteners: data.dealSweeteners || "",
        })
        setLoading(false)
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load material.", variant: "destructive" })
        setLoading(false)
      })
  }, [id, session?.user?.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        condition: formData.condition,
        quantity: parseInt(formData.quantity) || 1,
        unit: formData.unit,
        price: parseFloat(formData.price) || 0,
        listingType: formData.listingType,
        city: formData.city,
        status: formData.status,
        bargainEnabled: formData.bargainEnabled,
        negotiationStyle: formData.negotiationStyle,
        dealSweeteners: formData.dealSweeteners || null,
      }

      const fp = parseFloat(formData.floorPrice)
      payload.floorPrice = isNaN(fp) ? null : fp

      const aap = parseFloat(formData.autoAcceptPrice)
      payload.autoAcceptPrice = isNaN(aap) ? null : aap

      const res = await fetch(`/api/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast({ title: "Saved!", description: "Your listing has been updated." })
        router.push(`/materials/${id}`)
      } else {
        const data = await res.json()
        toast({ title: "Error", description: data.message || "Failed to save.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Recycle className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-gray-500">Loading material...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
          <p className="text-gray-500 text-sm">Update your material details</p>
        </div>
      </div>

      <Card className="border-emerald-100 shadow-lg">
        <CardHeader>
          <CardTitle>Material Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {conditionOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Select value={formData.city} onValueChange={(v) => setFormData({ ...formData, city: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="space-y-2 flex-grow">
                <Label>Quantity</Label>
                <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
              </div>
              <div className="space-y-2 w-24">
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Listing Type */}
          <div className="space-y-4">
            <Label className="font-bold">Listing Type</Label>
            <div className="flex gap-4">
              <button
                onClick={() => setFormData({ ...formData, listingType: "sell" })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  formData.listingType === "sell" ? "border-emerald-500 bg-white shadow-md text-emerald-700" : "border-transparent text-gray-500 bg-gray-50/50"
                }`}
              >
                <IndianRupee className="w-6 h-6" />
                <span className="font-bold">Sell</span>
              </button>
              <button
                onClick={() => setFormData({ ...formData, listingType: "donate" })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  formData.listingType === "donate" ? "border-emerald-500 bg-white shadow-md text-emerald-700" : "border-transparent text-gray-500 bg-gray-50/50"
                }`}
              >
                <Heart className="w-6 h-6" />
                <span className="font-bold">Giveaway</span>
              </button>
            </div>

            {formData.listingType === "sell" && (
              <div className="space-y-6">
                <div className="space-y-2 max-w-xs">
                  <Label>Asking Price (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                    <Input
                      type="number"
                      className="pl-10 text-xl font-bold h-12 border-emerald-100"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>

                <Separator className="bg-emerald-100/50" />

                {/* Bargain Settings */}
                <div className="space-y-4">
                  <div
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${formData.bargainEnabled ? "border-emerald-500 bg-emerald-50/50" : "border-gray-100 bg-gray-50/30"}`}
                    onClick={() => setFormData({ ...formData, bargainEnabled: !formData.bargainEnabled })}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${formData.bargainEnabled ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">Enable AI Bargaining</p>
                        <p className="text-xs text-gray-500">Let buyers negotiate price with an AI assistant</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${formData.bargainEnabled ? "bg-emerald-500" : "bg-gray-300"}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${formData.bargainEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </div>

                  {formData.bargainEnabled && (
                    <div className="space-y-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-emerald-600" />
                          Floor Price (₹) <span className="text-xs text-gray-400 font-normal">— minimum you'll accept</span>
                        </Label>
                        <div className="relative max-w-xs">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            type="number"
                            className="pl-9 border-emerald-100"
                            value={formData.floorPrice}
                            onChange={(e) => setFormData({ ...formData, floorPrice: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Negotiation Style</Label>
                        <div className="flex gap-2">
                          {(["firm", "moderate", "flexible"] as const).map((style) => (
                            <button
                              key={style}
                              type="button"
                              onClick={() => setFormData({ ...formData, negotiationStyle: style })}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                                formData.negotiationStyle === style
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                                  : "border-gray-200 text-gray-500"
                              }`}
                            >
                              {style === "firm" ? "🪨 Firm" : style === "moderate" ? "⚖️ Moderate" : "🤝 Flexible"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          Auto-Accept Price (₹) <span className="text-xs text-gray-400 font-normal">— optional</span>
                        </Label>
                        <div className="relative max-w-xs">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            type="number"
                            className="pl-9"
                            value={formData.autoAcceptPrice}
                            onChange={(e) => setFormData({ ...formData, autoAcceptPrice: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Deal Sweeteners <span className="text-xs text-gray-400 font-normal">— optional</span></Label>
                        <Textarea
                          className="text-sm"
                          rows={2}
                          placeholder='"Free delivery within 5km", "Includes packaging"'
                          value={formData.dealSweeteners}
                          onChange={(e) => setFormData({ ...formData, dealSweeteners: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.title}
            className="bg-emerald-600 hover:bg-emerald-700 px-8 font-bold"
          >
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="mr-2 w-4 h-4" /> Save Changes</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
