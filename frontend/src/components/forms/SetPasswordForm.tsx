"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api/client";

/** Shared by invite acceptance and password reset — both use a one-time token. */
export function SetPasswordForm({ token, endpoint, title }: { token: string; endpoint: string; title: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("password2")) {
      setError("Пароли не совпадают.");
      return;
    }
    try {
      await api(endpoint, { method: "POST", body: { token, password: form.get("password") } });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? "Ссылка недействительна или пароль слишком простой." : "Ошибка сети.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <Field label="Новый пароль" name="password" type="password" autoComplete="new-password" minLength={10} required hint="Не менее 10 символов" />
      <Field label="Повторите пароль" name="password2" type="password" autoComplete="new-password" required />
      {error && <p role="alert" className="text-sm text-risk-r1">{error}</p>}
      <Button type="submit" className="w-full">Сохранить пароль</Button>
    </form>
  );
}
