/**
 * Client-side checks for AWS Secrets Manager store and reference forms.
 * Each validator returns a specific message, or null when the value is valid.
 */

// Keep these patterns in sync with tracecat/secrets/schemas.py.
const AWS_ROLE_ARN_REGEX =
  /^arn:aws(?:-[a-z]+)*:iam::\d{12}:role\/[\w+=,.@/-]+$/
const AWS_REGION_REGEX = /^[a-z]{2}(?:-[a-z]+)+-\d$/
const AWS_SECRET_ARN_REGEX =
  /^arn:aws(?:-[a-z]+)*:secretsmanager:[a-z0-9-]+:\d{12}:secret:\S+$/
const AWS_SECRET_NAME_REGEX = /^[A-Za-z0-9/_+=.@-]{1,512}$/
const AWS_SECRET_ID_MAX_LENGTH = 2048
const SECRET_NAME_REGEX = /^[a-z_][a-z0-9_]*$/
const SECRET_KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Synthetic example shown in role ARN hints and placeholders. */
export const EXAMPLE_ROLE_ARN =
  "arn:aws:iam::123456789012:role/tracecat-secrets-reader"
const EXAMPLE_SECRET_ARN =
  "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/app/api-key-AbCdEf"

/** Explain why a value is not an IAM role ARN the backend accepts. */
export function validateAwsRoleArn(value: string): string | null {
  const arn = value.trim()
  if (AWS_ROLE_ARN_REGEX.test(arn)) {
    return null
  }
  if (!arn) {
    return `输入 IAM 角色 ARN，例如 ${EXAMPLE_ROLE_ARN}`
  }
  if (/[{}<>]/.test(arn)) {
    return `请将 {Account} 等占位符替换为实际值，例如 ${EXAMPLE_ROLE_ARN}`
  }
  const [prefix, , service, , account, resource] = arn.split(":")
  if (prefix !== "arn" || service !== "iam" || !resource?.startsWith("role/")) {
    return `输入 IAM 角色 ARN，而非用户、策略或密钥 ARN，例如 ${EXAMPLE_ROLE_ARN}`
  }
  if (!/^\d{12}$/.test(account ?? "")) {
    return "账号 ID 必须恰好为 12 位数字，例如 arn:aws:iam::123456789012:role/…"
  }
  return `请检查角色 ARN 格式，例如 ${EXAMPLE_ROLE_ARN}`
}

/** Explain why a value is not an AWS region code. */
export function validateAwsRegion(value: string): string | null {
  const region = value.trim()
  if (AWS_REGION_REGEX.test(region)) {
    return null
  }
  return "输入区域代码，如 us-east-1 或 eu-west-2，不要填写区域显示名称。"
}

/** Explain why a value cannot be used as a `SECRETS.<name>` identifier. */
export function validateSecretName(value: string): string | null {
  if (SECRET_NAME_REGEX.test(value) && value.length <= 100) {
    return null
  }
  if (!value) {
    return "输入名称，例如 hello_world"
  }
  if (value.includes(".") || value.startsWith("SECRETS")) {
    return "仅输入名称，如 hello_world，不要填写完整的 SECRETS.<name>.<key> 引用。"
  }
  if (value.length > 100) {
    return "最多使用 100 个字符。"
  }
  if (/[A-Z]/.test(value)) {
    return "仅使用小写字母，例如 hello_world"
  }
  if (/^\d/.test(value)) {
    return "以字母或下划线开头，例如 hello_world"
  }
  return "仅使用小写字母、数字和下划线（不含空格或连字符），例如 hello_world"
}

/** Explain why a value is not a Secrets Manager secret name or ARN. */
export function validateAwsSecretId(value: string): string | null {
  const secretId = value.trim()
  if (
    secretId.startsWith("arn:") &&
    secretId.length > AWS_SECRET_ID_MAX_LENGTH
  ) {
    return `密钥 ARN 最多 ${AWS_SECRET_ID_MAX_LENGTH} 个字符。`
  }
  if (
    AWS_SECRET_ARN_REGEX.test(secretId) ||
    AWS_SECRET_NAME_REGEX.test(secretId)
  ) {
    return null
  }
  if (!secretId) {
    return "输入密钥名称或 ARN，例如 prod/app/api-key"
  }
  if (secretId.startsWith("arn:")) {
    return `输入完整的 Secrets Manager 密钥 ARN，例如 ${EXAMPLE_SECRET_ARN}`
  }
  if (secretId.length > 512) {
    return "密钥名称最多 512 个字符。"
  }
  return "密钥名称只能包含字母、数字和 / _ + = . @ -，不能包含空格，例如 prod/app/api-key"
}

/** Explain why a value cannot be used as an output key. */
export function validateSecretKey(value: string): string | null {
  const key = value.trim()
  if (SECRET_KEY_REGEX.test(key)) {
    return null
  }
  if (!key) {
    return "输入键名，例如 API_TOKEN"
  }
  return "使用字母、数字和下划线，并以字母或下划线开头，例如 API_TOKEN"
}
