"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Download, FileText, Printer, Leaf, IndianRupee, Droplets,
  Building2, TreePine, Zap, Recycle, BarChart3, Calendar
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts"

export default function ESGReportPage() {
  const { data: session } = useSession()
  const [report, setReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const printRef = useRef<HTMLDivElement>(null)

  const fetchReport = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
      const res = await fetch(`/api/reports/esg?${params}`)
      if (res.ok) setReport(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.id) fetchReport()
  }, [session?.user?.id])

  const handlePrint = () => window.print()

  const handleExportCSV = () => {
    if (!report) return
    const rows = [
      ['ESG Report - ReCircle'],
      ['Organization', report.organization?.name || ''],
      ['Period', `${report.reportPeriod?.start?.slice(0,10)} to ${report.reportPeriod?.end?.slice(0,10)}`],
      [],
      ['SUMMARY'],
      ['Materials Redistributed', report.summary?.totalMaterialsRedistributed],
      ['kg Diverted', report.summary?.totalKgDiverted],
      ['CO2 Saved (kg)', report.summary?.totalCo2Saved],
      ['Rupees Saved', report.summary?.totalRupeesSaved],
      ['Water Saved (L)', report.summary?.waterSaved],
      ['Landfill Avoided (tonnes)', report.summary?.landfillAvoided],
      ['Communities Impacted', report.summary?.communitiesImpacted],
      [],
      ['CATEGORY BREAKDOWN'],
      ['Category', 'Count', 'kg Diverted', 'CO2 Saved (kg)', 'Rupees Saved'],
      ...(report.categoryBreakdown || []).map((c: any) => [c.name, c.count, c.kgDiverted, c.co2Saved, c.rupeesSaved]),
      [],
      ['MONTHLY BREAKDOWN'],
      ['Month', 'Listings', 'Transactions', 'CO2 Saved', 'kg Diverted'],
      ...(report.monthlyBreakdown || []).map((m: any) => [m.month, m.listings, m.transactions, m.co2Saved, m.kgDiverted])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recircle-esg-report-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Please log in to view your ESG report.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 print:px-0 print:py-0" ref={printRef}>
      {/* Controls - hidden on print */}
      <div className="print:hidden flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ESG Impact Report</h1>
          <p className="text-gray-500 mt-1">Your circular economy sustainability data</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <Button onClick={fetchReport} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <BarChart3 className="w-4 h-4" /> Generate
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Recycle className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-gray-500">Generating your ESG report...</p>
        </div>
      ) : report ? (
        <div className="space-y-8">
          {/* Header - shown on print */}
          <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl p-8 print:rounded-none">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Recycle className="w-8 h-8" />
                  <span className="text-2xl font-black tracking-tight">ReCircle</span>
                </div>
                <h2 className="text-3xl font-bold">{report.organization?.name}</h2>
                <p className="text-emerald-100 mt-1">{report.organization?.city} • {report.organization?.email}</p>
              </div>
              <div className="text-right">
                <Badge className="bg-white/20 text-white border-none text-sm px-3 py-1">
                  ESG / CSR Report
                </Badge>
                <p className="text-emerald-100 text-sm mt-2 flex items-center gap-1 justify-end">
                  <Calendar className="w-3.5 h-3.5" />
                  {report.reportPeriod?.start?.slice(0,10)} → {report.reportPeriod?.end?.slice(0,10)}
                </p>
                <p className="text-emerald-200 text-xs mt-1">Generated: {new Date(report.generatedAt).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Materials Redistributed', value: report.summary?.totalMaterialsRedistributed, icon: <Recycle className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
              { label: 'kg Diverted from Landfill', value: `${report.summary?.totalKgDiverted?.toLocaleString()}`, icon: <Leaf className="w-6 h-6" />, color: 'bg-green-50 text-green-600 border-green-100' },
              { label: 'CO₂ Saved (kg)', value: `${report.summary?.totalCo2Saved?.toLocaleString()}`, icon: <TreePine className="w-6 h-6" />, color: 'bg-teal-50 text-teal-600 border-teal-100' },
              { label: 'Rupees Saved (₹)', value: `₹${report.summary?.totalRupeesSaved?.toLocaleString()}`, icon: <IndianRupee className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600 border-blue-100' },
            ].map(({ label, value, icon, color }) => (
              <Card key={label} className={`border ${color.split(' ')[2]}`}>
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color.split(' ')[0]} ${color.split(' ')[1]}`}>
                    {icon}
                  </div>
                  <p className="text-2xl font-black text-gray-800">{value}</p>
                  <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Equivalencies */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <TreePine className="w-5 h-5" /> Environmental Equivalencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-2xl border border-green-100">
                  <TreePine className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-black text-green-700">{report.equivalencies?.treesEquivalent}</p>
                  <p className="text-sm text-gray-500">Trees planted equivalent</p>
                </div>
                <div className="text-center p-4 bg-white rounded-2xl border border-blue-100">
                  <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-black text-blue-700">{report.equivalencies?.householdsPowered}</p>
                  <p className="text-sm text-gray-500">Households powered for a month</p>
                </div>
                <div className="text-center p-4 bg-white rounded-2xl border border-cyan-100">
                  <Droplets className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
                  <p className="text-3xl font-black text-cyan-700">{report.summary?.waterSaved?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Liters of water saved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scope 3 Data */}
          <Card className="border-purple-100">
            <CardHeader>
              <CardTitle className="text-purple-800 flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Scope 3 Carbon Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center bg-purple-50 rounded-xl p-4">
                <div>
                  <p className="font-semibold text-purple-900">Category 12 — End-of-life treatment</p>
                  <p className="text-sm text-purple-700 mt-0.5">{report.scope3CarbonData?.description}</p>
                </div>
                <p className="text-2xl font-black text-purple-700">{report.scope3CarbonData?.scope3_category_12}</p>
              </div>
              <p className="text-xs text-gray-400 italic">Calculation: {report.scope3CarbonData?.calculation_method}</p>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          {report.categoryBreakdown?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 font-semibold text-gray-600">Category</th>
                        <th className="text-right py-2 font-semibold text-gray-600">Materials</th>
                        <th className="text-right py-2 font-semibold text-gray-600">kg Diverted</th>
                        <th className="text-right py-2 font-semibold text-gray-600">CO₂ Saved</th>
                        <th className="text-right py-2 font-semibold text-gray-600">₹ Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.categoryBreakdown.map((cat: any) => (
                        <tr key={cat.name} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5 font-medium text-gray-800">{cat.name}</td>
                          <td className="py-2.5 text-right text-gray-600">{cat.count}</td>
                          <td className="py-2.5 text-right text-emerald-700 font-semibold">{cat.kgDiverted.toFixed(1)} kg</td>
                          <td className="py-2.5 text-right text-teal-700 font-semibold">{cat.co2Saved.toFixed(1)} kg</td>
                          <td className="py-2.5 text-right text-blue-700 font-semibold">₹{cat.rupeesSaved.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Trend Chart */}
          {report.monthlyBreakdown?.length > 0 && (
            <Card className="print:hidden">
              <CardHeader>
                <CardTitle>Monthly Impact Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={report.monthlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="co2Saved" name="CO₂ Saved (kg)" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="kgDiverted" name="kg Diverted" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            <p>Generated by ReCircle — Every material deserves a second life.</p>
            <p className="mt-1">Data based on CPCB India emission factors. Report period: {report.reportPeriod?.start?.slice(0,10)} to {report.reportPeriod?.end?.slice(0,10)}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">No data available. Please adjust the date range.</div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
