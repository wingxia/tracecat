import { type LucideIcon, SquareFunctionIcon, ToyBrickIcon } from "lucide-react"
import type { RegistryActionRead } from "@/client"

export const actionTypeToLabel: Record<
  RegistryActionRead["type"],
  { label: string; icon: LucideIcon }
> = {
  udf: {
    label: "用户定义函数",
    icon: SquareFunctionIcon,
  },
  template: {
    label: "模板动作",
    icon: ToyBrickIcon,
  },
}
