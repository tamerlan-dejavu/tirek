"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { use, useState, type FormEvent } from "react";

import { ElementTree } from "@/components/buildings/ElementTree";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState, QueryState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";
import type { Building, BuildingElement } from "@/lib/api/types";
import { can } from "@/lib/permissions";
import { ELEMENT_GROUP } from "@/lib/status";

interface ElementType {
  code: string;
  group: string;
  name: string;
  note: string;
}

const input = "mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none";

/** AC-04: element hierarchy (Здание → Подъезд / Блок → Кровля → Участок), classifier of the building type. */
export default function ElementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: me } = useMe();
  const qc = useQueryClient();
  const building = useApi<Building>(`buildings/${id}/`);
  const query = useApi<BuildingElement[]>(`building-elements/?building=${id}`);
  const types = useApi<ElementType[]>(building.data ? `element-types/?building_type=${building.data.building_type}` : null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setPending(true);
    setError(null);
    try {
      await api("building-elements/", {
        method: "POST",
        body: {
          building: id,
          element_type: f.get("element_type"),
          parent: f.get("parent") || null,
          name: f.get("name"),
          location: f.get("location"),
        },
      });
      form.reset();
      await qc.invalidateQueries({ queryKey: [`building-elements/?building=${id}`] });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  const groups = Object.entries(ELEMENT_GROUP);
  return (
    <Card
      title="Конструктивные элементы и инженерные системы"
      actions={
        can.editBuilding(me) && !open ? (
          <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>
            Добавить элемент
          </Button>
        ) : undefined
      }
    >
      {open && (
        <form onSubmit={add} className="mb-6 rounded-md border border-line p-4">
          {error ? (
            <div className="mb-3">
              <ErrorState error={error} />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted">Тип по классификатору</span>
              <select name="element_type" required className={input}>
                <option value="">— выберите —</option>
                {groups.map(([g, title]) => (
                  <optgroup key={g} label={title}>
                    {types.data
                      ?.filter((t) => t.group === g)
                      .map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name}
                          {t.note ? " · на согласовании" : ""}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted">Входит в</span>
              <select name="parent" className={input}>
                <option value="">— здание целиком —</option>
                {query.data?.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.path.join(" → ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted">Название</span>
              <input name="name" required placeholder="напр. Кровля · подъезд №2, Блок А" className={input} />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Расположение</span>
              <input name="location" placeholder="напр. оси 1–4, отм. +36.000" className={input} />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Добавить
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
              Готово
            </Button>
          </div>
        </form>
      )}
      <QueryState query={query} empty={(d) => d.length === 0} emptyTitle="Элементы не добавлены">
        {(elements) => <ElementTree elements={elements} />}
      </QueryState>
    </Card>
  );
}
