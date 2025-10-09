"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, Clock, Users } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (session) {
      router.push("/dashboard")
    } else {
      router.push("/auth/signin")
    }
  }, [session, status, router])

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Memeriksa autentikasi...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // This should redirect, but let's show a nice landing page for demo
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Absensi Standalone
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sistem manajemen absensi modern dengan GPS tracking untuk efisiensi dan akurasi tinggi
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  GPS Tracking
                </CardTitle>
                <CardDescription>
                  Lacak lokasi dengan akurasi tinggi untuk memastikan kehadiran yang akurat
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Real-time Monitoring
                </CardTitle>
                <CardDescription>
                  Pantau absensi secara real-time dengan laporan yang komprehensif
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Role-Based Access
                </CardTitle>
                <CardDescription>
                  Kontrol akses berdasarkan role untuk keamanan dan privasi data
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="space-y-4">
            <Link href="/auth/signin">
              <Button size="lg">
                Mulai Menggunakan Sistem
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Sistem ini dirancang untuk organisasi kecil hingga menengah dengan fokus pada kemudahan penggunaan dan keakuratan data
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
