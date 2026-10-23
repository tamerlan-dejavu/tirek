"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Camera, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api/client";

/** Upload photos or videos to a record (defect, request…). Uses the access-checked file API. */
export async function uploadMedia(
  files: File[],
  building: string,
  targetType: string,
  targetId: string,
  photoKind = "photo",
) {
  for (const file of files) {
    const form = new FormData();
    form.append("file", file);
    form.append("building", building);
    form.append("kind", file.type.startsWith("video/") ? "video" : photoKind);
    form.append("target_type", targetType);
    form.append("target_id", targetId);
    await api("files/upload/", { method: "POST", body: form });
  }
}

export function MediaUpload({
  building,
  targetType,
  targetId,
  photoKind = "photo",
  label = "Добавить фото или видео",
  onUploaded,
}: {
  building: string;
  targetType: string;
  targetId: string;
  photoKind?: string;
  label?: string;
  onUploaded?: () => void;
}) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<unknown>(null);

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, 6);
    if (!files.length) return;
    setError(null);
    setPending(files.length);
    try {
      await uploadMedia(files, building, targetType, targetId, photoKind);
      await qc.invalidateQueries({
        queryKey: [`files/?target_type=${targetType}&target_id=${targetId}`],
      });
      onUploaded?.();
    } catch (err) {
      setError(err);
    } finally {
      setPending(0);
    }
  }

  return (
    <div className="mt-4">
      <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-sm text-muted transition-colors hover:border-accent hover:text-ink">
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Camera className="size-4" aria-hidden />
        )}
        {pending ? `Загрузка: ${pending}…` : label}
        <input
          type="file"
          accept="image/*,video/*"
          capture="environment"
          multiple
          disabled={!!pending}
          className="sr-only"
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      <p className="mt-1.5 text-xs text-faint">
        Фото до 25 МБ, видео до 100 МБ. Геометка из фото удаляется.
      </p>
      {error ? (
        <div className="mt-2">
          <ErrorState error={error} />
        </div>
      ) : null}
    </div>
  );
}
