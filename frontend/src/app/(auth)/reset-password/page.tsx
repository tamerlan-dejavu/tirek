"use client";

import { useState, type FormEvent } from "react";

import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";

export default function ResetRequestPage() {
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await api("auth/password-reset/", {
      method: "POST",
      body: { email: new FormData(e.currentTarget).get("email") },
    }).catch(() => undefined);
    setSent(true); // same message whether or not the account exists
  }

  if (sent) return <p className="text-sm">Если такой аккаунт существует, мы отправили ссылку для восстановления.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Восстановление доступа</h1>
      <Field label="Email" name="email" type="email" required />
      <Button type="submit" className="w-full">Отправить ссылку</Button>
    </form>
  );
}
