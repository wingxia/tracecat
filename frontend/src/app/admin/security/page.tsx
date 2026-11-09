"use client"

import { PlatformSecuritySettings } from "@/components/admin/platform-security-settings"
import { MfaPolicyCard } from "@/components/settings/mfa-policy-card"
import { SecuritySettings } from "@/components/settings/security-settings"

export default function AdminSecuritySettingsPage() {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="space-y-4">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">
              多因素认证
            </h2>
            <p className="text-base text-muted-foreground">
              注册安全密钥后，如果最近 5
              分钟内未验证，删除组织或邀请用户等平台管理员特权操作会要求再次验证。
            </p>
          </div>
          <MfaPolicyCard
            scope="platform"
            description={
              "要求平台管理员每次登录都使用安全密钥或通行密钥验证。尚未注册密钥的管理员须在下次登录时注册。"
            }
          />
          <div className="rounded-md border p-4">
            <SecuritySettings />
          </div>
        </div>

        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">IP 白名单</h2>
            <p className="text-base text-muted-foreground">
              仅允许可信 IP 地址访问平台管理功能，例如 VPN 出口网段。
            </p>
          </div>
        </div>

        <PlatformSecuritySettings />
      </div>
    </div>
  )
}
