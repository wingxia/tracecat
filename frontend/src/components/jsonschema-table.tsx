import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { jsonSchemaToParams } from "@/lib/jsonschema"
import type { TracecatJsonSchema } from "@/lib/schema"

export function JSONSchemaTable({ schema }: { schema: TracecatJsonSchema }) {
  const params = jsonSchemaToParams(schema).sort((a, b) => {
    // Sort required fields first, then alphabetically
    if (a.required && !b.required) return -1
    if (!a.required && b.required) return 1
    return a.parameter.localeCompare(b.parameter)
  })
  return (
    <Table>
      <TableHeader>
        <TableRow className="h-6 text-xs capitalize ">
          <TableHead className="min-w-max whitespace-nowrap font-bold">
            参数
          </TableHead>
          <TableHead className="font-bold">输入</TableHead>
          <TableHead className="font-bold">默认</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {params.map((row, idx) => (
          <HoverCard openDelay={100} closeDelay={100} key={idx}>
            <HoverCardTrigger asChild>
              <TableRow
                key={idx}
                className="font-mono text-xs tracking-tight text-muted-foreground"
              >
                <TableCell className="whitespace-nowrap">
                  {row.parameter}
                  {row.required && " *"}
                  {row.deprecated && (
                    <span className="ml-2 rounded border px-1.5 py-0.5 font-sans text-[10px] font-medium uppercase tracking-normal text-muted-foreground">
                      已弃用
                    </span>
                  )}
                </TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>
                  {typeof row.default === "object"
                    ? JSON.stringify(row.default)
                    : row.default}
                  {/* This is a hacky solution to avoid `<div> cannot appear as a child of <tr>` */}
                  <HoverCardContent
                    className="w-[300px] max-w-[300px] space-y-2 p-3"
                    side="left"
                    align="start"
                    sideOffset={20}
                  >
                    <div className="flex w-full items-center justify-between text-muted-foreground">
                      <span className="break-words font-mono text-sm font-semibold">
                        {row.parameter}
                      </span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground/80">
                        &nbsp;{row.required ? "（必填）" : "（可选）"}
                      </span>
                    </div>
                    <div className="w-full space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        描述
                      </span>
                      <p className="break-words text-xs text-foreground/70">
                        {row.description}
                      </p>
                      {row.deprecated && row.deprecationMessage && (
                        <p className="break-words text-xs text-muted-foreground">
                          {row.deprecationMessage}
                        </p>
                      )}
                    </div>
                    <div className="w-full space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        约束
                      </span>
                      <p className="break-words text-xs text-foreground/70">
                        {row.constraints || "无"}
                      </p>
                    </div>
                  </HoverCardContent>
                </TableCell>
              </TableRow>
            </HoverCardTrigger>
          </HoverCard>
        ))}
      </TableBody>
    </Table>
  )
}
