"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Camera, Upload, Loader2, Leaf, IndianRupee, Trash2, ArrowRight, Check, Heart, MapPin, MessageSquare, Shield, Zap, Droplets, TreePine } from "lucide-react"
import { useSession } from "next-auth/react"

const conditionOptions = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "salvage", label: "Salvage" },
]
const units = ["kg", "tonnes", "pieces", "meters", "sq ft", "liters"]
const cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Surat", "Nagpur", "Indore", "Bhopal", "Chandigarh", "Kochi"]

export default function CreateListingPage() {
  const { data: session } = useSession()
  const [step, setStep] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingTags, setIsGeneratingTags] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [aiImpact, setAiImpact] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    condition: "",
    quantity: "",
    unit: "kg",
    price: "",
    listingType: "sell",
    city: "",
    address: "",
    locationLat: "",
    locationLng: "",
    tags: [] as string[],
    bargainEnabled: false,
    floorPrice: "",
    negotiationStyle: "moderate",
    autoAcceptPrice: "",
    dealSweeteners: "",
  })

  const { toast } = useToast()
  const router = useRouter()

  // Default city from session
  useEffect(() => {
    if (session?.user?.city && !formData.city) {
      setFormData(prev => ({ ...prev, city: (session.user as any).city }))
    }
  }, [session])

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // Show preview immediately
  const previewUrl = URL.createObjectURL(file)
  setImageUrl(previewUrl)

  // Upload to server
  setIsUploading(true)

  try {
    const uploadData = new FormData()
    uploadData.append("file", file)

    const res = await fetch("/api/upload", {
      method: "POST",
      body: uploadData,
    })

    const data = await res.json()

    if (res.ok && data.url) {
      setUploadedImageUrl(data.url)

      // Now run real AI analysis via Gemini Vision
      setIsAnalyzing(true)
      try {
        const aiRes = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: data.url,
            title: formData.title || undefined,
            description: formData.description || undefined,
          }),
        })
        const aiData = await aiRes.json()

        if (aiRes.ok && aiData.suggestedTitle) {
          // Auto-populate form with AI suggestions (user can override)
          setFormData(prev => ({
            ...prev,
            title: prev.title || aiData.suggestedTitle || prev.title,
            description: prev.description || aiData.suggestedDescription || prev.description,
            condition: aiData.estimatedCondition || prev.condition,
            tags: aiData.tags || prev.tags,
          }))
          setAiImpact(aiData.environmentalImpact || null)

          toast({
            title: "AI Analysis Complete",
            description: `Identified: ${aiData.detectedMaterial || "material"}. Title, description, tags & impact auto-filled!`,
          })
        } else {
          toast({
            title: "AI Analysis Partial",
            description: "Image uploaded but AI couldn't fully analyze. Fill details manually.",
          })
        }
      } catch (aiErr) {
        console.error("[CreateListing] AI analysis error:", aiErr)
        toast({
          title: "Image Uploaded",
          description: "AI analysis failed — please fill in details manually.",
        })
      } finally {
        setIsAnalyzing(false)
      }
    } else {
      toast({
        title: "Upload Failed",
        description: data.message || "Could not upload image.",
        variant: "destructive",
      })
    }
  } catch {
    toast({
      title: "Upload Failed",
      description: "Network error during upload.",
      variant: "destructive",
    })
  } finally {
    setIsUploading(false)
  }
}

  const generateTags = async () => {
    // If we already have AI-generated tags from image analysis, just proceed
    if (formData.tags.length > 0) {
      setStep(2)
      return
    }

    // If no image was analyzed, fall back to text-based tag generation
    setIsGeneratingTags(true)
    try {
      const resp = await fetch("/api/ai/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formData.title, description: formData.description }),
      })
      const data = await resp.json()
      if (data.tags) {
        setFormData(prev => ({ ...prev, tags: data.tags }))
        toast({
          title: "AI Tagging Complete",
          description: `Generated ${data.tags.length} smart tags for your listing.`,
        })
      }
    } catch (err) {
      console.error("[CreateListing] Tag generation error:", err)
    } finally {
      setIsGeneratingTags(false)
      setStep(2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        images: uploadedImageUrl ? [uploadedImageUrl] : [],
        // Pass AI-generated impact data to backend
        co2SavedKg: aiImpact?.co2SavedKg || 0,
        waterSavedLiters: aiImpact?.waterSavedLiters || 0,
        estimatedWeightKg: aiImpact?.landfillDiversionKg || null,
        aiDetectedType: aiImpact?.impactBasis || null,
      }
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Listing Created!",
          description: "Your material is now being scouted by our AI agents.",
        })
        router.push("/marketplace")
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create listing. Please try again.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">List Surplus Material</h1>
          <p className="text-gray-500">Share your materials and help build a zero-waste India.</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
            <div 
              key={s} 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                step === s ? "bg-emerald-600 text-white shadow-lg" : s < step ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
              }`}
            >
              {s < step ? <Check className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <Card className="border-emerald-100 shadow-xl shadow-emerald-50">
              <CardHeader>
                <CardTitle>Identify Material</CardTitle>
                <CardDescription>Upload a photo and provide a title and description.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div 
                  className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
                    imageUrl ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-400"
                  }`}
                >
                  {imageUrl ? (
                    <div className="relative group">
                      <img src={imageUrl} alt="Uploaded material" className="max-h-64 mx-auto rounded-2xl shadow-md" />
                      {(isAnalyzing || isUploading) && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                          <span className="font-bold text-emerald-800">{isUploading ? "Uploading image..." : "Scout AI is analyzing..."}</span>
                        </div>
                      )}
                      <button 
                        onClick={() => { setImageUrl(null); setUploadedImageUrl(null) }}
                        className="absolute -top-2 -right-2 bg-white p-2 rounded-full shadow-lg text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-4">
                      <div className="bg-emerald-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-emerald-600">
                        <Camera className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-gray-800">Click to capture or upload</p>
                        <p className="text-sm text-gray-500">Supports JPG, PNG, WEBP</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input 
                      placeholder="e.g. 500 Clay Bricks" 
                      value={formData.title} 
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      rows={4} 
                      className="rounded-xl"
                      placeholder="Tell receivers more about this material, its history, and potential uses..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={generateTags}
                  disabled={!formData.title || !formData.description || isGeneratingTags}
                  className="bg-emerald-600 hover:bg-emerald-700 min-w-[140px]"
                >
                  {isGeneratingTags ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI Tagging...
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-emerald-100 shadow-xl shadow-emerald-50">
              <CardHeader>
                <CardTitle>Specifications & Pricing</CardTitle>
                <CardDescription>Finalize details and set your price.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* AI Tags Preview */}
                {formData.tags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-emerald-700 font-bold flex items-center gap-2">
                      <Leaf className="w-4 h-4" /> Smart Tags (AI Generated)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select value={formData.condition} onValueChange={(v) => setFormData({...formData, condition: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select value={formData.city} onValueChange={(v) => setFormData({...formData, city: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-red-500" /> Pickup Address
                      <span className="text-xs text-gray-400 font-normal">— where the buyer will collect the material</span>
                    </Label>
                    <Input
                      placeholder="e.g. 42 Patel Nagar, Near Station Road, Andheri West"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            async (pos) => {
                              const lat = pos.coords.latitude
                              const lng = pos.coords.longitude
                              setFormData(prev => ({
                                ...prev,
                                locationLat: lat.toString(),
                                locationLng: lng.toString(),
                              }))
                              // Reverse-geocode to auto-fill address
                              try {
                                const geoRes = await fetch(
                                  `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
                                  { headers: { "Accept-Language": "en" } }
                                )
                                const geoData = await geoRes.json()
                                if (geoData?.address) {
                                  const a = geoData.address
                                  // Build a concise Indian-style address
                                  const parts = [
                                    a.road || a.neighbourhood || a.suburb,
                                    a.suburb !== (a.road || a.neighbourhood) ? a.suburb : null,
                                    a.city || a.town || a.village || a.state_district,
                                  ].filter(Boolean)
                                  const readableAddress = parts.join(", ") || geoData.display_name?.split(",").slice(0, 3).join(",")
                                  if (readableAddress) {
                                    setFormData(prev => ({
                                      ...prev,
                                      address: prev.address || readableAddress,
                                    }))
                                  }
                                }
                                toast({ title: "Location detected", description: "GPS coordinates & address auto-filled." })
                              } catch {
                                toast({ title: "Location detected", description: "GPS saved. Could not auto-detect address — please type it manually." })
                              }
                            },
                            () => toast({ title: "Location denied", description: "Enable location access for distance feature.", variant: "destructive" })
                          )
                        }
                      }}
                    >
                      📍 Use my current location
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="space-y-2 flex-grow">
                      <Label>Quantity</Label>
                      <Input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                    </div>
                    <div className="space-y-2 w-24">
                      <Label>Unit</Label>
                      <Select value={formData.unit} onValueChange={(v) => setFormData({...formData, unit: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator className="bg-emerald-100/50" />

                <div className="space-y-6">
                  <Label className="text-gray-700 font-bold">Listing Type</Label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setFormData({...formData, listingType: "sell"})}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.listingType === "sell" ? "border-emerald-500 bg-white shadow-md text-emerald-700" : "border-transparent text-gray-500 bg-gray-50/50"
                      }`}
                    >
                      <IndianRupee className="w-6 h-6" />
                      <span className="font-bold">Sell</span>
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, listingType: "donate"})}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.listingType === "donate" ? "border-emerald-500 bg-white shadow-md text-emerald-700" : "border-transparent text-gray-500 bg-gray-50/50"
                      }`}
                    >
                      <Heart className="w-6 h-6" />
                      <span className="font-bold">Giveaway</span>
                    </button>
                  </div>

                  {formData.listingType === "sell" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2 max-w-xs mx-auto text-center">
                        <Label>Asking Price (₹)</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                          <Input 
                            type="number" 
                            className="pl-10 text-xl font-bold h-12 border-emerald-100 focus:border-emerald-500" 
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                          />
                        </div>
                      </div>

                      {/* Bargain Settings */}
                      <Separator className="bg-emerald-100/50" />
                      <div className="space-y-4">
                        <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${formData.bargainEnabled ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 bg-gray-50/30 hover:border-gray-200'}`}
                          onClick={() => setFormData({...formData, bargainEnabled: !formData.bargainEnabled})}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${formData.bargainEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                              <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">Enable AI Bargaining</p>
                              <p className="text-xs text-gray-500">Let buyers negotiate price with an AI assistant</p>
                            </div>
                          </div>
                          <div className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${formData.bargainEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${formData.bargainEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                        </div>

                        {formData.bargainEnabled && (
                          <div className="space-y-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                Floor Price (₹) <span className="text-xs text-gray-400 font-normal">— minimum you&apos;ll accept (hidden from buyers)</span>
                              </Label>
                              <div className="relative max-w-xs">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                  type="number"
                                  className="pl-9 border-emerald-100 focus:border-emerald-500"
                                  placeholder="e.g. 3500"
                                  value={formData.floorPrice}
                                  onChange={(e) => setFormData({...formData, floorPrice: e.target.value})}
                                />
                              </div>
                              {formData.price && formData.floorPrice && parseFloat(formData.floorPrice) >= parseFloat(formData.price) && (
                                <p className="text-xs text-red-500">Floor price should be less than the asking price</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Negotiation Style</Label>
                              <div className="flex gap-2">
                                {(["firm", "moderate", "flexible"] as const).map((style) => (
                                  <button
                                    key={style}
                                    type="button"
                                    onClick={() => setFormData({...formData, negotiationStyle: style})}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                                      formData.negotiationStyle === style
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                  >
                                    {style === "firm" ? "🪨 Firm" : style === "moderate" ? "⚖️ Moderate" : "🤝 Flexible"}
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs text-gray-400">
                                {formData.negotiationStyle === "firm" ? "Small concessions (5-8% per round). Best when demand is high." :
                                 formData.negotiationStyle === "flexible" ? "Larger concessions (12-20% per round). Great for quick sales." :
                                 "Balanced concessions (8-15% per round). Recommended for most listings."}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                Auto-Accept Price (₹) <span className="text-xs text-gray-400 font-normal">— optional, instant deal if buyer offers this or more</span>
                              </Label>
                              <div className="relative max-w-xs">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                  type="number"
                                  className="pl-9 border-gray-200"
                                  placeholder="e.g. 4500"
                                  value={formData.autoAcceptPrice}
                                  onChange={(e) => setFormData({...formData, autoAcceptPrice: e.target.value})}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Deal Sweeteners <span className="text-xs text-gray-400 font-normal">— optional extras to close deals</span></Label>
                              <Textarea
                                className="border-gray-200 text-sm"
                                rows={2}
                                placeholder='e.g. "Free delivery within 5km", "Includes packaging"'
                                value={formData.dealSweeteners}
                                onChange={(e) => setFormData({...formData, dealSweeteners: e.target.value})}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-gray-50 pt-6">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 px-12 font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95">
                  Submit Listing
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Impact Preview */}
        <div className="space-y-6">
          <Card className="sticky top-24 border-emerald-100 bg-emerald-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">
                {aiImpact ? "AI-Estimated Impact" : "Estimated Impact"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-emerald-100">
                <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-emerald-700 uppercase font-bold tracking-wider">CO₂ Saved</p>
                  <p className="text-lg font-black text-emerald-950">
                    {aiImpact ? `${aiImpact.co2SavedKg} kg` : "Upload image for estimate"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-blue-100">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-blue-700 uppercase font-bold tracking-wider">Water Saved</p>
                  <p className="text-lg font-black text-blue-950">
                    {aiImpact ? `${aiImpact.waterSavedLiters} L` : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-green-100">
                <div className="bg-green-100 p-2 rounded-xl text-green-600">
                  <TreePine className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-green-700 uppercase font-bold tracking-wider">Tree Equivalent</p>
                  <p className="text-lg font-black text-green-950">
                    {aiImpact ? `${aiImpact.treeEquivalent} trees/yr` : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100">
                <div className="bg-gray-100 p-2 rounded-xl text-gray-600">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-700 uppercase font-bold tracking-wider">Circular Value</p>
                  <p className="text-lg font-black text-gray-950">₹{formData.price || "0"}</p>
                </div>
              </div>
              {aiImpact?.impactBasis && (
                <p className="text-xs text-gray-400 italic px-1">{aiImpact.impactBasis}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
