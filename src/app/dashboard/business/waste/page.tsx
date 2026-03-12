"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  Loader2, Plus, Pencil, Trash2, TrendingUp, AlertCircle, Sparkles, Tag, X,
} from "lucide-react"

export default function BusinessWasteDashboard() {
  const [streams, setStreams] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingTags, setIsGeneratingTags] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [monthlyVolumeKg, setMonthlyVolumeKg] = useState("")
  const [unit, setUnit] = useState("kg")
  const [tags, setTags] = useState<string[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [streamsRes, catsRes] = await Promise.all([
        fetch("/api/business/waste-streams"),
        fetch("/api/categories"),
      ])
      if (streamsRes.ok) {
        const d = await streamsRes.json()
        setStreams(d.wasteStreams)
      }
      if (catsRes.ok) {
        const d = await catsRes.json()
        setCategories(d.categories || d)
      }
    } catch (error) {
      console.error(error)
      toast({ title: "Failed to load data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const resetForm = () => {
    setCategoryId("")
    setTitle("")
    setDescription("")
    setMonthlyVolumeKg("")
    setUnit("kg")
    setTags([])
    setEditingId(null)
  }

  const handleOpenEdit = (stream: any) => {
    setEditingId(stream.id)
    setCategoryId(stream.categoryId.toString())
    setTitle(stream.title || "")
    setDescription(stream.description || "")
    setMonthlyVolumeKg(stream.monthlyVolumeKg.toString())
    setUnit(stream.unit || "kg")
    setTags(stream.tags ? JSON.parse(stream.tags) : [])
    setDialogOpen(true)
  }

  const generateTags = async () => {
    if (!title || !description) {
      toast({ title: "Please fill in Title and Description first", variant: "destructive" })
      return
    }
    setIsGeneratingTags(true)
    try {
      const res = await fetch("/api/ai/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      })
      const data = await res.json()
      if (data.tags) {
        setTags(data.tags)
        toast({ title: "AI Tags Generated!", description: `${data.tags.length} tags added.` })
      } else {
        toast({ title: "Could not generate tags", variant: "destructive" })
      }
    } catch (err) {
      console.error(err)
      toast({ title: "Tag generation failed", variant: "destructive" })
    } finally {
      setIsGeneratingTags(false)
    }
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  const handleSaveStream = async () => {
    if (!categoryId || !monthlyVolumeKg) {
      toast({ title: "Please fill in category and monthly volume", variant: "destructive" })
      return
    }
    setIsSaving(true)
    try {
      const method = editingId ? "PATCH" : "POST"
      const body = { id: editingId, categoryId, title, description, monthlyVolumeKg, unit, tags }
      const res = await fetch("/api/business/waste-streams", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      toast({ title: editingId ? "Stream updated!" : "Stream added!" })
      setDialogOpen(false)
      fetchData()
      resetForm()
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this waste stream?")) return
    try {
      const res = await fetch(`/api/business/waste-streams?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast({ title: "Stream removed" })
      fetchData()
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Waste Streams</h1>
          <p className="text-gray-500 mt-1">Track your business's waste generation profile. AI helps you get matched faster.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger
            render={
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> Add Waste Stream
              </Button>
            }
          />
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Update Waste Stream" : "Add New Waste Stream"}</DialogTitle>
              <DialogDescription>
                Provide details about the waste your business generates. The AI will suggest tags to help recyclers find you.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Category */}
              <div className="space-y-1.5">
                <Label>Material Category <span className="text-red-500">*</span></Label>
                <Select disabled={!!editingId} value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select material type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingId && <p className="text-xs text-muted-foreground">Category cannot be changed while editing.</p>}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Plastic Bottles from Production Line"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the waste — its source, composition, frequency of generation, current disposal method..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Volume & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Monthly Volume <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    placeholder="e.g. 500"
                    value={monthlyVolumeKg}
                    onChange={(e) => setMonthlyVolumeKg(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit <span className="text-red-500">*</span></Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="quintal">Quintal</SelectItem>
                      <SelectItem value="tons">Tons</SelectItem>
                      <SelectItem value="units">Units</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* AI Tags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4" /> Smart Tags
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateTags}
                    disabled={!title || !description || isGeneratingTags}
                    className="text-xs gap-1"
                  >
                    {isGeneratingTags
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                      : <><Sparkles className="w-3 h-3 text-purple-500" /> Generate AI Tags</>}
                  </Button>
                </div>
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                      <Badge key={`${tag}-${idx}`} variant="secondary" className="gap-1 text-emerald-700 bg-emerald-50">
                        #{tag}
                        <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    No tags added. Generate AI tags or add them manually below.
                  </p>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add manual tag..."
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const val = e.currentTarget.value.trim()
                        if (val && !tags.includes(val)) {
                          setTags([...tags, val])
                          e.currentTarget.value = ""
                        }
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement
                      const val = input.value.trim()
                      if (val && !tags.includes(val)) {
                        setTags([...tags, val])
                        input.value = ""
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveStream} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? "Save Changes" : "Add Stream"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {streams.length === 0 ? (
        <Card className="bg-emerald-50/50 border-emerald-100 flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-emerald-100 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Waste Streams Added</h3>
          <p className="text-gray-500 max-w-sm mb-6">
            Get started by adding the primary materials your business generates. AI tags help our scout agents match you with the right recyclers.
          </p>
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" /> Track First Material
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {streams.map((stream) => {
            const parsedTags: string[] = (() => {
              try { return stream.tags ? JSON.parse(stream.tags) : [] } catch { return [] }
            })()
            return (
              <Card key={stream.id} className="relative group overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-all">
                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => handleOpenEdit(stream)}>
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => handleDelete(stream.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl bg-gray-50 p-2 rounded-xl">{stream.category?.icon || "♻️"}</div>
                    <div>
                      <CardTitle className="text-base leading-tight">
                        {stream.title || stream.category?.name || "Waste Stream"}
                      </CardTitle>
                      <Badge variant={stream.status === "active" ? "default" : "secondary"}
                        className={stream.status === "active" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 mt-1" : "mt-1"}>
                        {stream.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {stream.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{stream.description}</p>
                  )}

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Monthly Volume</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-gray-900">{stream.monthlyVolumeKg}</span>
                        <span className="text-gray-500 text-sm font-medium">{stream.unit || "kg"}</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>

                  {parsedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {parsedTags.slice(0, 5).map((tag: string) => (
                        <span key={tag} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                      {parsedTags.length > 5 && (
                        <span className="text-xs text-gray-400">+{parsedTags.length - 5} more</span>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Updated: {new Date(stream.lastUpdated).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
