"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Filter, Recycle, Leaf, IndianRupee, Clock, ArrowRight } from "lucide-react"

export default function MarketplacePage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = ["All", "Construction", "Furniture", "Packaging", "Electronics", "Industrial", "Textiles", "Metals", "Wood"]

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await fetch("/api/materials")
        const data = await res.json()
        setMaterials(data)
      } catch (err) {
        console.error("Failed to fetch materials:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMaterials()
  }, [])

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = (m.title + m.description + m.tags).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || m.category?.name === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            className="pl-10 h-12 rounded-xl shadow-sm border-gray-200"
            placeholder="Search for bricks, desks, textiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-12 rounded-xl border-gray-200 flex gap-2">
            <MapPin className="w-5 h-5" /> City
          </Button>
          <Button variant="outline" className="h-12 rounded-xl border-gray-200 flex gap-2">
            <Filter className="w-5 h-5" /> Filter
          </Button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex overflow-x-auto gap-2 mb-10 pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
              selectedCategory === cat 
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" 
                : "bg-white text-gray-600 border border-gray-100 hover:border-emerald-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Recycle className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-gray-500 font-medium">Scouting for materials...</p>
        </div>
      ) : (
        <>
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500 text-lg">No materials found matching your search.</p>
              <Link href="/materials/new" className="text-emerald-600 font-bold hover:underline mt-2 inline-block">
                Be the first to list one!
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMaterials.map((material) => (
                <Link key={material.id} href={`/marketplace/${material.id}`}>
                  <Card className="group overflow-hidden rounded-2xl border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                    <div className="relative h-48 w-full overflow-hidden">
                      <img 
                        src={material.images?.split(',')[0]} 
                        alt={material.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b"
                        }}
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge className={material.listingType === "giveaway" ? "bg-emerald-500" : "bg-blue-500"}>
                          {material.listingType === "giveaway" || material.listingType === "donate" ? "Free" : "For Sale"}
                        </Badge>
                        <Badge variant="outline" className="bg-white/80 backdrop-blur-sm border-none text-gray-800 capitalize">
                          {material.condition}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-bold text-gray-800 line-clamp-1">{material.title}</CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-1 text-xs font-medium">
                        <MapPin className="w-3 h-3" /> {material.city}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-black text-emerald-600">
                          {material.price === 0 ? "FREE" : `₹${material.price}`}
                        </span>
                        <span className="text-sm text-gray-500 font-medium">
                          {material.quantity} {material.unit}
                        </span>
                      </div>
                      
                      {/* Tags Preview */}
                      {material.tags && (
                        <div className="flex flex-wrap gap-1">
                          {material.tags.split(',').slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Impact Metrics */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 p-1.5 rounded-lg">
                          <Leaf className="w-3.5 h-3.5" />
                          <span>{material.co2SavedKg || (material.quantity * 0.5).toFixed(1)}kg CO₂</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 p-1.5 rounded-lg">
                          <Recycle className="w-3.5 h-3.5" />
                          <span className="capitalize">{material.category?.name || "Material"}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(material.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-emerald-600">
                        View Details <ArrowRight className="w-3 h-3" />
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
