"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { isCustomerOnly } from "@/lib/permissions";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const me = await api<Me>("auth/login/", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") },
      });
      router.replace(params.get("next") ?? (isCustomerOnly(me) ? "/osi" : "/dashboard"));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Слишком много попыток. Попробуйте через 15 минут."
          : "Неверный email или пароль.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <div className="label-tech mb-2">Платформа инженерного сопровождения</div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Вход в Tirek</h1>
        <p className="mt-1.5 text-sm text-muted">Доступ выдаёт администратор вашей организации по приглашению.</p>
      </div>
      <Field label="Email" name="email" type="email" autoComplete="username" required />
      <Field label="Пароль" name="password" type="password" autoComplete="current-password" required />
      {error && (
        <p role="alert" className="rounded-md bg-critical-soft px-3 py-2 text-sm text-critical-ink">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Проверка…" : "Войти"}
      </Button>
      <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
        <Link href="/reset-password" className="text-teal-strong hover:underline">
          Забыли пароль?
        </Link>
        <Link href="/" className="text-muted hover:text-ink">
          О платформе
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
