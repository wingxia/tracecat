"use client"

import { OrgSettingsSecurityForm } from "@/components/organization/org-settings-security"
import { MfaPolicyCard } from "@/components/settings/mfa-policy-card"

export default function SecuritySettingsPage() {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="space-y-4">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">
              多因素认证
            </h2>
            <p className="text-base text-muted-foreground">
              要求成员每次登录都使用硬件安全密钥或通行密钥验证。
            </p>
          </div>
          <MfaPolicyCard
            scope="organization"
            description={
              "适用于密码、Google/OIDC 和 SAML 登录。尚未注册密钥的成员须在下次登录时注册。你需要先在“设置 > 安全”中注册密钥。"
            }
          />
        </div>

        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">IP 白名单</h2>
            <p className="text-base text-muted-foreground">
              仅允许可信 IP 地址访问此组织，例如 VPN 出口网段。
            </p>
          </div>
        </div>

        <OrgSettingsSecurityForm />
      </div>
    </div>
  )
}
