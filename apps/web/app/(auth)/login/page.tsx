"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useAuth } from "../../../hooks/use-auth"
import { cn } from "../../../lib/cn"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    try {
      await login(data)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-sidebar-bg px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-[320px] w-[320px] rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-[280px] w-[280px] rounded-full bg-ai/[0.04] blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              className="text-primary"
              aria-hidden="true"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[15px] font-semibold tracking-tight text-sidebar-active">
              kazindustries
            </h1>
            <p className="mt-0.5 text-[12px] text-sidebar-foreground">
              Service Orchestration Platform
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-sidebar-border bg-[hsl(224_50%_7%)] px-8 py-8 shadow-2xl shadow-black/50">
          <div className="mb-6">
            <h2 className="text-[17px] font-semibold text-sidebar-active">Sign in</h2>
            <p className="mt-0.5 text-[13px] text-sidebar-foreground">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-critical/25 bg-critical/[0.08] px-3.5 py-2.5 text-[13px] text-critical"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
                  <line
                    x1="12"
                    y1="8"
                    x2="12"
                    y2="12"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="16" r="0.75" fill="currentColor" />
                </svg>
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[12px] font-medium text-sidebar-foreground">
                Email address
              </label>
              <input
                {...register("email")}
                id="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="fleet@kazindustries.com"
                className={cn(
                  "h-[38px] w-full rounded-lg border bg-white/[0.05] px-3.5 text-[13px] text-sidebar-active placeholder:text-sidebar-foreground/40",
                  "transition-[border-color,box-shadow] duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50",
                  errors.email
                    ? "border-critical/50 focus:ring-critical/30 focus:border-critical/50"
                    : "border-sidebar-border hover:border-white/20",
                )}
              />
              {errors.email && (
                <p className="text-[11px] text-critical">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[12px] font-medium text-sidebar-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    "h-[38px] w-full rounded-lg border bg-white/[0.05] px-3.5 pr-10 text-[13px] text-sidebar-active placeholder:text-sidebar-foreground/40",
                    "transition-[border-color,box-shadow] duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50",
                    errors.password
                      ? "border-critical/50 focus:ring-critical/30 focus:border-critical/50"
                      : "border-sidebar-border hover:border-white/20",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-critical">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 flex h-[38px] w-full items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-medium text-white transition-opacity duration-150 hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-sidebar-foreground/30">
          © 2026 kazindustries · Internal use only
        </p>
      </div>
    </div>
  )
}
