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
  Package, Recycle, ShoppingBag, XCircle, ArrowRight, Phone, Navigation, MessageSquare, Truck, Loader2
} from "lucide-react"
import { useSession } from "next-auth/react"

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  active:   { bg: "bg-blue-100 text-blue-700", label: "Negotiating" },
  agreed:   { bg: "bg-emerald-100 text-emerald-700", label: "Deal Agreed" },
  rejected: { bg: "bg-red-100 text-red-700", label: "Rejected" },
  closed:   { bg: "bg-gray-100 text-gray-700", label: "Closed" },
}

const TX_STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  negotiating: { bg: "bg-blue-100 text-blue-700", label: "In Progress" },
  scheduled:   { bg: "bg-amber-100 text-amber-700", label: "Pickup Scheduled" },
  delivered:   { bg: "bg-emerald-100 text-emerald-700", label: "Delivered" },
  confirmed:   { bg: "bg-emerald-100 text-emerald-700", label: "Completed" },
  cancelled:   { bg: "bg-red-100 text-red-700", label: "Cancelled" },
}

const TRANSPORT_LABELS: Record<string, string> = {
  self_pickup: "Self Pickup",
  supplier_delivery: "Supplier Delivery",
  platform_transporter: "Platform Transporter",
}

export default function MyDealsPage() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const [deals, setDeals] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingTx, setConfirmingTx] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/bargain/buyer").then(r => r.json()).catch(() => []),
      fetch("/api/transactions").then(r => r.json()).catch(() => []),
    ]).then(([bargainData, txData]) => {
      setDeals(Array.isArray(bargainData) ? bargainData : [])
      setTransactions(Array.isArray(txData) ? txData : [])
      setLoading(false)
    })
  }, [])

  const handleConfirmReceived = async (txId: string) => {
    setConfirmingTx(txId)
    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      })
      if (res.ok) {
        setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: "confirmed", completedAt: new Date().toISOString() } : tx))
      }
    } finally {
      setConfirmingTx(null)
    }
  }

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

  // Direct transactions (non-bargain): exclude platform_transporter ones that have transport bookings
  const activeTx = transactions.filter(tx => ["negotiating", "scheduled", "delivered"].includes(tx.status))
  const completedTx = transactions.filter(tx => ["confirmed", "cancelled"].includes(tx.status))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Deals</h1>
        <p className="text-gray-500">Track your negotiations, transactions and purchases.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{agreedDeals.length}</p>
            <p className="text-xs text-emerald-600 font-medium">Bargain Deals Won</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-blue-700">{activeTx.length}</p>
            <p className="text-xs text-blue-600 font-medium">Active Transactions</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-purple-700">{activeDeals.length}</p>
            <p className="text-xs text-purple-600 font-medium">Active Negotiations</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-gray-700">{completedTx.length}</p>
            <p className="text-xs text-gray-600 font-medium">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeTx.length > 0 ? "transactions" : "agreed"} className="space-y-6">
        <TabsList className="bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="transactions" className="rounded-lg px-5">
            Transactions
            {activeTx.length > 0 && (
              <span className="ml-1.5 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeTx.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="agreed" className="rounded-lg px-5">
            Bargain Deals
            {agreedDeals.length > 0 && (
              <span className="ml-1.5 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{agreedDeals.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg px-5">
            Negotiations
            {activeDeals.length > 0 && (
              <span className="ml-1.5 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeDeals.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg px-5">Past</TabsTrigger>
        </TabsList>

        {/* Transactions (Direct Requests) */}
        <TabsContent value="transactions" className="space-y-4">
          {activeTx.length === 0 && completedTx.length === 0 ? (
            <EmptyState
              icon={<Package className="w-12 h-12 text-gray-300" />}
              title="No transactions yet"
              description="When a supplier accepts your material request, the transaction appears here."
            />
          ) : (
            <>
              {activeTx.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} userId={userId} onConfirm={handleConfirmReceived} confirming={confirmingTx === tx.id} />
              ))}
              {completedTx.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider pt-4">Completed</p>
                  {completedTx.map((tx) => (
                    <TransactionCard key={tx.id} tx={tx} userId={userId} onConfirm={handleConfirmReceived} confirming={false} />
                  ))}
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* Bargain Deals */}
        <TabsContent value="agreed" className="space-y-4">
          {agreedDeals.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="w-12 h-12 text-gray-300" />}
              title="No bargain deals yet"
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
            <div className="mt-4 pt-3 border-t border-emerald-100 space-y-3">
              {/* Pickup & Contact Info */}
              <div className="bg-emerald-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Pickup Details</p>
                {(deal.seller?.materialAddress || deal.transaction?.pickupAddress) && (
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{deal.seller?.materialAddress || deal.transaction?.pickupAddress}</span>
                  </div>
                )}
                {deal.seller?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <a href={`tel:${deal.seller.phone}`} className="text-emerald-700 font-semibold hover:underline">
                      {deal.seller.phone}
                    </a>
                    <span className="text-xs text-gray-400">(Seller: {deal.seller.name})</span>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Contact the seller to agree on a pickup time. Inspect the material before accepting.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {deal.transaction?.id && (
                  <Link href={`/transactions/${deal.transaction.id}`} className="flex-1">
                    <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs h-8">
                      <MessageSquare className="w-3 h-3 mr-1" /> Message Seller
                    </Button>
                  </Link>
                )}
                <Link href={`/materials/${deal.material?.id}`}>
                  <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-8">
                    View Material <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Resume negotiation for active deals */}
          {deal.status === "active" && (
            <div className="mt-4 pt-3 border-t border-blue-100">
              <Link href={`/bargain?materialId=${deal.material?.id}`}>
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

function TransactionCard({ tx, userId, onConfirm, confirming }: { tx: any; userId: string; onConfirm: (id: string) => void; confirming: boolean }) {
  const isBuyer = userId === tx.receiverId
  const otherParty = isBuyer ? tx.supplier : tx.receiver
  const sc = TX_STATUS_CONFIG[tx.status] || TX_STATUS_CONFIG.negotiating
  const images = tx.material?.images?.split?.(",") || []
  const firstImage = images[0] || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200"
  const transportLabel = TRANSPORT_LABELS[tx.transportMethod] || tx.transportMethod

  return (
    <Card className={`border transition-all hover:shadow-md ${
      tx.status === "confirmed" ? "border-gray-200 opacity-75" : "border-blue-200"
    }`}>
      <CardContent className="p-0 flex flex-col sm:flex-row">
        <div className="w-full sm:w-36 h-36 sm:h-auto shrink-0 overflow-hidden bg-gray-100 rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none">
          <img src={firstImage} alt={tx.material?.title} className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200" }} />
        </div>
        <div className="p-5 flex-grow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Link href={`/materials/${tx.materialId}`} className="font-bold text-gray-900 hover:text-emerald-600">
                {tx.material?.title}
              </Link>
              <Badge className={sc.bg} variant="secondary">{sc.label}</Badge>
              <Badge variant="outline" className="text-xs gap-1"><Truck className="w-3 h-3" />{transportLabel}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">{otherParty?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500">
                {isBuyer ? "Seller" : "Buyer"}: <span className="font-medium text-gray-700">{otherParty?.name}</span>
                {otherParty?.city && <> · {otherParty.city}</>}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-1"><Package className="w-3 h-3" />{tx.quantity} {tx.material?.unit || "units"}</span>
              {tx.material?.price > 0 && <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />₹{tx.material.price.toLocaleString()}</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
          </div>

          {/* Contact + Actions */}
          {tx.status !== "confirmed" && tx.status !== "cancelled" && (
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
              <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                  {isBuyer ? "Pickup / Delivery Info" : "Buyer Contact"}
                </p>
                {tx.pickupAddress && (
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>{tx.pickupAddress}</span>
                  </div>
                )}
                {otherParty?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <a href={`tel:${otherParty.phone}`} className="text-blue-700 font-semibold hover:underline">{otherParty.phone}</a>
                    <span className="text-xs text-gray-400">({otherParty.name})</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/transactions/${tx.id}`} className="flex-1">
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs h-8">
                    <MessageSquare className="w-3 h-3 mr-1" /> Message {isBuyer ? "Seller" : "Buyer"}
                  </Button>
                </Link>
                {isBuyer && (
                  <Button size="sm" onClick={() => onConfirm(tx.id)} disabled={confirming}
                    className="bg-blue-600 hover:bg-blue-700 text-xs h-8 gap-1">
                    {confirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Confirm Received
                  </Button>
                )}
              </div>
            </div>
          )}

          {tx.status === "confirmed" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle className="w-4 h-4" /> Material received — transaction complete
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
