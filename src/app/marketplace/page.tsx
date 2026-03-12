"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Filter, Recycle, Leaf, Clock, ArrowRight, Sparkles, Star, TrendingUp, Check, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { MarketplaceGridSkeleton } from "@/components/skeleton-card"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

export default function MarketplacePage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedCity, setSelectedCity] = useState("All")
  const [selectedCondition, setSelectedCondition] = useState("All")
  const [selectedListingType, setSelectedListingType] = useState("All")
  const [discoveredSuppliers, setDiscoveredSuppliers] = useState<any[]>([])
  const [isDiscovering, setIsDiscovering] = useState(false)

  const categories = ["All", "Construction", "Furniture", "Packaging", "Electronics", "Industrial", "Textiles", "Metals", "Wood"]
  const conditions = ["All", "new", "like_new", "good", "fair", "salvage"]
  const conditionLabels: Record<string, string> = { All: "All Conditions", new: "New", like_new: "Like New", good: "Good", fair: "Fair", salvage: "Salvage" }
  const listingTypes = ["All", "sell", "donate", "exchange"]
  const listingTypeLabels: Record<string, string> = { All: "All Types", sell: "For Sale", donate: "Free / Donate", exchange: "Exchange" }

  const cities = ["All", ...Array.from(new Set(materials.map(m => m.city).filter(Boolean))).sort()]

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await fetch("/api/materials")
        if (!res.ok) throw new Error("Failed to load materials")
        const data = await res.json()
        setMaterials(data)
      } catch (err) {
        console.error("Failed to fetch materials:", err)
        toast({
          title: "Could not load materials",
          description: "Please check your connection and try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchMaterials()
  }, [])

  const activeFilterCount = [selectedCity, selectedCondition, selectedListingType].filter(v => v !== "All").length

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = (m.title + m.description + m.tags).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || m.category?.name === selectedCategory
    const matchesCity = selectedCity === "All" || m.city === selectedCity
    const matchesCondition = selectedCondition === "All" || m.condition === selectedCondition
    const matchesListingType = selectedListingType === "All" || m.listingType === selectedListingType
    return matchesSearch && matchesCategory && matchesCity && matchesCondition && matchesListingType
  })

  // Trigger supplier discovery when search yields 0 results
  useEffect(() => {
    if (filteredMaterials.length === 0 && searchQuery.length >= 3 && !isLoading) {
      const timer = setTimeout(async () => {
        setIsDiscovering(true)
        try {
          const params = new URLSearchParams({ query: searchQuery })
          if (selectedCategory !== 'All') params.set('category', selectedCategory)
          const res = await fetch(`/api/supplier-discovery/trigger?${params}`)
          const data = await res.json()
          setDiscoveredSuppliers(data.suppliers || [])
        } catch {}
        finally { setIsDiscovering(false) }
      }, 800)
      return () => clearTimeout(timer)
    } else {
      setDiscoveredSuppliers([])
    }
  }, [filteredMaterials.length, searchQuery, selectedCategory, isLoading])

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
          {/* City Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={`h-12 rounded-xl flex gap-2 ${
                selectedCity !== "All" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-gray-200"
              }`}>
                <MapPin className="w-5 h-5" />
                {selectedCity === "All" ? "City" : selectedCity}
                {selectedCity !== "All" && (
                  <X className="w-3.5 h-3.5 ml-1 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setSelectedCity("All") }} />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
              <DropdownMenuLabel>Filter by City</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {cities.map(city => (
                <DropdownMenuItem
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  {city === "All" ? "All Cities" : city}
                  {selectedCity === city && <Check className="w-4 h-4 text-emerald-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={`h-12 rounded-xl flex gap-2 ${
                activeFilterCount > 0 ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-gray-200"
              }`}>
                <Filter className="w-5 h-5" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Condition</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {conditions.map(c => (
                <DropdownMenuItem
                  key={c}
                  onClick={() => setSelectedCondition(c)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  {conditionLabels[c]}
                  {selectedCondition === c && <Check className="w-4 h-4 text-emerald-600" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Listing Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {listingTypes.map(lt => (
                <DropdownMenuItem
                  key={lt}
                  onClick={() => setSelectedListingType(lt)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  {listingTypeLabels[lt]}
                  {selectedListingType === lt && <Check className="w-4 h-4 text-emerald-600" />}
                </DropdownMenuItem>
              ))}
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setSelectedCondition("All"); setSelectedListingType("All") }}
                    className="text-red-600 cursor-pointer font-medium"
                  >
                    <X className="w-4 h-4 mr-2" /> Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
        <MarketplaceGridSkeleton count={8} />
      ) : (
        <>
          {filteredMaterials.length === 0 ? (
            <div className="space-y-8">
              <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No exact matches found</p>
                <p className="text-gray-400 mt-1">Try different keywords or browse all categories</p>
                <Link href="/materials/new" className="mt-4 inline-block bg-emerald-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-emerald-700 transition">
                  List a material
                </Link>
              </div>

              {/* Supplier Discovery Section */}
              {(isDiscovering || discoveredSuppliers.length > 0) && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Predictive Supplier Discovery</h3>
                      <p className="text-sm text-gray-500">We found potential suppliers who might have what you need</p>
                    </div>
                  </div>

                  {isDiscovering ? (
                    <div className="flex items-center gap-3 py-4">
                      <Recycle className="w-5 h-5 text-amber-500 animate-spin" />
                      <span className="text-gray-600">AI is scanning past suppliers...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {discoveredSuppliers.map((supplier: any) => (
                        <div key={supplier.userId} className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                              {supplier.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{supplier.name}</p>
                              <p className="text-xs text-gray-500">{supplier.orgName || supplier.city}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {supplier.avgRating.toFixed(1)}
                                </div>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-500">{supplier.pastListingCount} past listings</span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                {Math.round(supplier.likelihoodScore)}% match
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Link
                              href={`/profile/${supplier.userId}`}
                              className="flex-1 text-center text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl py-1.5 hover:border-emerald-300 transition"
                            >
                              View Profile
                            </Link>
                            <Link
                              href={`/want-board/new`}
                              className="flex-1 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-1.5 hover:bg-emerald-100 transition"
                            >
                              Post Want Request
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Discovery powered by ReCircle Scout AI — based on historical listing patterns
                  </p>
                </div>
              )}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {filteredMaterials.map((material) => (
                <motion.div
                  key={material.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
                  }}
                >
                <Link href={`/materials/${material.id}`}>
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
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
