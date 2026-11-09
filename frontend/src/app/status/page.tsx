import Image from "next/image"
import Link from "next/link"
import TracecatIcon from "public/icon.png"
import { Icons } from "@/components/icons"
import { AlertNotification } from "@/components/notifications"
import { siteConfig } from "@/config/site"

export default async function Page() {
  return (
    <main className="container flex size-full max-w-[400px] flex-col items-center justify-center space-y-4">
      <Image src={TracecatIcon} alt="Tracecat" className="mb-8 size-16" />
      <h1 className="text-lg font-semibold">很抱歉给你带来不便。</h1>
      <AlertNotification
        level="info"
        className="text-2xl font-medium"
        message={
          "站点暂时不可用，预计 1–2 小时后恢复。请前往 Discord 查看最新消息。"
        }
      />
      <div className="flex items-center justify-center space-x-4">
        <Link href={siteConfig.links.discord} target="_blank">
          <Icons.discord className="size-5" />
        </Link>
        <Link href={siteConfig.links.github} target="_blank">
          <Icons.gitHub className="size-5" />
        </Link>
      </div>
    </main>
  )
}
