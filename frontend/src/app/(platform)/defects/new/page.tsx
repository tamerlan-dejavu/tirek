"use client";

import clsx from "clsx";
import { Camera, LoaderCircle, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { uploadMedia } from "@/components/files/MediaUpload";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/States";
import { api, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Building, BuildingElement, Defect, DefectCategory } from "@/lib/api/types";
import { RISK, RISK_ORDER } from "@/lib/status";

const input = "mt-1.5 h-12 w-full rounded-md border border-line bg-surface px-3 text-[15px] focus:border-accent focus:outline-none";
const label = "block text-sm font-medium text-ink";

/**
 * Register a defect (registry fields per spec §8): object, building element, category,
 * description, photo/video, detection date. The specialist is the current user; danger degree
 * here is PRELIMINARY — the engineer approves it together with the recommended action and priority.
 */
function NewDefectForm() {
  const router = useRouter();
  const params = useSearchParams();
  const fromChecklist = params.get("inspection");
  const [building, setBuilding] = useState(params.get("building") ?? "");
  const buildings = useApi<Paginated<Building>>(params.get("building") ? null : "buildings/?page_size=200");
  const elements = useApi<BuildingElement[]>(building ? `building-elements/?building=${building}` : null);
  const categories = useApi<DefectCategory[]>("defect-categories/");
  const [severity, setSeverity] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const d = await api<Defect>("defects/", {
        method: "POST",
        body: {
          building,
          inspection: fromChecklist,
          answer: params.get("answer"),
          element: f.get("element"),
          category: f.get("category") || null,
          location: f.get("location"),
          defect_type: f.get("defect_type"),
          description: f.get("description"),
          detected_on: f.get("detected_on"),
          preliminary_severity: severity,
        },
      });
      if (files.length) await uploadMedia(files, building, "defect", d.id);
      if (fromChecklist) router.back();
      else router.replace(`/defects/${d.id}`);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 pb-10">
      <PageHeader code="Реестр дефектов · новая запись" title="Новый дефект" subtitle="Номер дефекта присваивается автоматически. Специалист — вы." />
      {error ? <ErrorState error={error} /> : null}

      <Card index="1" title="Где">
        <div className="space-y-4">
          {!params.get("building") && (
            <label className={label}>
              Объект
              <select required value={building} onChange={(e) => setBuilding(e.target.value)} className={input}>
                <option value="">— выберите дом —</option>
                {buildings.data?.results.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.address} · {b.internal_code}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={label}>
            Элемент здания
            <select name="element" required disabled={!building} className={input}>
              <option value="">— выберите элемент —</option>
              {elements.data?.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.path.join(" → ")}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Место
            <input name="location" placeholder="напр. над кв. 36, ось Б, 4–6 этаж" className={input} />
          </label>
        </div>
      </Card>

      <Card index="2" title="Что">
        <div className="space-y-4">
          <label className={label}>
            Категория
            <select name="category" required className={input}>
              <option value="">— выберите категорию —</option>
              {categories.data?.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Наименование
            <input name="defect_type" required placeholder="Коротко: «Протечка кровли», «Трещина в перемычке»" className={input} />
          </label>
          <label className={label}>
            Описание
            <textarea name="description" required className="mt-1.5 min-h-28 w-full rounded-md border border-line bg-surface p-3 text-[15px] focus:border-accent focus:outline-none" />
          </label>
          <label className={label}>
            Дата обнаружения
            <input name="detected_on" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={`${input} font-mono`} />
          </label>
        </div>
      </Card>

      <Card index="3" title="Степень опасности (предварительно)">
        <div role="radiogroup" aria-label="Предварительная степень опасности" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {["", ...RISK_ORDER].map((r) => (
            <button
              type="button"
              key={r || "none"}
              role="radio"
              aria-checked={severity === r}
              onClick={() => setSeverity(r)}
              className={clsx(
                "min-h-12 rounded-md border px-2 text-sm transition-colors",
                severity === r ? "border-accent bg-accent-soft text-ink" : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {r ? RISK[r as keyof typeof RISK].label : "Не знаю"}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Это оценка специалиста на объекте. Степень опасности, рекомендуемое действие и приоритет утверждает проверяющий инженер.
        </p>
      </Card>

      <Card index="4" title="Фото и видео">
        <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-sm text-muted transition-colors hover:border-accent hover:text-ink">
          <Camera className="size-5" aria-hidden /> Снять или выбрать файлы
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
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
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
        <p className="mt-2 text-xs text-faint">До 6 файлов: фото до 25 МБ, видео до 100 МБ.</p>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={pending || !building} icon={pending ? <LoaderCircle className="size-4 animate-spin" /> : undefined}>
        {pending ? "Сохранение…" : "Зарегистрировать дефект"}
      </Button>
    </form>
  );
}

export default function NewDefectPage() {
  return (
    <Suspense>
      <NewDefectForm />
    </Suspense>
  );
}
