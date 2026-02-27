"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

export default function KickedPage() {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("studentName")
      localStorage.removeItem("studentId")
    }
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Badge className="bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] text-white px-4 py-1.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Intervue Poll
          </Badge>
        </div>
        <h1 className="text-3xl text-[#000000] mb-2">
          You&apos;ve been <span className="font-bold">Kicked out !</span>
        </h1>
        <p className="text-[#7C7C7C] max-w-xl mx-auto">
          Looks like the teacher had removed you from the poll system .Please Try again sometime.
        </p>
      </div>
    </div>
  )
}

