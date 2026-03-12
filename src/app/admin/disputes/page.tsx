"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, Loader2, Shield, ChevronDown, ChevronUp } from "lucide-react"

const STATUS_META: Record<string, { label: string; color: string }> = {
  open:       { label: "Open",       color: "bg-red-100 text-red-700" },
  reviewing:  { label: "Reviewing",  color: "bg-yellow-100 text-yellow-700" },
  resolved:   { label: "Resolved",   color: "bg-emerald-100 text-emerald-700" },
}

export default function AdminDisputesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [disputes, setDisputes]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatus] = useState("")
  const [expanded, setExpanded]   = useState<number | null>(null)
  const [resolving, setResolving] = useState<number | null>(null)
  const [resolution, setResolution] = useState("")
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return }
    if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      router.push("/dashboard"); return
    }
    if (status === "authenticated") {
      fetch("/api/admin/disputes").then(r => r.json()).then(setDisputes).finally(() => setLoading(false))
    }
  }, [status, session, router])

  const filtered = disputes.filter(d => !statusFilter || d.status === statusFilter)

  const openCount     = disputes.filter(d => d.status === "open").length
  const reviewingCount = disputes.filter(d => d.status === "reviewing").length
  const resolvedCount  = disputes.filter(d => d.status === "resolved").length

  const updateDispute = async (id: number, newStatus: string, res?: string) => {
    setSaving(true)
    await fetch("/api/admin/disputes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus, resolution: res }),
    })
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: newStatus, resolution: res ?? d.resolution } : d))
    setResolving(null)
    setResolution("")
    setSaving(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild><Link href="/admin"><ArrowLeft className="w-4 h-4" /> Back</Link></Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute Resolution</h1>
          <p className="text-gray-500 text-sm">{disputes.length} total disputes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-red-50 p-3 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-xs text-gray-500">Open</p><p className="text-2xl font-black text-red-600">{openCount}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-yellow-50 p-3 rounded-xl"><Clock className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-xs text-gray-500">Under Review</p><p className="text-2xl font-black text-yellow-600">{reviewingCount}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-50 p-3 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-gray-500">Resolved</p><p className="text-2xl font-black text-emerald-600">{resolvedCount}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="space-y-4">
          {filtered.map(d => {
            const meta = STATUS_META[d.status] || { label: d.status, color: "bg-gray-100 text-gray-600" }
            const isExpanded  = expanded === d.id
            const isResolving = resolving === d.id

            return (
              <Card key={d.id} className="border-none shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-blue-100 text-blue-700 font-bold text-xs">#{d.id}</Badge>
                      <Badge className={`${meta.color} text-xs`}>{meta.label}</Badge>
                      <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {d.status === "open" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateDispute(d.id, "reviewing")}>
                          Mark Reviewing
                        </Button>
                      )}
                      {d.status !== "resolved" && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setResolving(isResolving ? null : d.id)}
                        >
                          Resolve
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpanded(isExpanded ? null : d.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="font-semibold text-gray-700">
                      {d.transaction?.material?.title || "Transaction"} — 
                    </span>
                    <span className="text-gray-500 ml-1">
                      Raised by <strong>{d.raiser?.name}</strong> ({d.raiser?.role})
                    </span>
                  </div>
                </CardHeader>

                {(isExpanded || isResolving) && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{d.reason}</p>
                    </div>

                    {d.transaction && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Supplier</p>
                          <p className="font-bold text-gray-900">{d.transaction.supplier?.name}</p>
                          <p className="text-xs text-gray-500">Trust: {d.transaction.supplier?.trustScore}</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Receiver</p>
                          <p className="font-bold text-gray-900">{d.transaction.receiver?.name}</p>
                          <p className="text-xs text-gray-500">Trust: {d.transaction.receiver?.trustScore}</p>
                        </div>
                      </div>
                    )}

                    {d.resolution && (
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-emerald-700 mb-1">Resolution</p>
                        <p className="text-sm text-gray-700">{d.resolution}</p>
                      </div>
                    )}

                    {isResolving && (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Enter resolution notes…"
                          value={resolution}
                          onChange={e => setResolution(e.target.value)}
                          className="bg-white"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                            disabled={!resolution || saving}
                            onClick={() => updateDispute(d.id, "resolved", resolution)}
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Resolution"}
                          </Button>
                          <Button variant="outline" onClick={() => setResolving(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No disputes found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
