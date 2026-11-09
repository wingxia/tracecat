import Link from "next/link"

export default function PrivacyPolicy({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="px-8 text-center text-xs text-muted-foreground">
        使用 Tracecat 即表示你同意我们的{" "}
        <Link
          href="https://docs.google.com/document/d/e/2PACX-1vQvDe3SoVAPoQc51MgfGCP71IqFYX_rMVEde8zC4qmBCec5f8PLKQRdxa6tsUABT8gWAR9J-EVs2CrQ/pub"
          className="underline underline-offset-4 hover:text-primary"
        >
          服务条款
        </Link>{" "}
        和{" "}
        <Link
          href="https://docs.google.com/document/d/e/2PACX-1vTcdtgMyGfsi2yAVlwHthLJbz9kFfcwOiEaGJ6_qiyXo3QONr_qAYZDKmaK6yjptjYea14PZbLd01lF/pub"
          className="underline underline-offset-4 hover:text-primary"
        >
          隐私政策
        </Link>
        .
      </p>
    </div>
  )
}
