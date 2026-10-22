"use client";

import { LoaderCircle, Siren } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { uploadMedia } from "@/components/files/MediaUpload";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/States";
import { api, type Paginated } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";
import type { Building, ServiceRequest } from "@/lib/api/types";
import { can, roles } from "@/lib/permissions";
import { REQUEST_CATEGORIES } from "@/lib/status";

const input =
  "mt-1.5 h-11 w-full rounded-md border border-line bg-surface px-3 text-[15px] focus:border-accent focus:outline-none";
const label = "block text-sm font-medium text-ink";

/** Staff registers a request: a phone call (dispatcher), a finding on a round (specialist, engineer). */
export default function StaffNewRequestPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const buildings = useApi<Paginated<Building>>("buildings/?page_size=200");
  const [emergency, setEmergency] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const my = roles(me);
  const source = can.dispatch(me)
    ? "диспетчер (звонок, обращение)"
    : my.has("reviewing_engineer")
      ? "инженер"
      : my.has("field_specialist")
        ? "специалист"
        : "представитель ОСИ";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
    const building = String(f.get("building"));
    setPending(true);
    setError(null);
    try {
      const req = await api<ServiceRequest>("service-requests/", {
        method: "POST",
        body: {
          building,
          category: f.get("category"),
          entrance: num("entrance"),
          floor: num("floor"),
          apartment: f.get("apartment"),
          place: f.get("place"),
          description: f.get("description"),
          contact_phone: f.get("contact_phone"),
          is_emergency: emergency,
        },
      });
      if (files.length) await uploadMedia(files, building, "service_request", req.id);
      router.replace(`/requests/${req.id}`);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 pb-10">
      <PageHeader
        code="Заявки · регистрация"
        title="Новая заявка"
        subtitle={`Номер присваивается автоматически. Источник: ${source}.`}
      />
      {error ? <ErrorState error={error} /> : null}

      <Card index="1" title="Объект и место">
        <div className="space-y-4">
          <label className={label}>
            Объект
            <select name="building" required className={input}>
              <option value="">— выберите дом —</option>
              {buildings.data?.results.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.internal_code} · {b.address}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              name="entrance"
              type="number"
              min={1}
              placeholder="Подъезд"
              aria-label="Подъезд"
              className={input}
            />
            <input
              name="floor"
              type="number"
              min={-2}
              placeholder="Этаж"
              aria-label="Этаж"
              className={input}
            />
            <input name="apartment" placeholder="Кв." aria-label="Квартира" className={input} />
          </div>
          <input
            name="place"
            placeholder="Где именно: подвал, стояк ХВС у ввода…"
            aria-label="Где именно"
            className={input}
          />
        </div>
      </Card>

      <Card index="2" title="Что случилось">
        <div className="space-y-4">
          <label className={label}>
            Категория
            <select name="category" required className={input}>
              <option value="">— выберите —</option>
              {REQUEST_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Описание
            <textarea
              name="description"
              required
              minLength={5}
              className="mt-1.5 min-h-28 w-full rounded-md border border-line bg-surface p-3 text-[15px] focus:border-accent focus:outline-none"
            />
          </label>
          <label className={label}>
            Контактный телефон
            <input
              name="contact_phone"
              type="tel"
              placeholder="+7 7__ ___ __ __"
              className={`${input} font-mono`}
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3">
            <input
              type="checkbox"
              checked={emergency}
              onChange={(e) => setEmergency(e.target.checked)}
              className="mt-1 size-4 accent-[var(--color-critical)]"
            />
            <span>
              <span className="flex items-center gap-2 text-sm font-medium">
                <Siren className="size-4 text-critical-ink" aria-hidden /> Авария
              </span>
              <span className="block text-xs text-muted">
                Приоритет станет «аварийный». Подтверждение аварии оповещает все организации дома.
              </span>
            </span>
          </label>
        </div>
      </Card>

      <Card index="3" title="Фото проблемы">
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
          aria-label="Фото или видео"
          className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-ink"
        />
        <p className="mt-2 text-xs text-faint">
          До 6 файлов. Фото результата прикладывает исполнитель позже.
        </p>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending}
        icon={pending ? <LoaderCircle className="size-4 animate-spin" /> : undefined}
      >
        {pending ? "Сохранение…" : "Зарегистрировать"}
      </Button>
    </form>
  );
}
