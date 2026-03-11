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
import { useToast } from "@/components/ui/use-toast"
import { Camera, Upload, Loader2, Leaf, IndianRupee, Trash2, ArrowRight, Check } from "lucide-react"

const conditions = ["New", "Good", "Fair", "Salvageable"]
const units = ["kg", "tonnes", "pieces", "meters", "sq ft", "liters"]

export default function CreateListingPage() {
  const [step, setStep] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    categoryId: "",
    condition: "",
    quantity: "",
    unit: "kg",
    description: "",
    price: "",
    listingType: "sell",
    city: "Mumbai",
  })

  const { toast } = useToast()
  const router = useRouter()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Mock image upload
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      
      // Trigger AI Analysis mock
      setIsAnalyzing(true)
      setTimeout(() => {
        setIsAnalyzing(false)
        setFormData(prev => ({
          ...prev,
          title: "Premium Construction Bricks",
          categoryId: "construction",
          condition: "Good",
          description: "High-quality burnt clay bricks discovered via AI detection. Standard size, structurally sound.",
        }))
        toast({
          title: "AI Analysis Complete",
          description: "We've automatically filled in some details for you.",
        })
      }, 3000)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: "Listing Created!",
      description: "Your material is now being scouted by our AI agents.",
    })
    router.push("/marketplace")
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">List Surplus Material</h1>
          <p className="text-gray-500">Share your materials and help build a zero-waste India.</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
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
                <CardDescription>Upload a photo or enter details. Our AI Vision will help identify the material.</CardDescription>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input 
                      placeholder="e.g. 500 Clay Bricks" 
                      value={formData.title} 
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.categoryId} onValueChange={(v) => setFormData({...formData, categoryId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="packaging">Packaging</SelectItem>
                        <SelectItem value="textiles">Textiles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={() => setStep(2)}
                  disabled={!formData.title || !formData.categoryId}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-emerald-100 shadow-xl shadow-emerald-50">
              <CardHeader>
                <CardTitle>Specifications & Quantity</CardTitle>
                <CardDescription>Provide details about the material's condition and quantity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} className="bg-emerald-600 hover:bg-emerald-700">Continue</Button>
              </CardFooter>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-emerald-100 shadow-xl shadow-emerald-50">
              <CardHeader>
                <CardTitle>Finalize Listing</CardTitle>
                <CardDescription>Set your price and listing type.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
                  <button 
                    onClick={() => setFormData({...formData, listingType: "sell"})}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.listingType === "sell" ? "border-emerald-500 bg-white shadow-md text-emerald-700" : "border-transparent text-gray-500"
                    }`}
                  >
                    <IndianRupee className="w-6 h-6" />
                    <span className="font-bold">Sell</span>
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, listingType: "giveaway"})}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.listingType === "giveaway" ? "border-emerald-500 bg-white shadow-md text-emerald-700" : "border-transparent text-gray-500"
                    }`}
                  >
                    <Heart className="w-6 h-6" />
                    <span className="font-bold">Giveaway</span>
                  </button>
                </div>

                {formData.listingType === "sell" && (
                  <div className="space-y-2 max-w-xs mx-auto text-center">
                    <Label>Price (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input 
                        type="number" 
                        className="pl-10 text-xl font-bold h-12" 
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 px-12">Submit Listing</Button>
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
