import type { AuditWebhookTestResult } from "@/client"

function formatErrorCategory(category: string | null | undefined): string {
  switch (category) {
    case "receiver_error":
      return "receiver error"
    case "timeout":
      return "timeout"
    case "request_error":
      return "request error"
    default:
      return "request failed"
  }
}

/** Return the toast title for an audit webhook test result. */
export function getAuditWebhookTestTitle(
  result: AuditWebhookTestResult
): string {
  return result.ok ? "审计 Webhook 测试成功" : "审计 Webhook 测试失败"
}

/** Return the receiver status or categorized failure description. */
export function getAuditWebhookTestDescription(
  result: AuditWebhookTestResult
): string {
  if (result.receiver_status_code != null) {
    return `接收端返回 ${result.receiver_status_code}。`
  }
  return `Tracecat 无法连接接收端：${formatErrorCategory(result.error_category)}。`
}
