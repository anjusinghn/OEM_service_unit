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
