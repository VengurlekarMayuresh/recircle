"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Package, CheckCircle, XCircle, AlertCircle, ChevronRight, ArrowRight, Loader2 } from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600"
}

const STATUS_ICONS: Record<string, any> = {
  pending: AlertCircle,
  accepted: CheckCircle,
  rejected: XCircle,
  in_progress: ArrowRight,
  completed: CheckCircle
}

function RequestCard({ req, type, onAction }: { req: any; type: "sent" | "received"; onAction?: () => void }) {
  const [actionLoading, setActionLoading] = useState(false)
  const StatusIcon = STATUS_ICONS[req.status] || AlertCircle

  const daysAgo = (date: string) => {
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    return d === 0 ? "Today" : d === 1 ? "1d ago" : `${d}d ago`
  }

  const handleResponse = async (action: "accept" | "reject") => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/material-requests/${req.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      })
      if (res.ok) onAction?.()
    } finally {
      setActionLoading(false)
    }
  }

  const images = (() => {
    const raw = req.material?.images
    if (!raw) return []
    // Images are stored as comma-separated URLs
    if (typeof raw === "string") return raw.split(",").map((s: string) => s.trim()).filter(Boolean)
    return Array.isArray(raw) ? raw : []
  })()

  return (
    <Card className="border-gray-100 hover:shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Material thumbnail */}
          <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
            <img
              src={images[0] || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200"}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200" }}
            />
          </div>

          <div className="flex-grow min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/materials/${req.materialId}`} className="font-semibold text-gray-800 hover:text-emerald-600 line-clamp-1">
                  {req.material?.title || "Material"}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5">
                  {type === "sent" ? `Supplier: ${req.material?.user?.name}` : `Requester: ${req.receiver?.name}`}
                </p>
              </div>
              <Badge className={`text-xs whitespace-nowrap ${STATUS_STYLES[req.status]}`}>
                <StatusIcon className="w-3 h-3 mr-1 inline" />
                {req.status.replace("_", " ")}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
              <span><Package className="w-3 h-3 inline mr-1" />{req.quantityRequested} units</span>
              <span><Clock className="w-3 h-3 inline mr-1" />{daysAgo(req.createdAt)}</span>
              {req.preferredTransport && (
                <span className="capitalize">{req.preferredTransport.replace("_", " ")}</span>
              )}
            </div>

            {req.message && (
              <p className="text-xs text-gray-500 mt-2 italic line-clamp-2">"{req.message}"</p>
            )}

            {req.responseMessage && (
              <p className="text-xs text-emerald-700 mt-1 italic">Response: "{req.responseMessage}"</p>
            )}

            {/* Actions */}
            {type === "received" && req.status === "pending" && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                  onClick={() => handleResponse("accept")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓ Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                  onClick={() => handleResponse("reject")}
                  disabled={actionLoading}
                >
                  ✗ Decline
                </Button>
              </div>
            )}

            {req.status === "accepted" && (
              <Link href="/transactions">
                <Button size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">
                  View Transaction <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MyRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sent, setSent] = useState<any[]>([])
  const [received, setReceived] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/material-requests")
      const data = await res.json()
      setSent(data.sent || [])
      setReceived(data.received || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated") fetchRequests()
  }, [status])

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const pendingReceived = received.filter(r => r.status === "pending")

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">My Requests</h1>
        <p className="text-gray-500 mt-1">Track your sent requests and manage incoming ones</p>
      </div>

      <Tabs defaultValue={pendingReceived.length > 0 ? "received" : "sent"}>
        <TabsList className="mb-6">
          <TabsTrigger value="sent">
            Sent Requests
            {sent.filter(r => r.status === "pending").length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full">
                {sent.filter(r => r.status === "pending").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="received">
            Received Requests
            {pendingReceived.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {pendingReceived.length} new
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent">
          {sent.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No requests sent yet.</p>
              <Link href="/marketplace" className="text-emerald-600 hover:underline mt-2 inline-block text-sm">
                Browse materials to request →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sent.map((req) => (
                <RequestCard key={req.id} req={req} type="sent" onAction={fetchRequests} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received">
          {received.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No incoming requests yet.</p>
              <Link href="/materials/new" className="text-emerald-600 hover:underline mt-2 inline-block text-sm">
                Create a listing to start receiving requests →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending first */}
              {pendingReceived.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Action Required</p>
                  {pendingReceived.map((req) => (
                    <RequestCard key={req.id} req={req} type="received" onAction={fetchRequests} />
                  ))}
                </div>
              )}
              {/* Rest */}
              {received.filter(r => r.status !== "pending").length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Previous</p>
                  {received.filter(r => r.status !== "pending").map((req) => (
                    <RequestCard key={req.id} req={req} type="received" onAction={fetchRequests} />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
