"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { roles } from "@/lib/permissions";

interface Setup {
  secret: string;
  uri: string;
  qr_svg: string;
}

const input = "h-10 w-36 rounded-md border border-line bg-surface px-3 text-center font-mono text-base tracking-[0.3em] focus:border-accent focus:outline-none";

/** ТЗ 5.1, 9.1: one-time codes from an authenticator app; recommended for privileged users. */
export function MfaCard({ me }: { me: Me }) {
  const qc = useQueryClient();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const privileged = ["provider_admin", "reviewing_engineer"].some((r) => roles(me).has(r as never));

  async function call<T>(path: string, body?: unknown) {
    setPending(true);
    setError(null);
    try {
      return await api<T>(path, { method: "POST", body });
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setPending(false);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    const path = me.mfa_enabled ? "auth/mfa/disable/" : "auth/mfa/enable/";
    if (await call<Me>(path, { code })) {
      setSetup(null);
      setCode("");
      await qc.invalidateQueries({ queryKey: ["me"] });
    }
  }

  const codeForm = (label: string, variant: "primary" | "danger") => (
    <form onSubmit={confirm} className="mt-3 flex flex-wrap items-center gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        aria-label="Код из приложения"
        className={input}
      />
      <Button type="submit" variant={variant} disabled={pending || code.length !== 6}>
        {label}
      </Button>
    </form>
  );

  return (
    <Card title="Двухфакторная защита">
      {error ? (
        <div className="mb-3">
          <ErrorState error={error} />
        </div>
      ) : null}
      {me.mfa_enabled ? (
        <>
          <p className="flex items-center gap-2 text-sm text-healthy-ink">
            <ShieldCheck className="size-4" aria-hidden /> Включена: при входе нужен код из приложения.
          </p>
          <p className="mt-2 text-xs text-muted">Чтобы отключить, введите текущий код.</p>
          {codeForm("Отключить", "danger")}
        </>
      ) : setup ? (
        <>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Откройте приложение-аутентификатор (Google Authenticator, 1Password, Яндекс Ключ и др.).</li>
            <li>Отсканируйте код или введите ключ вручную.</li>
            <li>Введите 6 цифр, которые покажет приложение.</li>
          </ol>
          <div className="mt-4 flex flex-wrap items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- inline QR data URI, nothing to optimize */}
            <img src={`data:image/svg+xml;utf8,${encodeURIComponent(setup.qr_svg)}`} alt="QR-код для приложения-аутентификатора" className="size-40 rounded-md bg-white p-1" />
            <div className="min-w-0 text-xs text-muted">
              Ключ:
              <div className="mt-1 font-mono text-sm break-all text-ink">{setup.secret}</div>
            </div>
          </div>
          {codeForm("Включить", "primary")}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            При входе, кроме пароля, потребуется код из приложения на телефоне.
            {privileged && <span className="mt-1 block text-warning-ink">Рекомендуется для вашей роли до работы с реальными данными.</span>}
          </p>
          <Button className="mt-3" variant="secondary" disabled={pending} onClick={async () => setSetup(await call<Setup>("auth/mfa/setup/"))}>
            Настроить
          </Button>
        </>
      )}
    </Card>
  );
}
