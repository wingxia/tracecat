import { InfoCircledIcon } from "@radix-ui/react-icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ProtectedColumnsAlert() {
  return (
    <Alert>
      <InfoCircledIcon className="size-4" />
      <AlertTitle>受保护的列</AlertTitle>
      <AlertDescription>
        以下列名： <code>id</code>, <code>created_at</code>、或{" "}
        <code>updated_at</code> 属于受保护列名，导入时将跳过。
      </AlertDescription>
    </Alert>
  )
}
