import { expect, test } from "@playwright/test"

import {
  createOrganizationInvitation,
  DEFAULT_SMOKE_PASSWORD,
  expectWorkspaceLanding,
  freshEmail,
  SUPERUSER_EMAIL,
  SUPERUSER_PASSWORD,
  signInWithBasicAuth,
  TENANT_USER_EMAIL,
} from "./utils/auth"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("authentication", () => {
  test("anonymous visitor can start basic auth", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /登录/i }).click()

    await expect(page.getByLabel("Email")).toBeVisible()
    await page.getByLabel("Email").fill(TENANT_USER_EMAIL)
    await page.getByRole("button", { name: "继续" }).click()

    await expect(page.getByLabel("Password")).toBeVisible()
  })

  test("fresh invited user can sign up and land in a workspace", async ({
    page,
    request,
  }, testInfo) => {
    const email = freshEmail(testInfo.title)
    const token = await createOrganizationInvitation(request, email)
    const returnUrl = `/invitations/accept?token=${token}`

    await page.goto(`/sign-up?returnUrl=${encodeURIComponent(returnUrl)}`)
    await expect(page.getByRole("heading", { name: "创建账号" })).toBeVisible()

    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(DEFAULT_SMOKE_PASSWORD)
    await page.getByRole("button", { name: "创建账号" }).click()

    await expectWorkspaceLanding(page)
  })

  test("seeded superuser can access the admin console", async ({ page }) => {
    await signInWithBasicAuth(page, SUPERUSER_EMAIL, SUPERUSER_PASSWORD)

    await page.goto("/admin/users")
    await expect(page.getByRole("heading", { name: "用户" })).toBeVisible()
    await expect(page.getByText("管理平台用户和超级用户权限。")).toBeVisible()
  })
})
