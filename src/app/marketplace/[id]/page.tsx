"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  MapPin, 
  Leaf, 
  IndianRupee, 
  Calendar, 
  ShieldCheck, 
  QrCode, 
  Share2, 
  ArrowLeft, 
  Truck, 
  MessageSquare,
  Package,
  History,
  Info,
  Recycle
} from "lucide-react"

// Mock material detail based on ID
const material = {
  id: "1",
  title: "Surplus Bricks (500 pieces)",
  description: "Leftover burnt clay bricks from recent project. Good condition, ready for pickup. These bricks were sourced from a sustainable kiln in Maharashtra and have high thermal mass.",
  price: 2500,
  unit: "pieces",
  quantity: 500,
  city: "Mumbai",
  address: "Andheri East, Near SEEPZ",
  category: "Construction",
  condition: "Good",
  co2SavedKg: 450,
  landfillDivertedKg: 1500,
  listingType: "sell",
  createdAt: "2024-03-10",
  supplier: {
    name: "BuildWell Corp",
    rating: 4.8,
    isVerified: true,
  },
  images: ["https://images.unsplash.com/photo-1590069324154-04663e9f4577"],
  passportId: "RC-BRK-2024-001",
}

export default function MaterialDetailPage() {
  const [showQr, setShowQr] = useState(false)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/marketplace" className="inline-flex items-center gap-2 text-emerald-600 font-semibold mb-6 hover:translate-x-1 transition-transform">
        <ArrowLeft className="w-5 h-5" /> Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Images and Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative group overflow-hidden rounded-3xl shadow-xl">
            <img 
              src={material.images[0]} 
              alt={material.title} 
              className="w-full h-[400px] object-cover"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <Button size="icon" variant="secondary" className="rounded-full bg-white/80 backdrop-blur-md border-none shadow-md">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold px-3 py-1">
                    {material.category}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-bold px-3 py-1">
                    {material.condition}
                  </Badge>
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{material.title}</h1>
                <div className="flex items-center gap-2 text-gray-500 mt-2 font-medium">
                  <MapPin className="w-5 h-5 text-red-500" /> {material.address}, {material.city}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-emerald-600">₹{material.price.toLocaleString()}</p>
                <p className="text-gray-500 font-medium">{material.quantity} {material.unit}</p>
              </div>
            </div>

            <Card className="border-emerald-100 bg-emerald-50/30 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-emerald-700">Environmental Impact</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm">
                  <div className="bg-emerald-100 p-2 rounded-xl">
                    <Leaf className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-emerald-900">{material.co2SavedKg} kg</p>
                    <p className="text-xs text-gray-500 font-bold">CO₂ Saved</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm">
                  <div className="bg-blue-100 p-2 rounded-xl">
                    <Recycle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-blue-900">{material.landfillDivertedKg} kg</p>
                    <p className="text-xs text-gray-500 font-bold">Landfill Diverted</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Info className="w-6 h-6 text-emerald-600" /> About this Material
              </h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                {material.description}
              </p>
            </div>

            <Separator />

            {/* Digital Material Passport */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" /> Digital Material Passport
                </h2>
                <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase">
                  ID: {material.passportId}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-gray-100 bg-gray-50/50">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Provenance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Original Project</span>
                      <span className="font-bold">Worli Greens Ph II</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Manufacturing Date</span>
                      <span className="font-bold">Oct 2023</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Listed On</span>
                      <span className="font-bold">{material.createdAt}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-gray-100 bg-gray-50/50">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Material Composition</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Primary Material</span>
                      <span className="font-bold">Burnt Clay</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Recyclability</span>
                      <span className="font-bold text-emerald-600">100% Circular</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Estimated Life</span>
                      <span className="font-bold">80+ Years</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Booking and Supplier */}
        <div className="space-y-6">
          <Card className="sticky top-24 border-emerald-100 shadow-2xl shadow-emerald-50">
            <CardHeader>
              <CardTitle>Interested?</CardTitle>
              <CardDescription>Request this material and choose your transport method.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Scout AI Status</p>
                  <p className="text-emerald-950 font-bold">Verifying Supply Match...</p>
                </div>
                <div className="relative">
                  <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-100 flex gap-2">
                  <MessageSquare className="w-6 h-6" /> Chat with Supplier
                </Button>
                <Button variant="outline" className="w-full border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 h-14 rounded-2xl font-bold text-lg shadow-sm flex gap-2">
                  <Truck className="ml-2 w-6 h-6" /> Book Transport
                </Button>
              </div>

              <div className="pt-4 flex flex-col items-center">
                <Button 
                  variant="ghost" 
                  className="text-gray-400 hover:text-emerald-600 flex gap-2"
                  onClick={() => setShowQr(!showQr)}
                >
                  <QrCode className="w-4 h-4" /> {showQr ? "Hide QR Code" : "Show Passport QR"}
                </Button>
                {showQr && (
                  <div className="mt-4 p-4 bg-white rounded-2xl border-2 border-dashed border-gray-100 animate-in zoom-in-95 duration-200">
                    {/* Placeholder for QR Code */}
                    <div className="w-40 h-40 bg-gray-100 flex items-center justify-center rounded-lg border border-gray-200">
                      <QrCode className="w-16 h-16 text-gray-300" />
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-2 font-mono uppercase tracking-[0.2em]">Scan for Passport</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 hover:border-emerald-100 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-400">Supplied By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600 text-xl border-2 border-white shadow-sm">
                  {material.supplier.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center gap-1">
                    {material.supplier.name}
                    {material.supplier.isVerified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                  </h4>
                  <div className="flex items-center gap-1 text-sm text-amber-500 font-bold">
                    <span>★</span>
                    <span>{material.supplier.rating}</span>
                    <span className="text-gray-400 font-medium ml-1">Rating</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" className="w-full mt-4 text-emerald-600 font-bold rounded-xl border border-emerald-50 hover:bg-emerald-50">
                View Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
