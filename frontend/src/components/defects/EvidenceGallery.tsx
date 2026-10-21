"use client";

import { Camera, X } from "lucide-react";
import { useState } from "react";

import { Empty } from "@/components/ui/States";
import { API_BASE, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import { formatDate } from "@/lib/status";

interface StoredFile {
  id: string;
  original_name: string;
  content_type: string;
  caption: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

/**
 * Photographic evidence. Images are served only through the access-checked download endpoint.
 * Large preview on click; keyboard-closable.
 */
export function EvidenceGallery({ targetType, targetId }: { targetType: string; targetId: string }) {
  const query = useApi<Paginated<StoredFile>>(`files/?target_type=${targetType}&target_id=${targetId}`);
  const [open, setOpen] = useState<StoredFile | null>(null);
  const photos = query.data?.results.filter((f) => f.content_type.startsWith("image/")) ?? [];
  const url = (f: StoredFile) => `${API_BASE}/v1/files/${f.id}/download/`;

  if (query.isLoading) return <div className="aspect-[16/7] animate-pulse rounded-md bg-mist" />;
  if (!photos.length)
    return (
      <Empty title="Фотофиксация отсутствует" icon={<Camera className="size-5" />}>
        Фото прикрепляются из чек-листа обследования или при повторном наблюдении.
      </Empty>
    );

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((f, i) => (
          <li key={f.id} className={i === 0 ? "col-span-2 row-span-2" : undefined}>
            <button onClick={() => setOpen(f)} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-mist">
              {/* eslint-disable-next-line @next/next/no-img-element -- private, access-checked URL */}
              <img src={url(f)} alt={f.caption || f.original_name} className="size-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.02]" />
              <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-navy/80 px-1.5 py-0.5 font-mono text-[10px] text-white">
                {String(i + 1).padStart(2, "0")} · {formatDate(f.created_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.caption || open.original_name}
          className="fixed inset-0 z-50 grid place-items-center bg-navy/85 p-4"
          onKeyDown={(e) => e.key === "Escape" && setOpen(null)}
        >
          <button className="absolute inset-0" aria-label="Закрыть" onClick={() => setOpen(null)} />
          <figure className="relative max-h-full max-w-5xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url(open)} alt={open.caption || open.original_name} className="max-h-[80vh] rounded-md" />
            <figcaption className="mt-2 flex justify-between font-mono text-xs text-white/70">
              <span>{open.caption || open.original_name}</span>
              <span>{open.width && open.height ? `${open.width}×${open.height}px` : ""}</span>
            </figcaption>
            <button autoFocus onClick={() => setOpen(null)} className="absolute -top-10 right-0 grid size-8 place-items-center rounded-md text-white hover:bg-white/10" aria-label="Закрыть просмотр">
              <X className="size-5" />
            </button>
          </figure>
        </div>
      )}
    </>
  );
}
