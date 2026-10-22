"use client";

import clsx from "clsx";
import { Camera, LoaderCircle, Phone, Send, Siren, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { ServiceRequest } from "@/lib/api/types";
import { REQUEST_CATEGORIES } from "@/lib/status";

const input = "h-12 w-full rounded-md border border-line bg-surface px-3 text-[15px] focus:border-accent focus:outline-none";

/** Phone-first request form: category, place, description, photo/video, emergency flag. */
export default function NewRequestPage() {
  const router = useRouter();
  const overview = useApi<{ id: string; address: string }[]>("resident/overview/");
  const building = overview.data?.[0];
  const [category, setCategory] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!building || !category) return;
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
    setPending(true);
    setError(null);
    try {
      const req = await api<ServiceRequest>("service-requests/", {
        method: "POST",
        body: {
          building: building.id,
          category,
          entrance: num("entrance"),
          floor: num("floor"),
          apartment: f.get("apartment"),
          place: f.get("place"),
          description: f.get("description"),
          contact_phone: f.get("contact_phone"),
          is_emergency: emergency,
        },
      });
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("building", building.id);
        form.append("kind", file.type.startsWith("video/") ? "video" : "photo");
        form.append("target_type", "service_request");
        form.append("target_id", req.id);
        await api("files/upload/", { method: "POST", body: form });
      }
      router.replace(`/resident/requests/${req.id}`);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-7 pb-10">
      <div>
        <div className="label-tech mb-2">Новая заявка</div>
        <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] leading-tight font-bold tracking-[-0.03em]">Сообщить о проблеме</h1>
        {building && <p className="mt-2 text-[15px] text-muted">{building.address}</p>}
      </div>

      <fieldset>
        <legend className="mb-3 text-[15px] font-semibold">Что случилось?</legend>
        <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REQUEST_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              role="radio"
              aria-checked={category === c.value}
              onClick={() => setCategory(c.value)}
              className={clsx(
                "min-h-14 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                category === c.value ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink hover:border-line-strong",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div
        className={clsx(
          "rounded-lg border p-4 transition-colors",
          emergency ? "border-critical/60 bg-critical-soft" : "border-line bg-surface",
        )}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} className="mt-1 size-5 accent-[var(--color-critical)]" />
          <span>
            <span className="flex items-center gap-2 font-medium">
              <Siren className="size-4 text-critical-ink" aria-hidden /> Это авария
            </span>
            <span className="mt-0.5 block text-sm text-muted">Затопление, искрение, запах газа, угроза обрушения — заявка уйдёт диспетчеру с пометкой «авария».</span>
          </span>
        </label>
        {emergency && (
          <div className="mt-4 rounded-md border border-critical/40 bg-base p-3 text-sm">
            <p className="font-medium text-critical-ink">При угрозе жизни сначала позвоните в экстренные службы:</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 font-mono">
              {[
                ["112", "единая служба"],
                ["101", "пожарная"],
                ["104", "газовая"],
                ["103", "скорая"],
              ].map(([n, t]) => (
                <li key={n}>
                  <a href={`tel:${n}`} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 hover:border-line-strong">
                    <Phone className="size-4 text-critical-ink" aria-hidden />
                    <span className="text-ink">{n}</span>
                    <span className="font-sans text-xs text-muted">{t}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Tirek не заменяет аварийные службы.</p>
          </div>
        )}
      </div>

      <fieldset>
        <legend className="mb-3 text-[15px] font-semibold">Где?</legend>
        <div className="grid grid-cols-3 gap-2">
          <input name="entrance" type="number" min={1} inputMode="numeric" placeholder="Подъезд" aria-label="Подъезд" className={input} />
          <input name="floor" type="number" min={-2} inputMode="numeric" placeholder="Этаж" aria-label="Этаж" className={input} />
          <input name="apartment" placeholder="Кв." aria-label="Квартира" className={input} />
        </div>
        <input name="place" placeholder="Где именно: потолок в коридоре, лифт, подвал…" aria-label="Где именно" className={`${input} mt-2`} />
      </fieldset>

      <label className="block">
        <span className="mb-3 block text-[15px] font-semibold">Опишите проблему</span>
        <textarea name="description" required minLength={5} placeholder="Что видите, с какого времени, становится ли хуже" className="min-h-32 w-full rounded-md border border-line bg-surface p-3 text-[15px] focus:border-accent focus:outline-none" />
      </label>

      <div>
        <div className="mb-3 text-[15px] font-semibold">Фото или видео</div>
        <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line-strong bg-surface text-sm text-muted transition-colors hover:border-accent hover:text-ink">
          <Camera className="size-5" aria-hidden /> Снять или выбрать файл
          <input
            type="file"
            accept="image/*,video/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])].slice(0, 6))}
          />
        </label>
        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2 text-sm">
                <span className="truncate">
                  {f.type.startsWith("video/") ? "Видео" : "Фото"} · {f.name}
                  <span className="ml-2 font-mono text-xs text-faint">{(f.size / 1_048_576).toFixed(1)} МБ</span>
                </span>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Убрать ${f.name}`} className="text-muted hover:text-ink">
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-faint">До 6 файлов. Фото до 25 МБ, видео до 100 МБ. Геометка из фото удаляется.</p>
      </div>

      <label className="block">
        <span className="mb-3 block text-[15px] font-semibold">Телефон для связи (необязательно)</span>
        <input name="contact_phone" type="tel" inputMode="tel" placeholder="+7 …" className={input} />
      </label>

      {error ? <ErrorState error={error} /> : null}

      <Button type="submit" size="lg" className="w-full" disabled={!category || !building || pending} icon={pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}>
        {pending ? "Отправка…" : "Отправить заявку"}
      </Button>
    </form>
  );
}
