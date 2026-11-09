"use client"

import { CheckCheckIcon, CopyIcon } from "lucide-react"
import React from "react"
import type {
  SecretStoreCreate,
  SecretStoreProvider,
  SecretStoreRead,
  SecretStoreUpdate,
} from "@/client"
import { CopyButton } from "@/components/copy-button"
import { AwsIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  EXAMPLE_ROLE_ARN,
  validateAwsRegion,
  validateAwsRoleArn,
} from "@/lib/aws-secret-validation"
import { cn, copyToClipboard } from "@/lib/utils"

/** Draft provider config held by the create dialog before submission. */
export type CreateConfigState = Record<string, string>

/** Inline validation messages keyed by config field. */
export type CreateConfigErrors = Partial<Record<string, string>>

type ConfigFieldsProps = {
  config: CreateConfigState
  onChange: (next: CreateConfigState) => void
  errors: CreateConfigErrors
}

/**
 * Provider-specific labels, fields, and detail rendering for a secret store.
 * Setup runs in two phases: create issues server-owned fields such as the
 * external ID, then setup collects what depends on them and enables the store.
 */
export type SecretStoreProviderEntry = {
  label: string
  /** How Tracecat authenticates, shown in the provider picker. */
  method: string
  /** Column heading for `summary`, e.g. the store region. */
  locationLabel: string
  Icon: React.ComponentType<{ className?: string }>
  summary: (store: SecretStoreRead) => string
  createTitle: string
  createDescription: string
  CreateFields: React.ComponentType<ConfigFieldsProps>
  validateCreate: (config: CreateConfigState) => CreateConfigErrors
  toCreateConfig: (config: CreateConfigState) => SecretStoreCreate["config"]
  setupTitle: string
  setupDescription: string
  isSetupComplete: (store: SecretStoreRead) => boolean
  SetupFields: React.ComponentType<
    ConfigFieldsProps & {
      store: SecretStoreRead
      // `undefined` while scopes load: render neither the field nor the notice.
      canEdit: boolean | undefined
    }
  >
  validateSetup: (config: CreateConfigState) => CreateConfigErrors
  toSetupConfig: (config: CreateConfigState) => SecretStoreUpdate["config"]
  EditFields: React.ComponentType<ConfigFieldsProps>
  validateEdit: (
    config: CreateConfigState,
    store: SecretStoreRead
  ) => CreateConfigErrors
  toUpdateConfig: (config: CreateConfigState) => SecretStoreUpdate["config"]
  Details: React.ComponentType<{
    store: SecretStoreRead
    usage: React.ReactNode
  }>
}

/**
 * Builds the IAM trust policy an org admin attaches to the store role so the
 * Tracecat principal can assume it with the persisted external ID.
 */
function buildStoreTrustPolicy(store: SecretStoreRead): string {
  return JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            AWS: store.tracecat_aws_principal_arn ?? "<tracecat-principal-arn>",
          },
          Action: "sts:AssumeRole",
          Condition: {
            StringEquals: { "sts:ExternalId": store.config.external_id },
          },
        },
      ],
    },
    null,
    2
  )
}

/**
 * Minimal read-only permissions the store role needs. No ListSecrets,
 * write, delete, or rotation permissions are requested.
 */
export function buildStorePermissionPolicy(store: SecretStoreRead): string {
  const partition =
    store.config.role_arn?.split(":")[1] ?? store.aws_partition ?? "aws"
  return JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["secretsmanager:GetSecretValue"],
          Resource: `arn:${partition}:secretsmanager:${store.config.region}:*:secret:*`,
        },
        {
          Effect: "Allow",
          Action: ["kms:Decrypt"],
          Resource: "*",
          Condition: {
            StringEquals: {
              // KMS ViaService uses amazonaws.com in every partition, including China.
              // https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html#conditions-kms-via-service
              "kms:ViaService": `secretsmanager.${store.config.region}.amazonaws.com`,
            },
          },
        },
      ],
    },
    null,
    2
  )
}

function RoleArnField({
  id,
  value,
  onChange,
  error,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoFocus?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>角色 ARN</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={EXAMPLE_ROLE_ARN}
        autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function RegionField({
  id,
  value,
  onChange,
  error,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>区域</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="us-east-1"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function AwsSecretsManagerCreateFields({
  config,
  onChange,
  errors,
}: ConfigFieldsProps) {
  return (
    <RegionField
      id="store-region"
      value={config.region ?? ""}
      onChange={(region) => onChange({ ...config, region })}
      error={errors.region}
    />
  )
}

function AwsSecretsManagerSetupFields({
  store,
  config,
  onChange,
  errors,
  canEdit,
}: ConfigFieldsProps & {
  store: SecretStoreRead
  canEdit: boolean | undefined
}) {
  return (
    <>
      {canEdit === true && (
        <RoleArnField
          id="setup-role-arn"
          // Otherwise the dialog focuses the first copy button and opens its tooltip.
          autoFocus
          value={config.role_arn ?? ""}
          onChange={(role_arn) => onChange({ ...config, role_arn })}
          error={errors.role_arn}
        />
      )}
      {canEdit === false && (
        <p className="text-xs text-muted-foreground">
          填写角色 ARN
          需要更新密钥存储的权限。请将这些策略分享给组织管理员以完成设置。
        </p>
      )}
      <StorePolicies store={store} />
    </>
  )
}

function AwsSecretsManagerEditFields({
  config,
  onChange,
  errors,
}: ConfigFieldsProps) {
  return (
    <>
      <RoleArnField
        id="store-role-arn"
        value={config.role_arn ?? ""}
        onChange={(role_arn) => onChange({ ...config, role_arn })}
        error={errors.role_arn}
      />
      <RegionField
        id="store-region"
        value={config.region ?? ""}
        onChange={(region) => onChange({ ...config, region })}
        error={errors.region}
      />
    </>
  )
}

function compactErrors(
  errors: Record<string, string | null>
): CreateConfigErrors {
  return Object.fromEntries(
    Object.entries(errors).filter((entry): entry is [string, string] =>
      Boolean(entry[1])
    )
  )
}

function PolicyBlock({
  description,
  policy,
  highlight,
}: {
  description: string
  policy: string
  highlight: (line: string) => boolean
}) {
  // Lines repeat (braces), so position is the only stable key.
  const lines = policy.split("\n").map((text, position) => ({ text, position }))
  return (
    <>
      <p className="border-b px-3 py-2 text-xs text-muted-foreground">
        {description}
      </p>
      <pre className="max-h-80 overflow-auto rounded-b-md bg-muted/40 py-2 font-mono text-xs leading-relaxed">
        {lines.map((line) => (
          <span
            key={line.position}
            className={cn(
              "block px-3",
              highlight(line.text)
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground"
            )}
          >
            {line.text}
          </span>
        ))}
      </pre>
    </>
  )
}

function StorePolicies({ store }: { store: SecretStoreRead }) {
  const [activeId, setActiveId] = React.useState("trust")
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!copiedId) return
    const timer = setTimeout(() => setCopiedId(null), 2000)
    return () => clearTimeout(timer)
  }, [copiedId])
  const policies = [
    {
      id: "trust",
      title: "信任策略",
      description: "附加到角色，高亮行是此存储的外部 ID。",
      policy: buildStoreTrustPolicy(store),
      highlight: (line: string) => line.includes("sts:ExternalId"),
    },
    {
      id: "permissions",
      title: "权限策略",
      description: "只读。请将高亮的 Resource 范围缩小到需要共享的密钥。",
      policy: buildStorePermissionPolicy(store),
      highlight: (line: string) => line.includes('"Resource": "arn:'),
    },
  ]
  const active = policies.find((item) => item.id === activeId) ?? policies[0]
  const copied = copiedId === active.id
  return (
    <Tabs
      value={active.id}
      onValueChange={(id) => {
        setActiveId(id)
        setCopiedId(null)
      }}
      className="min-w-0 rounded-md border"
    >
      <div className="flex items-center justify-between gap-2 border-b pr-2">
        <TabsList className="h-9 justify-start rounded-none bg-transparent p-0">
          {policies.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className="h-full rounded-none text-xs"
            >
              {item.title}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          aria-label={`复制 ${active.title.toLowerCase()}`}
          onClick={async () => {
            const policyId = active.id
            const landed = await copyToClipboard({
              value: active.policy,
              message: `已复制 ${active.title.toLowerCase()}`,
            })
            if (landed) setCopiedId(policyId)
          }}
        >
          {copied ? (
            <CheckCheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      {policies.map((item) => (
        <TabsContent key={item.id} value={item.id} className="mt-0">
          <PolicyBlock {...item} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function DetailItem({
  label,
  value,
  copyLabel,
}: {
  label: string
  value: string | null | undefined
  copyLabel: string
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs font-medium">{label}</dt>
      <dd className="flex items-center gap-1.5">
        <code className="break-all font-mono text-xs text-muted-foreground">
          {value ?? "未设置"}
        </code>
        {value && (
          <CopyButton
            value={value}
            toastMessage={`已复制${copyLabel}`}
            tooltipMessage={`复制${copyLabel}`}
          />
        )}
      </dd>
    </div>
  )
}

function AwsSecretsManagerDetails({
  store,
  usage,
}: {
  store: SecretStoreRead
  usage: React.ReactNode
}) {
  return (
    <>
      <StorePolicies store={store} />
      <dl className="grid gap-x-8 gap-y-4 border-t pt-4 sm:grid-cols-3">
        <DetailItem
          label={"角色 ARN"}
          value={store.config.role_arn}
          copyLabel="role ARN"
        />
        <DetailItem
          label={"外部 ID"}
          value={store.config.external_id}
          copyLabel="external ID"
        />
        <div className="min-w-0 space-y-1">
          <dt className="text-xs font-medium">使用者</dt>
          <dd>{usage}</dd>
        </div>
      </dl>
    </>
  )
}

/** Provider-specific rendering and payload building, keyed by provider. */
export const SECRET_STORE_PROVIDERS: Record<
  SecretStoreProvider,
  SecretStoreProviderEntry
> = {
  aws_secrets_manager: {
    label: "AWS Secrets Manager",
    method: "带外部 ID 的 IAM 角色",
    locationLabel: "区域",
    Icon: ({ className }) => <AwsIcon className={className} />,
    summary: (store) => store.config.region,
    createTitle: "添加 AWS Secrets Manager 存储",
    createDescription:
      "输入名称和存储密钥的区域，保存后将生成外部 ID 和信任策略。",
    CreateFields: AwsSecretsManagerCreateFields,
    validateCreate: (config) =>
      compactErrors({ region: validateAwsRegion(config.region ?? "") }),
    toCreateConfig: (config) => ({
      provider: "aws_secrets_manager",
      region: (config.region ?? "").trim(),
    }),
    setupTitle: "连接 AWS 角色",
    setupDescription: "在 AWS 中使用这些策略创建 IAM 角色，然后输入其 ARN。",
    isSetupComplete: (store) => Boolean(store.config.role_arn),
    SetupFields: AwsSecretsManagerSetupFields,
    validateSetup: (config) =>
      compactErrors({ role_arn: validateAwsRoleArn(config.role_arn ?? "") }),
    toSetupConfig: (config) => ({ role_arn: (config.role_arn ?? "").trim() }),
    EditFields: AwsSecretsManagerEditFields,
    validateEdit: (config, store) =>
      compactErrors({
        // A store still in setup may keep an empty role ARN.
        role_arn:
          store.config.role_arn || config.role_arn?.trim()
            ? validateAwsRoleArn(config.role_arn ?? "")
            : null,
        region: validateAwsRegion(config.region ?? ""),
      }),
    toUpdateConfig: (config) => ({
      role_arn: config.role_arn?.trim() || undefined,
      region: (config.region ?? "").trim(),
    }),
    Details: AwsSecretsManagerDetails,
  },
}
