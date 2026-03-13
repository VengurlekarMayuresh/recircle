"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight, Leaf, Recycle, Heart, Shield, Award, Trash2, Zap } from "lucide-react"

export default function LandingPage() {
  const [statsData, setStatsData] = useState<any>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats")
        if (res.ok) {
          const data = await res.json()
          setStatsData(data)
        }
      } catch (err) {
        console.error("Failed to fetch landing page stats:", err)
      }
    }
    fetchStats()
  }, [])

  const stats = [
    { label: "Materials Reused", value: statsData?.total_materials?.toLocaleString() || "...", icon: Recycle },
    { label: "kg CO₂ Saved", value: statsData?.co2_saved?.toLocaleString() || "...", icon: Leaf },
    { label: "Scrap Diverted (kg)", value: `${statsData?.kg_diverted?.toLocaleString() || "..."}`, icon: Trash2 },
  ]


  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 px-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="max-w-7xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wider text-emerald-700 uppercase bg-emerald-100 rounded-full">
              Every material deserves a second life
            </span>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6">
              The <span className="text-emerald-600">Circular Economy</span> Operating System for India
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-gray-600">
              Connect surplus materials with those who can reuse them. Powered by AI, designed for trust, and localized for Bharat.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-4 pt-4"
          >
            <Link href="/marketplace">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 rounded-full h-14 shadow-lg shadow-emerald-200">
                Browse Marketplace <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/materials/new">
              <Button size="lg" variant="outline" className="text-lg px-8 rounded-full h-14 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                List Your Surplus
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Animated Stats Bar */}
      <section className="bg-emerald-900 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center text-center space-y-2"
              >
                <div className="bg-emerald-800 p-3 rounded-2xl mb-2">
                  <stat.icon className="w-8 h-8 text-emerald-400" />
                </div>
                <span className="text-4xl font-bold text-white tracking-tight">{stat.value}</span>
                <span className="text-emerald-300 font-medium uppercase tracking-widest text-sm">{stat.label}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="bg-transparent border-emerald-400 text-emerald-400 hover:bg-emerald-800 hover:text-white rounded-full">
                View Full Details <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">Circular Lifecycle</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Our four integrated AI agents handle the complexity, so you can focus on the impact.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-blue-50 p-6 rounded-3xl text-blue-600">
                <Recycle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold">1. List with AI</h3>
              <p className="text-gray-500 text-sm">Snap a photo and let our Vision AI identify materials, weight, and condition automatically.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-purple-50 p-6 rounded-3xl text-purple-600">
                <Shield className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold">2. AI Matching</h3>
              <p className="text-gray-500 text-sm">The Scout Agent finds the perfect receiver within minutes based on demand and proximity.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-emerald-50 p-6 rounded-3xl text-emerald-600">
                <Heart className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold">3. Local Logistics</h3>
              <p className="text-gray-500 text-sm">Book verified transporters or community volunteer couriers for seamless material movement.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-amber-50 p-6 rounded-3xl text-amber-600">
                <Award className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold">4. Verify Handoff</h3>
              <p className="text-gray-500 text-sm">The Quality Agent verifies handoff photos to ensure honesty and transparency.</p>
            </div>
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="py-20 px-4 bg-emerald-600 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">Ready to close the loop?</h2>
          <p className="text-emerald-100 text-lg max-w-xl mx-auto">Join thousands of businesses and individuals in India building a zero-waste future.</p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-full h-14 px-10 font-bold">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
      </section>
    </div>
  )
}
