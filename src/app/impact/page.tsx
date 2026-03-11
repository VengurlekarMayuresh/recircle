"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Leaf, 
  IndianRupee, 
  Trash2, 
  Globe, 
  Award, 
  CheckCircle2,
  Zap,
  TrendingUp,
  Package,
  Users,
  Building2,
  Factory
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ImpactDashboard() {
  const platformStats = [
    { label: "Total CO₂ Saved", value: "1,240 Tonnes", icon: Leaf, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Waste Diverted", value: "850 Tonnes", icon: Trash2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Circular Value", value: "₹45.2M", icon: IndianRupee, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Active Reusers", value: "12,400+", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
  ]

  const records = [
    { city: "Mumbai", co2: "450t", materials: "Construction", growth: "+12%" },
    { city: "Delhi", co2: "320t", materials: "Packaging", growth: "+8%" },
    { city: "Surat", co2: "210t", materials: "Textiles", growth: "+24%" },
    { city: "Pune", co2: "180t", materials: "Electronics", growth: "+15%" },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-10 text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Our Collective Impact</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">Track how the ReCircle community is transforming India's economy from linear to circular, one material at a time.</p>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {platformStats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-xl shadow-gray-100 overflow-hidden group">
            <CardHeader className={`${stat.bg} pb-6 relative overflow-hidden`}>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <stat.icon className="w-32 h-32" />
              </div>
              <CardDescription className={`${stat.color} font-bold uppercase text-xs tracking-widest`}>{stat.label}</CardDescription>
              <CardTitle className="text-3xl font-black text-gray-900">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Impact by Sector */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-gray-100">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-bold">Top Performing Regions</CardTitle>
                  <CardDescription>Cities leading the circularity movement.</CardDescription>
                </div>
                <Globe className="w-6 h-6 text-gray-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {records.map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 transition-colors cursor-default group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-gray-700">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{record.city}</p>
                        <p className="text-xs text-gray-500">{record.materials} Primary</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-600">{record.co2} CO₂</p>
                      <p className="text-xs font-bold text-emerald-400 group-hover:animate-bounce">{record.growth}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-emerald-100 bg-emerald-50/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex gap-2 items-center">
                  <Building2 className="w-5 h-5 text-emerald-600" /> Business Success
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-emerald-50">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Procurement Saving</p>
                  <p className="text-2xl font-black">₹1.2 Cr+</p>
                  <p className="text-xs text-gray-400 mt-1">Saved by businesses through material reuse.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-100 bg-blue-50/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex gap-2 items-center">
                  <Factory className="w-5 h-5 text-blue-600" /> Industrial Circularity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-blue-50">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Materials Recovered</p>
                  <p className="text-2xl font-black">120,000 kg</p>
                  <p className="text-xs text-gray-400 mt-1">Industrial surplus successfully rerouted.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: Gamification Preview */}
        <div className="space-y-6">
          <Card className="border-emerald-100 shadow-2xl shadow-emerald-50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-500" /> Hall of Fame
              </CardTitle>
              <CardDescription>Celebrating our top Waste Warriors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              {[
                { name: "BuildWell Corp", points: "15,200", badge: "Waste Titan", color: "bg-amber-100 text-amber-700" },
                { name: "Habitat NGO", points: "12,450", badge: "Social Hero", color: "bg-blue-100 text-blue-700" },
                { name: "Anita S.", points: "8,900", badge: "Loop Expert", color: "bg-purple-100 text-purple-700" },
              ].map((user, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-bold text-gray-700 border-2 border-white shadow-sm">
                      {idx + 1 === 1 ? "🥇" : idx + 1 === 2 ? "🥈" : "🥉"}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <Badge className={`${user.color} border-none text-[10px] font-black uppercase tracking-widest`}>{user.badge}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">{user.points}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">GP Total</p>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="pt-2 text-center">
                <p className="text-xs text-gray-500 mb-4 font-medium italic">"Every brick re-used is a step towards a cleaner India."</p>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 font-bold flex gap-2">
                  <Zap className="w-5 h-5" /> View My Rank
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Special Achievement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-white/30 rotate-12">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-bold text-xl">Plastic-Free Quarter</h4>
                <p className="text-emerald-100 text-sm mt-1">The community diverted 5,000kg of single-use plastic via industrial circularity.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
