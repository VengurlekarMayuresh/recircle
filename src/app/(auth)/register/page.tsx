"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const roles = [
  { label: "Individual", value: "individual" },
  { label: "Business", value: "business" },
  { label: "NGO", value: "ngo" },
  { label: "Volunteer Courier", value: "volunteer" },
  { label: "Transporter", value: "transporter" },
]

const cities = ["Mumbai", "Delhi", "Pune", "Bangalore", "Surat", "Ahmedabad", "Chennai", "Kolkata", "Hyderabad", "Jaipur"]

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "",
    city: "",
    orgName: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { confirmPassword: _cp, ...registerData } = formData
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Registration failed")
      }

      toast({
        title: "Success",
        description: "Your account has been created!",
      })

      if (formData.role === "transporter" || formData.role === "volunteer") {
        router.push("/transporters/register")
      } else {
        router.push("/login")
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
      <Card className="w-full max-w-lg bg-white/80 backdrop-blur-md shadow-xl border-t-4 border-t-emerald-500">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-gray-900">Create an account</CardTitle>
          <CardDescription>
            Join ReCircle and start giving materials a second life
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Manya Sharma" value={formData.name} onChange={handleChange} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="manya@example.com" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="9876543210" value={formData.phone} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">I am a...</Label>
              <Select onValueChange={(value) => handleSelectChange("role", value)} required>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select onValueChange={(value) => handleSelectChange("city", value)} required>
                <SelectTrigger id="city">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formData.role === "business" || formData.role === "ngo") && (
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input id="orgName" placeholder="Eco Corp / Green Earth NGO" value={formData.orgName} onChange={handleChange} required />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={formData.password} onChange={handleChange} required minLength={8} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
            </div>

            <Button
              type="submit"
              className="w-full col-span-1 md:col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-center gap-2 overflow-hidden text-sm text-gray-600">
          <span>Already have an account?</span>
          <Link
            href="/login"
            className="font-semibold text-emerald-600 hover:text-emerald-500"
          >
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
