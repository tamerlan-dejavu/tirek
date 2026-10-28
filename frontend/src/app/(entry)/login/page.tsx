"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { AuthFrame } from "@/components/auth/AuthFrame";
import { RolePicker } from "@/components/auth/RolePicker";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { DemoAccount, Me } from "@/lib/api/types";
import { homeFor } from "@/lib/permissions";

/** Tell «wrong password» apart from «server unreachable»: they need different actions. */
function loginErrorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "invalid_otp") return "Неверный код из приложения.";
    if (err.status === 429) return "Слишком много попыток. Попробуйте через 15 минут.";
    if (err.code === "invalid_credentials") return "Неверный email или пароль.";
    if (err.status === 400) return "Проверьте email и пароль.";
  }
  return SERVER_DOWN;
}

const SERVER_DOWN =
  "Сервер не отвечает. Демо-стенд после простоя запускается около минуты — попробуйте ещё раз чуть позже.";

function EmailLoginForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needOtp, setNeedOtp] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const me = await api<Me>("auth/login/", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password"), otp: form.get("otp") ?? "" },
      });
      router.replace(params.get("next") ?? homeFor(me));
    } catch (err) {
      if (err instanceof ApiError && err.code === "mfa_required") {
        setNeedOtp(true); // password accepted; ask for the second factor
        return;
      }
      if (err instanceof ApiError && err.code === "invalid_otp") setNeedOtp(true);
      setError(loginErrorText(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!compact && (
        <div>
          <div className="label-tech mb-2">Платформа инженерного сопровождения</div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Вход в Tirek</h1>
          <p className="mt-1.5 text-sm text-muted">
            Доступ выдаёт администратор вашей организации по приглашению.
          </p>
        </div>
      )}
      <Field label="Email" name="email" type="email" autoComplete="username" required />
      <Field
        label="Пароль"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {needOtp && (
        <Field label="Код из приложения" name="otp" inputMode="numeric" autoComplete="one-time-code" autoFocus required pattern="[0-9 ]{6,7}" />
      )}
      {error && (
        <p role="alert" className="rounded-md bg-critical-soft px-3 py-2 text-sm text-critical-ink">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Проверка…" : "Войти"}
      </Button>
      <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
        <Link href="/reset-password" className="text-accent-strong hover:underline">
          Забыли пароль?
        </Link>
        <Link href="/" className="text-muted hover:text-ink">
          О платформе
        </Link>
      </div>
    </form>
  );
}

/** Demo stand: «Кто вы?» — choose a role, the email form stays available below. */
function DemoEntry({ accounts }: { accounts: DemoAccount[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [showEmail, setShowEmail] = useState(false);

  return (
    <div className="min-h-dvh bg-base">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" aria-label="Tirek — главная">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-muted uppercase">
              Демо-стенд
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-5 py-12 md:px-8 md:py-16">
        <div className="max-w-2xl">
          <div className="label-tech mb-3">Вход в Tirek</div>
          <h1 className="text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] font-bold tracking-[-0.035em]">
            Кто вы?
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            Выберите роль — откроется рабочее место с демонстрационными данными. Сменить роль можно
            в любой момент из верхней панели.
          </p>
        </div>
        <div className="mt-10">
          <RolePicker
            accounts={accounts}
            onSignedIn={(home) => router.replace(params.get("next") ?? home)}
          />
        </div>
        <div className="mt-12 max-w-sm border-t border-line pt-6">
          <button
            onClick={() => setShowEmail((v) => !v)}
            aria-expanded={showEmail}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink"
          >
            У меня есть учётная запись — войти по email
            <ChevronDown
              className={
                showEmail ? "size-4 rotate-180 transition-transform" : "size-4 transition-transform"
              }
            />
          </button>
          {showEmail && (
            <div className="mt-5">
              <EmailLoginForm compact />
            </div>
          )}
        </div>
        <p className="mt-12 max-w-2xl text-xs text-faint">
          Демо-стенд: все дома, люди и записи вымышлены. Беспарольный вход работает только для
          демонстрационных аккаунтов и отключается в рабочей среде.
        </p>
      </main>
    </div>
  );
}

function LoginScreen() {
  const demo = useApi<{ enabled: boolean; accounts: DemoAccount[] }>("auth/demo/", ["demo"]);
  if (demo.isLoading) return <Loading />;
  if (demo.data?.enabled && demo.data.accounts.length)
    return <DemoEntry accounts={demo.data.accounts} />;
  return (
    <AuthFrame>
      {demo.error ? (
        <div
          role="status"
          className="mb-6 rounded-md border border-warning/40 bg-warning-soft px-3 py-2.5 text-sm text-warning-ink"
        >
          <p>{SERVER_DOWN}</p>
          <button
            onClick={() => demo.refetch()}
            disabled={demo.isFetching}
            className="mt-2 font-medium underline underline-offset-2"
          >
            {demo.isFetching ? "Подключение…" : "Повторить"}
          </button>
        </div>
      ) : null}
      <EmailLoginForm />
    </AuthFrame>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
