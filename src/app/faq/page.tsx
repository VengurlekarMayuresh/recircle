"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, Search, HelpCircle, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const FAQ_DATA = [
  {
    section: "General",
    icon: "🌍",
    items: [
      {
        q: "What is ReCircle?",
        a: "ReCircle is India's AI-powered circular economy marketplace that connects businesses, NGOs, and individuals to redistribute surplus and used materials — reducing waste, cutting costs, and lowering carbon emissions.",
      },
      {
        q: "How does it work?",
        a: "Suppliers list materials they no longer need (construction debris, office furniture, electronics, etc.). Receivers browse and request these materials. Transporters help move them. Our AI agents match listings, verify quality, detect fraud, and provide demand forecasts.",
      },
      {
        q: "Is it free to use?",
        a: "Yes! Listing materials and browsing is completely free. Volunteer transporters provide free delivery. If using a paid transporter, you pay them directly based on their rates.",
      },
      {
        q: "Who can use ReCircle?",
        a: "Anyone in India — businesses, NGOs, government bodies, individuals, and volunteers. Each role gets a tailored dashboard: Supplier, Receiver, Transporter, Volunteer, and Admin.",
      },
    ],
  },
  {
    section: "For Suppliers",
    icon: "📦",
    items: [
      {
        q: "How do I list materials?",
        a: "Go to Dashboard → My Listings → New Listing. Add a title, photos (minimum 2), condition, quantity, and location. Our AI will auto-tag your listing and suggest the best reuse route.",
      },
      {
        q: "What material conditions are accepted?",
        a: "We accept 5 condition grades: New, Like New, Good, Fair, and Salvage. All materials must be safe for reuse or responsible recycling. Hazardous materials are not accepted.",
      },
      {
        q: "How do I set pricing?",
        a: "You can donate materials for free, set a fixed price, or offer for exchange. For donations, you earn Green Points and CO₂ impact credits. Pricing should reflect the material's reuse value.",
      },
      {
        q: "What happens when my material is claimed?",
        a: "You'll receive a notification. If you've accepted a direct request, the transaction status moves to 'Scheduled'. Coordinate pickup/delivery with the receiver and transporter.",
      },
    ],
  },
  {
    section: "For Receivers",
    icon: "🏗️",
    items: [
      {
        q: "How do I find materials?",
        a: "Browse the Marketplace and filter by category, city, condition, and listing type. You can also post a Want Request on the Want Board and our Scout Agent will match you with available listings.",
      },
      {
        q: "How do I request a material?",
        a: "On any listing, click 'Request Material'. Specify quantity, preferred transport method, and add a message to the supplier. The supplier will accept or reject your request.",
      },
      {
        q: "What is the no-return policy?",
        a: "All materials are sold/donated AS-IS. No returns are accepted — this is realistic for a reused materials marketplace. We compensate with detailed condition grading, multiple required photos, AI quality verification, and on-site inspection for high-value items (>₹5,000).",
      },
      {
        q: "Can I raise a dispute?",
        a: "Yes. If the material received is significantly different from the listing, you can raise a dispute within 48 hours of delivery. Our admin team reviews evidence (photos, messages) and takes action.",
      },
    ],
  },
  {
    section: "For Transporters",
    icon: "🚛",
    items: [
      {
        q: "How do I register as a transporter?",
        a: "Go to Transporters → Register. Fill in your vehicle type, capacity, service area, and pricing. Choose 'Volunteer' if you want to provide free eco-delivery. Your profile goes live immediately.",
      },
      {
        q: "How are earnings calculated?",
        a: "Your earnings = Base Rate + (Distance in km × Price per km). You set your own rates. Volunteer transporters earn Green Points instead of cash for each delivery.",
      },
      {
        q: "How do I update my availability?",
        a: "On your Transporter Dashboard, use the Online/Offline toggle at the top. When offline, you won't receive new booking requests. Update your status before and after each delivery.",
      },
      {
        q: "How are bookings assigned?",
        a: "Receivers choose transporters for their transactions. You receive a booking request and can accept or decline. Accepted bookings appear in your Active tab with full pickup and delivery details.",
      },
    ],
  },
  {
    section: "Trust & Safety",
    icon: "🛡️",
    items: [
      {
        q: "What is the Trust Score?",
        a: "Trust Score (0–100) is calculated from: verified identity (+20), completed transactions (+2 each), positive reviews (+5 each), dispute history (-10 each), and listing accuracy AI scores. Higher trust = better visibility.",
      },
      {
        q: "How does verification work?",
        a: "There are 4 verification levels: Unverified, Basic (email verified), Verified (ID/GST/NGO registration submitted), and Trusted (verified + 10+ successful transactions). Higher levels unlock advanced features.",
      },
      {
        q: "How do I report fraud?",
        a: "On any listing, click the flag icon to report suspicious activity. Our Sentinel AI agent automatically scans listings for duplicate photos, fake descriptions, and unusual patterns. Reports are reviewed within 24 hours.",
      },
      {
        q: "What is the dispute resolution process?",
        a: "1. Receiver raises dispute within 48h of delivery. 2. Admin reviews evidence. 3. Actions possible: Warn supplier, reduce trust score, partial refund (if applicable), ban repeat offenders. Resolution typically within 3–5 business days.",
      },
    ],
  },
  {
    section: "AI Features",
    icon: "🤖",
    items: [
      {
        q: "What do the AI agents do?",
        a: "ReCircle has 4 AI agents: (1) Scout Agent — matches materials to want requests and predicts demand; (2) Advisor Agent — answers questions and gives circular economy guidance; (3) Quality Agent — verifies listing photos and detects fraud; (4) Sentinel Agent — monitors for suspicious activity.",
      },
      {
        q: "How does quality verification work?",
        a: "When a transaction is marked 'In Transit', we compare the original listing photos with the pickup photos using AI vision. A match score (0–100%) is generated. Low scores (<60%) trigger a quality alert and may pause the transaction.",
      },
      {
        q: "How does demand forecasting help?",
        a: "The Demand Forecast dashboard shows actual demand data for each material category plus AI-predicted demand for the next 3 months. This helps suppliers list materials at peak demand periods and plan inventory better.",
      },
      {
        q: "Is my data used to train AI models?",
        a: "No. Your data is used only to power ReCircle's features. We do not sell or share data with third parties. AI features use OpenAI APIs, and we follow their data usage policies.",
      },
    ],
  },
  {
    section: "Green Points",
    icon: "🌱",
    items: [
      {
        q: "How do I earn Green Points?",
        a: "Earn GP by: Listing a material (+10), Donating a material (+25), Completing a transaction (+15), Getting a 5-star review (+10), Achieving milestones like first listing, 10 transactions, etc.",
      },
      {
        q: "What are the levels?",
        a: "Levels: Seedling (0–99 GP) → Sprout (100–299 GP) → Sapling (300–699 GP) → Tree (700–1499 GP) → Forest (1500+ GP). Each level unlocks better visibility, priority matching, and profile badges.",
      },
      {
        q: "What do badges mean?",
        a: "Badges celebrate achievements: 'First Listing', 'Carbon Saver' (500kg CO₂ saved), 'Trusted Supplier' (4.5+ rating after 20 reviews), 'Volunteer Hero' (50 free deliveries), and more. Badges appear on your public profile.",
      },
    ],
  },
]

export default function FAQPage() {
  const [search, setSearch]       = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggle = (key: string) =>
    setOpenItems(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const filtered = FAQ_DATA.map(section => ({
    ...section,
    items: section.items.filter(
      item =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter(s => s.items.length > 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
          <HelpCircle className="w-4 h-4" /> Help Center
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
        <p className="text-gray-500 mt-2">Everything you need to know about ReCircle</p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search FAQ…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-white h-12 rounded-xl"
        />
      </div>

      {/* FAQ Sections */}
      <div className="space-y-8">
        {filtered.map(section => (
          <div key={section.section}>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4">
              <span>{section.icon}</span> {section.section}
            </h2>
            <div className="space-y-2">
              {section.items.map((item, i) => {
                const key   = `${section.section}-${i}`
                const open  = openItems.includes(key)
                return (
                  <Card key={key} className={`border transition-all ${open ? "border-emerald-200 shadow-sm" : "border-gray-100"}`}>
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <span className="font-semibold text-gray-800 text-sm">{item.q}</span>
                      {open
                        ? <ChevronDown className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      }
                    </button>
                    {open && (
                      <CardContent className="px-4 pb-4 pt-0">
                        <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Still need help */}
      <div className="mt-12 bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
        <MessageSquare className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Still need help?</h3>
        <p className="text-gray-500 text-sm mb-4">
          Use our AI Advisor for instant answers, or browse the platform guides.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
            <MessageSquare className="w-4 h-4" /> Ask AI Advisor
          </Button>
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/marketplace">Browse Marketplace</Link>
          </Button>
        </div>
      </div>

      {/* No-return policy note */}
      <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
        <strong>🚫 No-Return Policy:</strong> All materials on ReCircle are sold/donated AS-IS.
        No returns are accepted. Please inspect listings carefully, ask the supplier questions,
        and request on-site inspection for high-value items before confirming.{" "}
        <Link href="/faq#For Receivers" className="underline">Learn more</Link>
      </div>
    </div>
  )
}
