import Image from "next/image";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChannelAppAuthVariant = "loading" | "missing-data" | "error";

const COPY: Record<
  ChannelAppAuthVariant,
  { title: string; description: string }
> = {
  loading: {
    title: "Đang đăng nhập với Mezon",
    description: "Vui lòng đợi trong giây lát, đừng đóng cửa sổ này.",
  },
  "missing-data": {
    title: "Không thể đăng nhập",
    description:
      "Thiếu dữ liệu xác thực từ Mezon. Hãy mở lại ứng dụng từ Mezon Channel App.",
  },
  error: {
    title: "Đăng nhập thất bại",
    description: "Đã xảy ra lỗi khi xác thực tài khoản của bạn.",
  },
};

type ChannelAppAuthViewProps = {
  variant: ChannelAppAuthVariant;
  message?: string;
  className?: string;
};

export function ChannelAppAuthView({
  variant,
  message,
  className,
}: ChannelAppAuthViewProps) {
  const { title, description } = COPY[variant];
  const isLoading = variant === "loading";

  return (
    <main
      className={cn(
        "flex min-h-screen items-center justify-center bg-linear-to-b from-primary/5 via-white to-white px-4 py-10",
        className
      )}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 text-center shadow-lg shadow-primary/5"
        role={isLoading ? "status" : undefined}
        aria-live={isLoading ? "polite" : undefined}
        aria-busy={isLoading}
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
          <Image
            src="/images/Mezonly-logo.png"
            alt="Mezonly"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
        </div>

        <div
          className={cn(
            "mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full",
            isLoading ? "bg-primary/10 text-primary" : "bg-red-50 text-red-500"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          ) : (
            <AlertCircle className="h-6 w-6" aria-hidden />
          )}
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          {description}
        </p>

        {variant === "error" && message ? (
          <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
            {message}
          </p>
        ) : null}

        {isLoading ? (
          <div className="mt-6 flex justify-center gap-1.5" aria-hidden>
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
          </div>
        ) : null}
      </div>
    </main>
  );
}
