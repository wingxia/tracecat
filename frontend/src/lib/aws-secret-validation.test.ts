import {
  validateAwsRegion,
  validateAwsRoleArn,
  validateAwsSecretId,
  validateSecretKey,
  validateSecretName,
} from "@/lib/aws-secret-validation"

describe("validateAwsRoleArn", () => {
  it.each([
    "arn:aws:iam::123456789012:role/tracecat-secrets-reader",
    "arn:aws-us-gov:iam::123456789012:role/path/to/reader",
    "  arn:aws-cn:iam::123456789012:role/reader  ",
  ])("accepts %s", (value) => {
    expect(validateAwsRoleArn(value)).toBeNull()
  })

  it.each([
    ["", /输入 IAM 角色 ARN/],
    ["arn:aws:iam::{Account}:role/{RoleNameWithPath}", /等占位符替换为实际值/],
    ["my-role", /输入 IAM 角色 ARN/],
    ["arn:aws:iam::123456789012:user/reader", /输入 IAM 角色 ARN/],
    [
      "arn:aws:secretsmanager:us-east-1:123456789012:secret:x",
      /输入 IAM 角色 ARN/,
    ],
    ["arn:aws:iam::my-account:role/reader", /12 位数字/],
    ["arn:aws:iam::12345:role/reader", /12 位数字/],
    ["arn:aws:iam::123456789012:role/bad name", /请检查角色 ARN 格式/],
  ])("explains %s", (value, message) => {
    expect(validateAwsRoleArn(value)).toMatch(message)
  })
})

describe("validateAwsRegion", () => {
  it("accepts region codes", () => {
    expect(validateAwsRegion("us-east-1")).toBeNull()
    expect(validateAwsRegion("us-gov-west-1")).toBeNull()
  })

  it.each(["US East (N. Virginia)", "us-east", "useast1"])(
    "rejects %s",
    (value) => {
      expect(validateAwsRegion(value)).toMatch(/区域代码，如 us-east-1/)
    }
  )
})

describe("validateSecretName", () => {
  it("accepts snake case names", () => {
    expect(validateSecretName("hello_world")).toBeNull()
    expect(validateSecretName("secrets_api")).toBeNull()
  })

  it.each([
    ["SECRETS.hello_world.hello", /仅输入名称/],
    ["hello_world.hello", /仅输入名称/],
    ["SECRETS", /仅输入名称/],
    ["Hello", /小写/],
    ["1password", /以字母或下划线开头/],
    ["hello-world", /不含空格或连字符/],
    ["", /输入名称/],
  ])("explains %s", (value, message) => {
    expect(validateSecretName(value)).toMatch(message)
  })
})

describe("validateAwsSecretId", () => {
  it.each([
    "prod/app/api-key",
    "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/app-AbCdEf",
  ])("accepts %s", (value) => {
    expect(validateAwsSecretId(value)).toBeNull()
  })

  it.each([
    ["", /输入密钥名称或 ARN/],
    ["arn:aws:secretsmanager:us-east-1:secret:x", /完整的 Secrets Manager/],
    ["prod app key", /不能包含空格/],
    [
      `arn:aws:secretsmanager:us-east-1:123456789012:secret:${"a".repeat(2048)}`,
      /最多 2048 个字符/,
    ],
  ])("explains %s", (value, message) => {
    expect(validateAwsSecretId(value)).toMatch(message)
  })
})

describe("validateSecretKey", () => {
  it("accepts identifiers", () => {
    expect(validateSecretKey("API_TOKEN")).toBeNull()
  })

  it("explains invalid keys", () => {
    expect(validateSecretKey("")).toMatch(/输入键名/)
    expect(validateSecretKey("api-token")).toMatch(/以字母或下划线开头/)
  })
})
