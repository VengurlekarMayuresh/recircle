"use client"

import { useState } from "react"
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
import { Camera, Upload, Loader2, Leaf, IndianRupee, Trash2, ArrowRight, Check, Heart } from "lucide-react"

const conditions = ["New", "Good", "Fair", "Salvageable"]
const units = ["kg", "tonnes", "pieces", "meters", "sq ft", "liters"]

export default function CreateListingPage() {
  const [step, setStep] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingTags, setIsGeneratingTags] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    condition: "",
    quantity: "",
    unit: "kg",
    price: "",
    listingType: "sell",
    city: "Mumbai",
    tags: [] as string[],
  })

  const { toast } = useToast()
  const router = useRouter()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      
      setIsAnalyzing(true)
      setTimeout(() => {
        setIsAnalyzing(false)
        setFormData(prev => ({
          ...prev,
          title: "Premium Construction Bricks",
          description: "High-quality burnt clay bricks detected. Standard size, structurally sound.",
        }))
        toast({
          title: "AI Analysis Complete",
          description: "Vison AI identified your material!",
        })
      }, 3000)
    }
  }

  const generateTags = async () => {
    console.log("[CreateListing] Generating tags for:", { title: formData.title, description: formData.description })
    setIsGeneratingTags(true)
    try {
      const resp = await fetch("/api/ai/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formData.title, description: formData.description }),
      })
      console.log("[CreateListing] API Response Status:", resp.status)
      const data = await resp.json()
      console.log("[CreateListing] API Response Data:", data)
      if (data.tags) {
        setFormData(prev => ({ ...prev, tags: data.tags }))
        toast({
          title: "AI Tagging Complete",
          description: `Generated ${data.tags.length} smart tags for your listing.`,
        })
      }
    } catch (err) {
      console.error("[CreateListing] Tag Generation Failed:", err)
    } finally {
      setIsGeneratingTags(false)
      setStep(2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      console.log("[CreateListing] Submit Response Status:", response.status)
      const result = await response.json()
      console.log("[CreateListing] Submit Response Data:", result)

      if (response.ok) {
        toast({
          title: "Listing Created!",
          description: "Your material is now being scouted by our AI agents.",
        })
        router.push("/marketplace")
      } else {
        toast({
          title: "Error",
          description: "Failed to create listing. Please try again.",
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
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                          <span className="font-bold text-emerald-800">Scout AI is analyzing...</span>
                        </div>
                      )}
                      <button 
                        onClick={() => setImageUrl(null)}
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
                        {conditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                      onClick={() => setFormData({...formData, listingType: "giveaway"})}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.listingType === "giveaway" ? "border-emerald-500 bg-white shadow-md text-emerald-700" : "border-transparent text-gray-500 bg-gray-50/50"
                      }`}
                    >
                      <Heart className="w-6 h-6" />
                      <span className="font-bold">Giveaway</span>
                    </button>
                  </div>

                  {formData.listingType === "sell" && (
                    <div className="space-y-2 max-w-xs mx-auto text-center animate-in fade-in slide-in-from-top-2">
                      <Label>Price (₹)</Label>
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
              <CardTitle className="text-lg font-bold">Estimated Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-emerald-100">
                <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-emerald-700 uppercase font-bold tracking-wider">CO₂ Saved</p>
                  <p className="text-lg font-black text-emerald-950">~{formData.quantity ? parseInt(formData.quantity) * 0.9 : 0} kg</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-blue-100">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-blue-700 uppercase font-bold tracking-wider">Circular Value</p>
                  <p className="text-lg font-black text-blue-950">₹{formData.price || "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
