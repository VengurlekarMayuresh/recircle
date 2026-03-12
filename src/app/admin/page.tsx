"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ArrowLeftRight, Settings, AlertTriangle, ShieldAlert, Activity, LayoutDashboard, Truck } from "lucide-react";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  totalActiveListings: number;
  totalTransactions: number;
  totalCo2Saved: number;
  openDisputes: number;
  flaggedListings: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentActivity(data.recentActivity || []);
        }
      } catch (err) {
        console.error("Failed to fetch admin stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading Admin Dashboard...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Admin Overview</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/users" className="hover:scale-105 transition-transform">
          <Card className="h-full border-none bg-gradient-to-br from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 transition-colors cursor-pointer shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold text-blue-900">👥 Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-900" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-blue-900 font-medium mt-1">Manage all platform users</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/admin/materials" className="hover:scale-105 transition-transform">
          <Card className="h-full border-none bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 transition-colors cursor-pointer shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold text-emerald-900">📦 All Listings</CardTitle>
              <Package className="h-4 w-4 text-emerald-900" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900">{stats?.totalActiveListings || 0}</div>
              <p className="text-xs text-emerald-900 font-medium mt-1">View and manage materials</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/transactions" className="hover:scale-105 transition-transform">
          <Card className="h-full border-none bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-colors cursor-pointer shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold text-purple-900">🤝 All Transactions</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-purple-900" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats?.totalTransactions || 0}</div>
              <p className="text-xs text-purple-900 font-medium mt-1">View platform transactions</p>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        <Link href="/dashboard" className="hover:scale-105 transition-transform">
          <Card className="h-full border-none bg-gradient-to-br from-green-500/10 to-lime-500/10 hover:from-green-500/20 hover:to-lime-500/20 transition-colors cursor-pointer shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold text-green-900">🌱 CO₂ Saved (kg)</CardTitle>
              <Activity className="h-4 w-4 text-green-900" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{stats?.totalCo2Saved?.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-green-900 font-medium mt-1">View impact dashboard</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/admin/flagged" className="hover:scale-105 transition-transform">
          <Card className="h-full border-none bg-gradient-to-br from-rose-500/10 to-red-500/10 hover:from-rose-500/20 hover:to-red-500/20 transition-colors cursor-pointer shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold text-rose-900">🚩 Flagged Listings</CardTitle>
              <AlertTriangle className={stats?.flaggedListings ? "h-4 w-4 text-rose-800 animate-pulse" : "h-4 w-4 text-rose-900/30"} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats?.flaggedListings ? "text-rose-900" : "text-rose-900/40"}`}>
                {stats?.flaggedListings || 0}
              </div>
              {stats && stats.flaggedListings > 0 ? (
                <p className="text-xs text-rose-900 mt-1 font-black">Requires review</p>
              ) : (
                <p className="text-xs text-rose-900 font-medium mt-1">Manage flagged items</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/disputes" className="hover:scale-105 transition-transform">
          <Card className="h-full border-none bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-colors cursor-pointer shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold text-amber-900">⚖️ Open Disputes</CardTitle>
              <ShieldAlert className={stats?.openDisputes ? "h-4 w-4 text-amber-800 animate-pulse" : "h-4 w-4 text-amber-900/30"} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats?.openDisputes ? "text-amber-900" : "text-amber-900/40"}`}>
                {stats?.openDisputes || 0}
              </div>
              {stats && stats.openDisputes > 0 ? (
                <p className="text-xs text-amber-900 mt-1 font-black">Requires resolution</p>
              ) : (
                <p className="text-xs text-amber-900 font-medium mt-1">Manage open disputes</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Recent Agent Activity</h3>
        <Card>
          <CardContent className="p-0">
            {recentActivity.length > 0 ? (
              <div className="divide-y">
                {recentActivity.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between">
                    <div>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-muted rounded mr-2">
                        {log.agentName}
                      </span>
                      <span className="text-sm font-medium">{log.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No recent agent activity.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
