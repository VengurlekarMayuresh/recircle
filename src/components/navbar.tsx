"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Menu, X, Leaf } from "lucide-react"
import { useState } from "react"

export default function Navbar() {
  const { data: session, status } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const user = session?.user as any

  const renderNavLinks = () => {
    if (status !== "authenticated") {
      return (
        <>
          <Link href="/marketplace" className="text-gray-600 hover:text-emerald-600 font-medium">Marketplace</Link>
          <Link href="/want-board" className="text-gray-600 hover:text-emerald-600 font-medium">Want Board</Link>
          <Link href="/faq" className="text-gray-600 hover:text-emerald-600 font-medium">FAQ</Link>
        </>
      )
    }

    if (user?.role === "admin") {
      return (
        <>
          <Link href="/marketplace" className="text-gray-600 hover:text-emerald-600 font-medium">Marketplace</Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-emerald-600 font-medium">Dashboard</Link>
          <Link href="/admin" className="text-gray-600 hover:text-emerald-600 font-medium">Admin Panel</Link>
        </>
      )
    }

    if (user?.role === "transporter" || user?.role === "volunteer") {
      return (
        <>
          <Link href="/marketplace" className="text-gray-600 hover:text-emerald-600 font-medium">Marketplace</Link>
          <Link href="/transporters/dashboard" className="text-gray-600 hover:text-emerald-600 font-medium">My Deliveries</Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-emerald-600 font-medium">Dashboard</Link>
        </>
      )
    }

    // individual, business, ngo
    return (
      <>
        <Link href="/marketplace" className="text-gray-600 hover:text-emerald-600 font-medium">Marketplace</Link>
      </>
    )
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-emerald-100 p-1.5 rounded-lg">
                <Leaf className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                ReCircle
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {renderNavLinks()}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {status === "authenticated" ? (
              <>
                <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full text-emerald-700 font-semibold text-sm">
                  <span>🌱</span>
                  <span>{user?.greenPoints || 0} GP</span>
                </div>
                <Button variant="ghost" size="icon" className="relative text-gray-500">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10 border-2 border-emerald-100">
                        <AvatarImage src={user?.image} alt={user?.name || ""} />
                        <AvatarFallback className="bg-emerald-50 text-emerald-700">
                          {user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">My Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/my-listings">My Listings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/my-impact">My Impact</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 cursor-pointer"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-gray-700">Login</Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 py-4 px-4 space-y-4">
          <div className="flex flex-col space-y-4">
            {renderNavLinks()}
          </div>
          <DropdownMenuSeparator />
          {status === "authenticated" ? (
            <div className="flex flex-col space-y-4 pt-2">
              <Link href="/profile" className="text-gray-600">My Profile</Link>
              <Link href="/dashboard/my-listings" className="text-gray-600">My Listings</Link>
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-100"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">Login</Button>
              </Link>
              <Link href="/register" className="w-full">
                <Button className="w-full bg-emerald-600">Register</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
