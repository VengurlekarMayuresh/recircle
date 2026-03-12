"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function NewWantRequestPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [categories, setCategories] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    keywords: "",
    quantityNeeded: "1",
    city: "",
    radiusKm: "10",
    urgency: "medium"
  })

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    fetch("/api/categories").then(r => r.json()).then(setCategories).catch(() => {})
  }, [status])

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.categoryId) { setError("Title and category are required"); return }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/want-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: parseInt(form.categoryId),
          quantityNeeded: parseInt(form.quantityNeeded),
          radiusKm: parseInt(form.radiusKm)
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || "Failed to post request"); return }
      router.push("/want-board")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "loading") return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/want-board" className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Want Board
      </Link>

      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Post a Want Request</CardTitle>
          <p className="text-gray-500 text-sm">Tell the community what you're looking for. Suppliers will see your request and may list matching materials.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="title">What are you looking for? *</Label>
              <Input
                id="title"
                placeholder="e.g. Surplus construction bricks, 200 pieces"
                value={form.title}
                onChange={e => set("title", e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="cat">Category *</Label>
              <Select value={form.categoryId} onValueChange={v => set("categoryId", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                placeholder="Describe your requirements in detail — purpose, specifications, quality needed..."
                value={form.description}
                onChange={e => set("description", e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="kw">Keywords (comma-separated)</Label>
              <Input
                id="kw"
                placeholder="bricks, construction, reclaimed"
                value={form.keywords}
                onChange={e => set("keywords", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Helps suppliers find your request</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qty">Quantity Needed</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  value={form.quantityNeeded}
                  onChange={e => set("quantityNeeded", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="radius">Search Radius (km)</Label>
                <Select value={form.radiusKm} onValueChange={v => set("radiusKm", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 km</SelectItem>
                    <SelectItem value="10">10 km</SelectItem>
                    <SelectItem value="25">25 km</SelectItem>
                    <SelectItem value="50">50 km</SelectItem>
                    <SelectItem value="100">100 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Mumbai"
                  value={form.city}
                  onChange={e => set("city", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Urgency</Label>
                <Select value={form.urgency} onValueChange={v => set("urgency", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low — whenever available</SelectItem>
                    <SelectItem value="medium">🟡 Medium — within a month</SelectItem>
                    <SelectItem value="high">🔴 High — urgent / ASAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting...</> : "Post Want Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
