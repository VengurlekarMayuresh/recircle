"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  MessageSquare,
  Package,
  ArrowUpRight,
  BarChart3,
  Leaf,
  Navigation,
  Phone,
  IndianRupee,
  ArrowRight
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

// Mock bookings for a transporter
const mockBookings = [
  {
    id: "B-101",
    materialTitle: "Surplus Bricks (500 pieces)",
    pickup: "Andheri East, Mumbai",
    drop: "Dharavi Housing Project",
    distance: "12 km",
    status: "Confirmed",
    time: "Today, 4:00 PM",
    price: 450,
    supplier: "BuildWell Corp",
    receiver: "Habitat NGO",
  },
  {
    id: "B-102",
    materialTitle: "Office Desks (x3)",
    pickup: "Worli, Mumbai",
    drop: "Byculla School",
    distance: "5 km",
    status: "Pending",
    time: "Tomorrow, 10:00 AM",
    price: 200,
    supplier: "Tech Sol",
    receiver: "City School",
  }
]

export default function TransporterDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transporter Dashboard</h1>
          <p className="text-gray-500">View and manage your material delivery bookings.</p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
          <div className="bg-emerald-500 w-3 h-3 rounded-full animate-pulse"></div>
          <span className="text-emerald-700 font-bold">Online & Available</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="bg-gray-100/50 mb-6 font-bold">
              <TabsTrigger value="upcoming">Upcoming (2)</TabsTrigger>
              <TabsTrigger value="requests">New Requests</TabsTrigger>
              <TabsTrigger value="completed">History</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {mockBookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden border-gray-100 hover:shadow-md transition-shadow">
                  <CardHeader className="bg-gray-50/50 pb-4 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-700 font-bold">Booking #{booking.id}</Badge>
                        <span className="text-xs text-gray-400 font-mono">{booking.time}</span>
                      </div>
                      <span className="text-xl font-black text-emerald-600">₹{booking.price}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-grow space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                            <Package className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-gray-800">{booking.materialTitle}</span>
                        </div>
                        
                        <div className="relative pl-6 space-y-4">
                          <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                          <div className="relative">
                            <div className="absolute -left-[1.375rem] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pickup</p>
                            <p className="font-semibold text-gray-700">{booking.pickup}</p>
                            <p className="text-xs text-gray-400">{booking.supplier}</p>
                          </div>
                          <div className="relative">
                            <div className="absolute -left-[1.375rem] top-1.5 w-3 h-3 rounded-full bg-red-500 ring-4 ring-white"></div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Drop</p>
                            <p className="font-semibold text-gray-700">{booking.drop}</p>
                            <p className="text-xs text-gray-400">{booking.receiver}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 justify-center md:w-48">
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11 flex gap-2">
                          <Navigation className="w-4 h-4" /> Start Route
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" className="flex-1 h-11 rounded-xl">
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="flex-1 h-11 rounded-xl">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <Card className="bg-emerald-900 text-white overflow-hidden relative border-none shadow-2xl shadow-emerald-200">
            <CardHeader>
              <CardTitle className="text-emerald-300 uppercase text-xs tracking-widest">Earnings this Week</CardTitle>
              <CardTitle className="text-4xl font-black">₹3,450</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+15% from last week</span>
              </div>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 text-emerald-800/30">
              <BarChart3 className="w-32 h-32" />
            </div>
          </Card>

          <Card className="border-emerald-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Circular Rewards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Green Points</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  🌱 450 GP
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">CO₂ Transported</span>
                <span className="font-bold text-blue-600 flex items-center gap-1">
                  <Leaf className="w-4 h-4" /> 120 kg
                </span>
              </div>
              <Separator />
              <div className="pt-2">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Upcoming Achievement</p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-3/4"></div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">15km more to unlock "Swift Courier" badge</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
