"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle, Clock, IndianRupee, MapPin, MessageCircle,
  Package, Recycle, ShoppingBag, XCircle, ArrowRight
} from "lucide-react"

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  active:   { bg: "bg-blue-100 text-blue-700", label: "Negotiating" },
  agreed:   { bg: "bg-emerald-100 text-emerald-700", label: "Deal Agreed" },
  rejected: { bg: "bg-red-100 text-red-700", label: "Rejected" },
  closed:   { bg: "bg-gray-100 text-gray-700", label: "Closed" },
}

export default function MyDealsPage() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/bargain/buyer")
      .then(r => r.json())
      .then(data => {
        setDeals(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Recycle className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading your deals...</p>
      </div>
    )
  }

  const agreedDeals = deals.filter(d => d.status === "agreed")
  const activeDeals = deals.filter(d => d.status === "active")
  const pastDeals = deals.filter(d => ["rejected", "closed"].includes(d.status))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Deals</h1>
        <p className="text-gray-500">Track your negotiations and purchases.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{agreedDeals.length}</p>
            <p className="text-xs text-emerald-600 font-medium">Deals Won</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-blue-700">{activeDeals.length}</p>
            <p className="text-xs text-blue-600 font-medium">Active Negotiations</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-gray-700">
              ₹{agreedDeals.reduce((sum, d) => sum + (d.agreedPrice || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 font-medium">Total Spent</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agreed" className="space-y-6">
        <TabsList className="bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="agreed" className="rounded-lg px-5">
            Confirmed Deals
            {agreedDeals.length > 0 && (
              <span className="ml-1.5 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{agreedDeals.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg px-5">
            Active
            {activeDeals.length > 0 && (
              <span className="ml-1.5 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeDeals.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg px-5">Past</TabsTrigger>
        </TabsList>

        {/* Confirmed Deals */}
        <TabsContent value="agreed" className="space-y-4">
          {agreedDeals.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="w-12 h-12 text-gray-300" />}
              title="No confirmed deals yet"
              description="When you successfully negotiate a deal, it will appear here."
            />
          ) : (
            agreedDeals.map((deal) => (
              <DealCard key={deal.sessionId} deal={deal} />
            ))
          )}
        </TabsContent>

        {/* Active Negotiations */}
        <TabsContent value="active" className="space-y-4">
          {activeDeals.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="w-12 h-12 text-gray-300" />}
              title="No active negotiations"
              description="Browse the marketplace and make offers to start negotiating."
            />
          ) : (
            activeDeals.map((deal) => (
              <DealCard key={deal.sessionId} deal={deal} />
            ))
          )}
        </TabsContent>

        {/* Past Deals */}
        <TabsContent value="past" className="space-y-4">
          {pastDeals.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-12 h-12 text-gray-300" />}
              title="No past negotiations"
              description="Completed or cancelled negotiations will appear here."
            />
          ) : (
            pastDeals.map((deal) => (
              <DealCard key={deal.sessionId} deal={deal} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DealCard({ deal }: { deal: any }) {
  const sc = STATUS_CONFIG[deal.status] || STATUS_CONFIG.closed
  const images = deal.material?.images?.split?.(",") || []
  const firstImage = images[0] || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200"

  return (
    <Card className={`border transition-all hover:shadow-md ${
      deal.status === "agreed" ? "border-emerald-200 bg-emerald-50/20" :
      deal.status === "active" ? "border-blue-200" : "border-gray-100"
    }`}>
      <CardContent className="p-0 flex flex-col sm:flex-row">
        {/* Image */}
        <div className="w-full sm:w-36 h-36 sm:h-auto shrink-0 overflow-hidden bg-gray-100 rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none">
          <img
            src={firstImage}
            alt={deal.material?.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200" }}
          />
        </div>

        {/* Content */}
        <div className="p-5 flex-grow flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex-grow">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Link href={`/materials/${deal.material?.id}`} className="font-bold text-gray-900 hover:text-emerald-600">
                  {deal.material?.title}
                </Link>
                <Badge className={sc.bg} variant="secondary">{sc.label}</Badge>
              </div>

              {/* Seller info */}
              {deal.seller && (
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                      {deal.seller.name?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-500">
                    Seller: <span className="font-medium text-gray-700">{deal.seller.name}</span>
                    {deal.seller.city && <> · {deal.seller.city}</>}
                  </span>
                </div>
              )}

              {/* Price details */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-3">
                <span className="flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" /> Listed: ₹{deal.askingPrice?.toLocaleString()}
                </span>
                {deal.agreedPrice && (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle className="w-3 h-3" /> You pay: ₹{deal.agreedPrice?.toLocaleString()}
                  </span>
                )}
                {deal.discount !== null && deal.discount > 0 && (
                  <span className="text-orange-600 font-medium">Saved {deal.discount}%</span>
                )}
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {deal.messageCount} messages
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(deal.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>

            {/* Agreed price highlight */}
            {deal.status === "agreed" && (
              <div className="shrink-0 flex items-start">
                <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl text-center">
                  <p className="text-xs font-medium">Deal Price</p>
                  <p className="text-xl font-black">₹{deal.agreedPrice?.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Next steps for agreed deals */}
          {deal.status === "agreed" && (
            <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between">
              <p className="text-xs text-emerald-700">
                ✅ Deal confirmed — coordinate pickup with the seller.
              </p>
              <Link href={`/materials/${deal.material?.id}`}>
                <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-8">
                  View Material <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          )}

          {/* Resume negotiation for active deals */}
          {deal.status === "active" && (
            <div className="mt-4 pt-3 border-t border-blue-100">
              <Link href={`/materials/${deal.material?.id}`}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs h-8">
                  Continue Negotiation <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed">
      <div className="mx-auto mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="text-gray-500 mb-6">{description}</p>
      <Link href="/marketplace">
        <Button className="bg-emerald-600">Browse Marketplace</Button>
      </Link>
    </div>
  )
}
