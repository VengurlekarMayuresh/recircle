"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, CheckCircle } from "lucide-react"

const CITIES = ["Mumbai","Delhi","Pune","Bangalore","Surat","Ahmedabad","Chennai","Kolkata","Hyderabad","Jaipur"]
const VEHICLE_TYPES = [
  { value: "mini_truck", label: "Mini Truck" },
  { value: "pickup_van", label: "Pickup Van" },
  { value: "tempo", label: "Tempo" },
  { value: "autorickshaw", label: "Auto Rickshaw" },
  { value: "bike", label: "Bike" },
  { value: "other", label: "Other" },
]

export default function TransporterRegisterPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const user = session?.user as any
  const isVolunteer = user?.role === "volunteer"

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/transporters/register")
    }
  }, [status, router])

  const [form, setForm] = useState({
    vehicle_type: "",
    vehicle_capacity_kg: "",
    vehicle_capacity_cbm: "",
    service_area_city: user?.city || "",
    service_radius_km: "25",
    price_per_km: "",
    base_rate: "",
    is_volunteer: isVolunteer,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/transporters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, is_volunteer: isVolunteer || form.is_volunteer }),
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => router.push("/transporters/dashboard"), 1500)
      } else {
        const d = await res.json()
        setError(d.error || "Registration failed")
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">You're registered!</h2>
          <p className="text-gray-500">Redirecting to your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Truck className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Register as {isVolunteer ? "Volunteer Courier" : "Transporter"}</h1>
        <p className="text-gray-500 mt-1">Fill in your vehicle details to start accepting deliveries</p>
        {isVolunteer && (
          <p className="text-emerald-600 text-sm mt-2 font-medium">🌱 As a Volunteer Courier, your rates are set to ₹0 automatically. Earn Green Points instead!</p>
        )}
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

            <div>
              <Label>Vehicle Type *</Label>
              <Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })} required>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Capacity (kg) *</Label>
                <Input type="number" required min="1" className="mt-1"
                  value={form.vehicle_capacity_kg} onChange={e => setForm({ ...form, vehicle_capacity_kg: e.target.value })} />
              </div>
              <div>
                <Label>Capacity (cbm)</Label>
                <Input type="number" min="0" step="0.1" className="mt-1"
                  value={form.vehicle_capacity_cbm} onChange={e => setForm({ ...form, vehicle_capacity_cbm: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Service Area City *</Label>
              <Select value={form.service_area_city} onValueChange={v => setForm({ ...form, service_area_city: v })} required>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service Radius (km): {form.service_radius_km} km</Label>
              <input type="range" min="5" max="100" step="5" className="w-full mt-1 accent-emerald-600"
                value={form.service_radius_km} onChange={e => setForm({ ...form, service_radius_km: e.target.value })} />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>5 km</span><span>100 km</span></div>
            </div>

            {!isVolunteer && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price per km (₹) *</Label>
                  <Input type="number" required min="0" step="0.5" className="mt-1"
                    value={form.price_per_km} onChange={e => setForm({ ...form, price_per_km: e.target.value })} />
                </div>
                <div>
                  <Label>Base Rate (₹) *</Label>
                  <Input type="number" required min="0" className="mt-1"
                    value={form.base_rate} onChange={e => setForm({ ...form, base_rate: e.target.value })} />
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 h-11">
              {loading ? "Registering…" : "Register as Transporter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
