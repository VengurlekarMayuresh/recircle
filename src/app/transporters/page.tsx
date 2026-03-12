"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, Star, MapPin, Weight, IndianRupee, Leaf, Search } from "lucide-react"

const CITIES = ["","Mumbai","Delhi","Pune","Bangalore","Surat","Ahmedabad","Chennai","Kolkata","Hyderabad","Jaipur"]
const VEHICLE_LABELS: Record<string, string> = {
  mini_truck: "Mini Truck", pickup_van: "Pickup Van", tempo: "Tempo",
  autorickshaw: "Auto Rickshaw", bike: "Bike", other: "Other",
}
const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  busy: "bg-yellow-100 text-yellow-700",
  offline: "bg-gray-100 text-gray-600",
}

export default function BrowseTransportersPage() {
  const [transporters, setTransporters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState("")
  const [vehicleType, setVehicleType] = useState("")

  const fetchTransporters = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (city) params.set("city", city)
    if (vehicleType) params.set("vehicle_type", vehicleType)
    try {
      const res = await fetch(`/api/transporters?${params}`)
      if (res.ok) setTransporters(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTransporters() }, [city, vehicleType])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse Transporters</h1>
        <p className="text-gray-500 mt-1">Find transporters to move materials between suppliers and receivers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-44 bg-white">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map(c => <SelectItem key={c || "_all"} value={c}>{c || "All Cities"}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={vehicleType} onValueChange={setVehicleType}>
          <SelectTrigger className="w-44 bg-white">
            <SelectValue placeholder="All Vehicles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Vehicles</SelectItem>
            {Object.entries(VEHICLE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchTransporters} className="gap-1">
          <Search className="w-4 h-4" /> Search
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transporters.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No transporters found</h3>
          <p className="text-gray-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transporters.map((t: any) => (
            <Card key={t.id} className="border-none shadow-md hover:shadow-lg transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg">
                      {t.user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{t.user?.name}</h3>
                      {t.isVolunteer && <Badge className="bg-green-100 text-green-700 text-xs">Volunteer</Badge>}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" /> {t.serviceAreaCity} · {t.serviceRadiusKm}km radius
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[t.availabilityStatus] || "bg-gray-100 text-gray-600"}>
                    {t.availabilityStatus}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{VEHICLE_LABELS[t.vehicleType] || t.vehicleType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Weight className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{t.vehicleCapacityKg} kg capacity</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <IndianRupee className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>
                      {t.isVolunteer ? (
                        <span className="text-emerald-700 font-medium">FREE (Volunteer)</span>
                      ) : (
                        <>₹{t.baseRate} base + ₹{t.pricePerKm}/km</>
                      )}
                    </span>
                  </div>
                  {t.avgRating > 0 && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                      <span>{Number(t.avgRating).toFixed(1)} ({t.totalRatings} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Leaf className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{t.totalDeliveries} deliveries completed</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-4 bg-blue-50 p-2 rounded-lg">
                  💡 To book this transporter, go to your active transaction and select "Book Transporter"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
