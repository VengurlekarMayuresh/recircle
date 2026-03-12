"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users, Package, ArrowRight, Shield, AlertTriangle, Leaf,
  TrendingUp, Activity, CheckCircle2, Loader2
} from "lucide-react"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats]         = useState<any>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return }
    if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      router.push("/dashboard"); return
    }
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/dashboard/stats").then(r => r.json()),
        fetch("/api/dashboard/impact").then(r => r.json()),
      ]).then(([statsData, impactData]) => {
        setStats({ ...statsData, ...impactData })
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [status, session, router])

  if (loading || status === "loading") return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
    </div>
  )

  const STAT_CARDS = [
    { label: "Total Materials",    value: stats?.total_materials    ?? "—", icon: <Package className="w-5 h-5" />,    color: "bg-purple-50 text-purple-600" },
    { label: "Total Transactions", value: stats?.total_transactions ?? "—", icon: <CheckCircle2 className="w-5 h-5" />, color: "bg-emerald-50 text-emerald-600" },
    { label: "CO₂ Saved",          value: `${stats?.co2_saved ?? 0} kg`,   icon: <Leaf className="w-5 h-5" />,       color: "bg-teal-50 text-teal-600" },
    { label: "₹ Saved",           value: `₹${(stats?.rupees_saved ?? 0).toLocaleString("en-IN")}`, icon: <TrendingUp className="w-5 h-5" />, color: "bg-blue-50 text-blue-600" },
    { label: "New Users (7d)",     value: stats?.weekly_new_users ?? "—",   icon: <Users className="w-5 h-5" />,      color: "bg-indigo-50 text-indigo-600" },
    { label: "New Listings (7d)",  value: stats?.weekly_new_listings ?? "—", icon: <Shield className="w-5 h-5" />,   color: "bg-orange-50 text-orange-600" },
  ]

  const QUICK_LINKS = [
    { href: "/admin/users",    label: "Manage Users",      icon: <Users className="w-4 h-4" />,         color: "bg-blue-600 hover:bg-blue-700" },
    { href: "/admin/flagged",  label: "Review Flagged",    icon: <Shield className="w-4 h-4" />,        color: "bg-orange-600 hover:bg-orange-700" },
    { href: "/admin/disputes", label: "Resolve Disputes",  icon: <AlertTriangle className="w-4 h-4" />, color: "bg-red-600 hover:bg-red-700" },
    { href: "/dashboard",      label: "Impact Dashboard",  icon: <TrendingUp className="w-4 h-4" />,    color: "bg-emerald-600 hover:bg-emerald-700" },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
          <Shield className="w-3 h-3" /> Admin Panel
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500">ReCircle admin control center</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {STAT_CARDS.map(card => (
          <Card key={card.label} className="border-none shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`${card.color} p-3 rounded-xl`}>{card.icon}</div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                  <p className="text-2xl font-black text-gray-900">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {QUICK_LINKS.map(link => (
          <Button key={link.href} asChild className={`${link.color} rounded-xl h-12 gap-2 text-white`}>
            <Link href={link.href}>
              {link.icon} {link.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Platform Health */}
      {stats && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" /> Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <HealthMetric label="Materials Listed"   value={stats.total_materials    ?? 0} />
              <HealthMetric label="Transactions"       value={stats.total_transactions ?? 0} />
              <HealthMetric label="kg Diverted"        value={`${stats.kg_diverted ?? 0} kg`} />
              <HealthMetric label="₹ Value Saved"     value={`₹${(stats.rupees_saved ?? 0).toLocaleString("en-IN")}`} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function HealthMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-4 bg-gray-50 rounded-xl">
      <p className="text-2xl font-black text-emerald-600">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
