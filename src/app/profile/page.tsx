"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  PlusCircle, 
  MapPin, 
  Mail, 
  User, 
  Leaf, 
  Package, 
  History, 
  ChevronRight,
  TrendingUp,
  Award
} from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const { data: session } = useSession()
  const user = session?.user as any

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Please log in to view your profile</h1>
        <Link href="/login">
          <Button className="bg-emerald-600">Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: User Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden border-none shadow-xl bg-white">
              <div className="h-32 bg-gradient-to-br from-emerald-600 to-teal-700"></div>
              <CardContent className="relative pt-0 px-6 pb-8">
                <div className="flex flex-col items-center -mt-16">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                    <AvatarImage src={user?.image} />
                    <AvatarFallback className="text-3xl bg-emerald-100 text-emerald-700">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-4 text-2xl font-bold text-gray-900">{user?.name}</h2>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium mt-1">
                    <Award className="w-4 h-4" />
                    <span>{user?.level || "Seedling"}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 w-full mt-8 gap-4">
                    <div className="text-center p-3 bg-emerald-50 rounded-2xl">
                      <div className="text-sm text-emerald-600 font-medium">Points</div>
                      <div className="text-xl font-bold text-emerald-700">{user?.greenPoints || 0}</div>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-2xl">
                      <div className="text-sm text-teal-600 font-medium">Impact</div>
                      <div className="text-xl font-bold text-teal-700">{user?.impactScore || 0}%</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="p-2 bg-gray-100 rounded-lg"><User className="w-4 h-4" /></div>
                    <span className="capitalize">{user?.role}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="p-2 bg-gray-100 rounded-lg"><Mail className="w-4 h-4" /></div>
                    <span className="truncate">{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="p-2 bg-gray-100 rounded-lg"><MapPin className="w-4 h-4" /></div>
                    <span>{user?.city || "Not specified"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-emerald-900 text-white overflow-hidden">
               <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2">
                       <TrendingUp className="w-5 h-5" />
                       Sustainability Stats
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-80">Waste Diverted</span>
                      <span className="font-bold">124 kg</span>
                    </div>
                    <div className="w-full bg-emerald-800 rounded-full h-2">
                      <div className="bg-emerald-400 h-2 rounded-full w-[65%]"></div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="opacity-80">CO2 Saved</span>
                        <span className="font-bold">82 kg</span>
                    </div>
                  </div>
               </CardContent>
            </Card>
          </div>

          {/* Right Column: Actions and Activities */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/materials/new">
                <Card className="hover:shadow-xl transition-all border-2 border-transparent hover:border-emerald-500 group overflow-hidden bg-white">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-4 bg-emerald-100 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <PlusCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">Create Listing</h3>
                      <p className="text-gray-500 text-sm mt-0.5">Add new recycling materials</p>
                    </div>
                    <ChevronRight className="ml-auto w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/my-requests">
                <Card className="hover:shadow-xl transition-all border-2 border-transparent hover:border-teal-500 group overflow-hidden bg-white">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-4 bg-teal-100 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <History className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">My Requests</h3>
                      <p className="text-gray-500 text-sm mt-0.5">Track your material claims</p>
                    </div>
                    <ChevronRight className="ml-auto w-5 h-5 text-gray-300 group-hover:text-teal-500 transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Dashboard Sections */}
            <Card className="border-none shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50 px-8 py-6">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Package className="w-6 h-6 text-emerald-600" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Your latest actions on the platform</CardDescription>
                </div>
                <Link href="/dashboard" className="text-sm font-medium text-emerald-600 hover:underline">
                  View All
                </Link>
              </CardHeader>
              <CardContent className="px-8 py-6">
                <div className="space-y-6">
                  {[1, 2].map((item) => (
                    <div key={item} className="flex gap-4 items-start group">
                      <div className="mt-1 p-2 bg-emerald-50 rounded-full text-emerald-600">
                        <Leaf className="w-4 h-4" />
                      </div>
                      <div className="flex-1 pb-6 border-b border-gray-100 last:border-0">
                        <div className="flex justify-between">
                          <h4 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">Listed 10kg Cardboard</h4>
                          <span className="text-xs text-gray-400">2 days ago</span>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">Located in {user?.city || "Mumbai"}. Expected CO2 saving: 12kg.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Badges/Achievements Section */}
            <Card className="border-none shadow-lg bg-white overflow-hidden">
               <CardHeader className="pb-2 border-b border-gray-50 px-8 py-6">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Award className="w-6 h-6 text-yellow-500" />
                    Badges & Achievements
                  </CardTitle>
               </CardHeader>
               <CardContent className="px-8 py-8">
                  <div className="flex flex-wrap gap-6">
                    {["Early Adopter", "Plastic Saver", "Green Hero"].map((badge) => (
                      <div key={badge} className="flex flex-col items-center gap-2 w-24">
                        <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg ring-4 ring-orange-50 transition-transform hover:scale-110 cursor-help">
                          <Award className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">{badge}</span>
                      </div>
                    ))}
                    <div className="flex flex-col items-center gap-2 w-24 opacity-30 grayscale">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 shadow-sm ring-4 ring-gray-50">
                          <Award className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Locked</span>
                    </div>
                  </div>
               </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
