"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import TracecatIcon from "public/icon.png"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const router = useRouter()
  return (
    <main className="container flex size-full max-w-[400px] flex-col items-center justify-center space-y-4">
      <Image src={TracecatIcon} alt="Tracecat" className="mb-4 size-16" />
      <h1 className="text-2xl font-medium">页面未找到</h1>
      <p className="text-sm text-muted-foreground">你要访问的页面不存在。</p>
      <Button variant="outline" onClick={() => router.replace("/")}>
        返回首页
      </Button>
    </main>
  )
}
