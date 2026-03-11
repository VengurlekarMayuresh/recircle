"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Filter, Leaf, IndianRupee, Clock, ArrowUpRight, BarChart3, Package, Users, Recycle } from "lucide-react"

export default function SupplierDashboard() {
  const { data: session } = useSession()
  const [listings, setListings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMyListings = async () => {
      try {
        const res = await fetch("/api/materials?own=true")
        if (res.ok) {
          const data = await res.json()
          setListings(data)
        }
      } catch (err) {
        console.error("Failed to fetch my listings:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMyListings()
  }, [])

  // Calculate live stats
  const totalCo2 = listings.reduce((acc, curr) => acc + (curr.quantity * 0.5), 0).toFixed(0)
  const totalValue = listings.reduce((acc, curr) => acc + curr.price, 0).toLocaleString()
  const activeCount = listings.filter(l => l.status === 'available' || l.status === 'Active').length

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Recycle className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Supplier Dashboard</h1>
          <p className="text-gray-500">Manage your surplus materials and track your environmental impact.</p>
        </div>
        <Link href="/materials/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6 rounded-xl shadow-lg shadow-emerald-100 flex gap-2">
            <Plus className="w-5 h-5" /> New Listing
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="bg-emerald-50 border-emerald-100 overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-700 font-bold uppercase text-xs tracking-wider">Total CO₂ Saved</CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-900">{totalCo2} kg</CardTitle>
          </CardHeader>
          <div className="absolute top-4 right-4 text-emerald-200">
            <Leaf className="w-12 h-12" />
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-100 overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-700 font-bold uppercase text-xs tracking-wider">Circular Value Created</CardDescription>
            <CardTitle className="text-3xl font-black text-blue-900">₹{totalValue}</CardTitle>
          </CardHeader>
          <div className="absolute top-4 right-4 text-blue-200">
            <IndianRupee className="w-12 h-12" />
          </div>
        </Card>
        <Card className="bg-amber-50 border-amber-100 overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-700 font-bold uppercase text-xs tracking-wider">Active Listings</CardDescription>
            <CardTitle className="text-3xl font-black text-amber-900">{activeCount}</CardTitle>
          </CardHeader>
          <div className="absolute top-4 right-4 text-amber-200">
            <Package className="w-12 h-12" />
          </div>
        </Card>
        <Card className="bg-purple-50 border-purple-100 overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-700 font-bold uppercase text-xs tracking-wider">Trust Score</CardDescription>
            <CardTitle className="text-3xl font-black text-purple-900">92/100</CardTitle>
          </CardHeader>
          <div className="absolute top-4 right-4 text-purple-200">
            <Users className="w-12 h-12" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="active" className="rounded-lg px-6">Active Listings</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg px-6">Past Successes</TabsTrigger>
          <TabsTrigger value="impact" className="rounded-lg px-6">Impact Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {listings.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No listings found</h3>
                <p className="text-gray-500 mb-6">You haven't added any materials yet.</p>
                <Link href="/materials/new">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">Create Your First Listing</Button>
                </Link>
              </div>
            ) : (
              listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-all border-gray-100">
                  <CardContent className="p-0 flex flex-col md:flex-row">
                    <div className="w-full md:w-48 h-48 md:h-auto shrink-0 overflow-hidden">
                      <img 
                        src={listing.images?.split(',')[0] || "https://images.unsplash.com/photo-1590069324154-04663e9f4577"} 
                        alt={listing.title} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b"
                        }}
                      />
                    </div>
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{listing.title}</h3>
                          <Badge className={`${
                            listing.status === "available" || listing.status === "Active" 
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-100" 
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          } capitalize`}>
                            {listing.status}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-500 mb-4 flex-wrap">
                          <span className="flex items-center gap-1 font-medium"><IndianRupee className="w-4 h-4" /> {listing.price || "Free"}</span>
                          <span className="flex items-center gap-1 font-medium"><Package className="w-4 h-4" /> {listing.quantity} {listing.unit}</span>
                          <span className="flex items-center gap-1 font-medium text-emerald-600"><BarChart3 className="w-4 h-4" /> AI Scout: Active</span>
                        </div>
                        {listing.tags && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {listing.tags.split(',').slice(0, 3).map((tag: string) => (
                              <span key={tag} className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">#{tag.trim()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex gap-2">
                          <div className="bg-emerald-50 px-3 py-1 rounded-lg text-emerald-700 text-xs font-bold flex items-center gap-1">
                            <Leaf className="w-3 h-3" /> {(listing.quantity * 0.5).toFixed(1)}kg CO₂
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/marketplace/${listing.id}`}>
                            <Button variant="outline" size="sm" className="rounded-lg">View Details</Button>
                          </Link>
                          <Button variant="secondary" size="sm" className="rounded-lg text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100">See AI Matches</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No completed exchanges yet</h3>
            <p className="text-gray-500">Your materials will appear here once they've been successfully rehoused.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
