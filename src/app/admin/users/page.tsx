"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Shield, ArrowLeft, Loader2, CheckCircle2, Star } from "lucide-react"

const ROLE_COLORS: Record<string, string> = {
  individual: "bg-blue-100 text-blue-700", business: "bg-purple-100 text-purple-700",
  ngo: "bg-orange-100 text-orange-700", volunteer: "bg-teal-100 text-teal-700",
  transporter: "bg-indigo-100 text-indigo-700", admin: "bg-red-100 text-red-700",
}
const VER_COLORS: Record<string, string> = {
  unverified: "bg-gray-100 text-gray-500", basic: "bg-yellow-100 text-yellow-700",
  verified: "bg-blue-100 text-blue-700", trusted: "bg-emerald-100 text-emerald-700",
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [roleFilter, setRole]   = useState("")
  const [editing, setEditing]   = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return }
    if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      router.push("/dashboard"); return
    }
    if (status === "authenticated") {
      fetch("/api/admin/users").then(r => r.json()).then(setUsers).finally(() => setLoading(false))
    }
  }, [status, session, router])

  const filtered = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const updateUser = async (id: string, data: any) => {
    setSaving(true)
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u))
    setEditing(null)
    setSaving(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild><Link href="/admin"><ArrowLeft className="w-4 h-4" /> Back</Link></Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">{users.length} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…" className="pl-10 bg-white" />
        </div>
        <Select value={roleFilter} onValueChange={setRole}>
          <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Roles</SelectItem>
            {["individual","business","ngo","volunteer","transporter","admin"].map(r => (
              <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>
      ) : (
        <Card className="border-none shadow-md">
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span>User</span><span>Role</span><span>Trust</span><span>Verification</span><span>Green Points</span><span>Actions</span>
            </div>
            {filtered.map(u => (
              <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 items-center px-4 py-4 border-b last:border-0 hover:bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">{u.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Link href={`/profile/${u.id}`} className="font-bold text-gray-900 text-sm hover:text-emerald-600 truncate block">{u.name}</Link>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    <p className="text-xs text-gray-400">{u.city}</p>
                  </div>
                </div>
                <Badge className={`${ROLE_COLORS[u.role] || "bg-gray-100"} text-xs capitalize w-fit`}>{u.role}</Badge>
                <span className="font-bold text-gray-700 text-sm">{u.trustScore}</span>
                <Badge className={`${VER_COLORS[u.verificationLevel] || "bg-gray-100"} text-xs capitalize w-fit`}>{u.verificationLevel}</Badge>
                <span className="font-bold text-emerald-600 text-sm flex items-center gap-1">🌱 {u.greenPoints}</span>
                <div className="flex gap-1 flex-wrap">
                  {editing === u.id ? (
                    <div className="flex gap-1 items-center">
                      <Select defaultValue={u.verificationLevel} onValueChange={v => updateUser(u.id, { verificationLevel: v })}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["unverified","basic","verified","trusted"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)}>×</Button>
                    </div>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(u.id)}>
                        <Shield className="w-3 h-3 mr-1" /> Verify
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => updateUser(u.id, { role: "banned" })}>
                        Ban
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500">No users found</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
