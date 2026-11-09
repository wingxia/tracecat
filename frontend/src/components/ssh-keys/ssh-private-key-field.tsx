import type {
  Control,
  FieldPath,
  FieldValues,
  UseFormRegister,
} from "react-hook-form"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

interface SshPrivateKeyFieldProps<T extends FieldValues> {
  control: Control<T>
  register: UseFormRegister<T>
  name: FieldPath<T>
}

const sshPrivateKeyPlaceholder = "以“-----BEGIN OPENSSH PRIVATE KEY-----”开头"

export function SshPrivateKeyField<T extends FieldValues>({
  control,
  register,
  name,
}: SshPrivateKeyFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel className="text-sm">键</FormLabel>
          <FormControl>
            <Textarea
              className="h-36 text-sm"
              placeholder={sshPrivateKeyPlaceholder}
              {...register(name)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
