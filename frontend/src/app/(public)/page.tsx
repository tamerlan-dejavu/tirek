import { ArrowRight, ArrowUpRight, Building, Building2, Check, Hotel, House, Store } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { HeroBuilding } from "@/components/landing/HeroBuilding";
import { PlatformPreview } from "@/components/landing/PlatformPreview";
import { buttonClass } from "@/components/ui/Button";

export const metadata = {
  title: "Tirek — инженерная ясность для жилых и коммерческих зданий",
  description:
    "Цифровая платформа инженерного сопровождения многоквартирных домов, бизнес-центров, торговых центров и гостиниц.",
};

// Set NEXT_PUBLIC_CONTACT_EMAIL in .env; without it the CTA leads to the partner login.
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const CONTACT_HREF = CONTACT_EMAIL
  ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Запрос технического обследования")}`
  : "/login";

/* ── shared section scaffolding ──────────────────────────────────────────────────────────── */

function Section({
  id,
  index,
  kicker,
  title,
  lead,
  children,
  dark = false,
}: {
  id: string;
  index: string;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={dark ? "border-t border-line bg-base-2 text-ink" : "border-t border-line bg-canvas text-ink"}>
      <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <div className="label-tech">
            <span className="text-accent">{index}</span> / {kicker}
          </div>
          <div>
            <h2 id={`${id}-title`} className="max-w-3xl text-[clamp(1.875rem,3.4vw,3rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
              {title}
            </h2>
            {lead && <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted md:text-lg">{lead}</p>}
            <div className="mt-12">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PROBLEMS = [
  ["Разрозненные записи", "Акты, фото и переписка хранятся у разных людей — история дефекта теряется при смене специалиста."],
  ["Неполная техническая история", "Нельзя ответить, когда дефект появился, как развивался и что уже делали."],
  ["Запоздалое обслуживание", "Ремонт начинается после аварии, а не по плану — дороже и с риском для жителей."],
  ["Нет общей картины", "Заказчик — ОСИ, управляющая компания или владелец — не видит, какие проблемы критичны, а какие могут подождать."],
];

const STEPS = [
  ["01", "Обследовать", "Структурированный чек-лист по элементам здания прямо на объекте."],
  ["02", "Зафиксировать", "Дефект с фото, местом и элементом — из пункта чек-листа."],
  ["03", "Оценить", "Инженер присваивает категорию риска R1–R4 с обоснованием."],
  ["04", "Приоритизировать", "Критическое — первым; срочные случаи — немедленное уведомление."],
  ["05", "Спланировать", "Мероприятия с ответственными и сроками; заказчик согласовывает."],
  ["06", "Контролировать", "Выполнение подтверждается, инженер проверяет результат."],
];

const LIFECYCLE = [
  ["Обнаружен", "Полевой специалист", "фиксирует на объекте"],
  ["На проверке", "Проверяющий инженер", "изучает данные и фото"],
  ["Подтверждён", "Инженер", "утверждает категорию риска"],
  ["Запланирован", "Заказчик", "согласует мероприятие"],
  ["Устраняется", "Исполнитель", "выполняет работы"],
  ["Проверка", "Инженер", "проверяет результат"],
  ["Закрыт", "Инженер", "с основанием и историей"],
];

const PLAN = [
  { t: "Ремонт рулонной кровли", m: [8, 9], tone: "bg-r2" },
  { t: "Замена участка трубопровода", m: [7, 8], tone: "bg-r1" },
  { t: "Герметизация межпанельных швов", m: [9, 11], tone: "bg-r3" },
  { t: "Сезонный осмотр кровли и водостоков", m: [10, 10], tone: "bg-steel-2" },
  { t: "Подготовка к отопительному сезону", m: [8, 9], tone: "bg-steel-2" },
];
const BUILDING_TYPES = [
  { icon: House, t: "Многоквартирный жилой дом", d: "Подъезды, квартиры, кровля, подвалы, инженерные сети дома." },
  { icon: Building2, t: "Бизнес-центр", d: "Арендопригодная площадь, арендаторы, климат, СКУД, дымоудаление." },
  { icon: Store, t: "Торговый центр / ТРЦ", d: "Посещаемость, эскалаторы, эвакуационные пути, технологические помещения." },
  { icon: Hotel, t: "Гостиница", d: "Номерной фонд, кухонные и технологические помещения, климатические системы." },
  { icon: Building, t: "Иное коммерческое здание", d: "Общая модель данных с полями и элементами своего типа." },
];

const REQUEST_FLOW = [
  ["Новая", "Житель или пользователь", "описывает проблему, место, прикладывает фото"],
  ["Принята", "Диспетчер", "задаёт приоритет, аварии оповещают всех сразу"],
  ["Назначена", "Диспетчер", "исполнитель и срок"],
  ["Выполнена", "Исполнитель", "только с фото результата"],
  ["Проверена", "Инженер или диспетчер", "не сам исполнитель"],
  ["Закрыта", "Диспетчер", "заявитель получает уведомление и видит результат"],
];

const SECURITY = [
  ["Изоляция организаций", "Данные одной организации недоступны другой — ни через интерфейс, ни через прямой запрос к API."],
  ["Права проверяет сервер", "Роль, организация, связь со зданием и статус записи — при каждом запросе, а не в интерфейсе."],
  ["Двухфакторный вход", "Код из приложения-аутентификатора для администраторов и инженеров."],
  ["Журнал аудита", "Кто, когда и что изменил: входы, роли, доступы, утверждения, риски, публикации."],
  ["Приватные файлы", "Фото и документы выдаются только после проверки прав; геометка из фото удаляется."],
  ["История без перезаписи", "Оценки риска, обследования и отчёты исправляются новой версией, прежняя сохраняется."],
];

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/* ── page ─────────────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="bg-base">
      {/* A. HERO */}
      <header className="relative overflow-hidden bg-base text-ink">
        {/* barely perceptible depth on the first screen */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_70%_30%,rgb(255_255_255/0.035),transparent_70%)]" />

        <nav className="relative mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 md:px-8" aria-label="Сайт">
          <Logo />
          <div className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#how" className="hover:text-ink">Как это работает</a>
            <a href="#platform" className="hover:text-ink">Платформа</a>
            <a href="#types" className="hover:text-ink">Типы зданий</a>
            <a href="#requests" className="hover:text-ink">Заявки</a>
            <a href="#customer" className="hover:text-ink">Для заказчика</a>
            <a href="#reports" className="hover:text-ink">Отчёты</a>
          </div>
          <Link href="/login" className={buttonClass("inverse-outline", "sm")}>
            Вход
          </Link>
        </nav>

        <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 pt-12 pb-20 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-20 lg:pb-32">
          <div className="animate-[fade-up_250ms_var(--ease-precise)_both]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
              <span className="size-1.5 rounded-full bg-accent" /> Жилые и коммерческие здания
            </div>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.03] font-bold tracking-[-0.04em]">
              Инженерная ясность для&nbsp;каждого здания
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted md:text-lg">
              Tirek помогает ОСИ, управляющим компаниям и владельцам бизнес-центров, торговых центров и гостиниц понимать
              техническое состояние здания, документировать дефекты, планировать профилактику и принимать обоснованные
              решения — на основе проверенных инженерных данных.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#contact" className={buttonClass("inverse", "lg")}>
                Запросить техническое обследование <ArrowRight className="size-4" />
              </a>
              <a href="#platform" className={buttonClass("inverse-outline", "lg")}>
                Посмотреть платформу
              </a>
            </div>
            <dl className="mt-12 grid max-w-xl grid-cols-2 gap-6 border-t border-line pt-6 sm:grid-cols-4">
              {[
                ["R1–R4", "экспертная категория риска"],
                ["5 типов", "жилые и коммерческие здания"],
                ["v1 → v2", "история без перезаписи"],
                ["PDF", "версионированные отчёты"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-lg text-ink">{k}</dt>
                  <dd className="mt-1 text-xs leading-snug text-faint">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <HeroBuilding />
            <p className="mt-2 text-right font-mono text-[10px] tracking-wide text-faint uppercase">Схема · демонстрационные данные</p>
          </div>
        </div>

        {/* brand statement */}
        <div className="relative border-t border-line">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
            <p className="text-[22px] leading-snug font-medium tracking-[-0.015em] md:text-[28px]">
              «Мы не заменяем заказчика.
              <br className="hidden md:block" /> Мы становимся его <span className="text-accent">техническим партнёром</span>».
            </p>
            <p className="max-w-sm text-sm text-muted">
              Управленческие решения остаются за ОСИ, управляющей компанией или владельцем здания. Технические выводы
              подтверждают ответственные инженеры.
            </p>
          </div>
        </div>
      </header>

      <main>
        {/* B. PROBLEM */}
        <Section
          id="problem"
          index="01"
          kicker="Проблема"
          title="Реактивное обслуживание — это неопределённость"
          lead="Когда сведения о здании разбросаны по папкам, чатам и памяти специалистов, решения принимаются после аварии, а не до неё."
        >
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {PROBLEMS.map(([t, d], i) => (
              <li key={t} className="bg-surface p-6">
                <div className="font-mono text-xs text-faint">0{i + 1}</div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{t}</h3>
                <p className="mt-2 text-[15px] text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* C. HOW IT WORKS */}
        <Section id="how" index="02" kicker="Как работает Tirek" title="Один управляемый процесс вместо бумаг и таблиц" dark>
          <ol className="relative grid gap-x-8 gap-y-12 sm:grid-cols-2 md:grid-cols-3">
                        {STEPS.map(([n, t, d]) => (
              <li key={n} className="relative pr-4">
                <div className="flex items-center gap-3">
                  <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-md border border-line-strong bg-surface font-mono text-[10px] text-accent">{n}</span>
                  <span aria-hidden className="h-px flex-1 bg-line" />
                </div>
                <h3 className="mt-4 text-[17px] font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* C2. BUILDING TYPES */}
        <Section
          id="types"
          index="03"
          kicker="Типы зданий"
          title="Одна платформа — разные здания"
          lead="Тип здания задаёт поля паспорта, классификатор элементов и шаблоны чек-листов. Шаблоны жилых и коммерческих зданий не смешиваются."
        >
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {BUILDING_TYPES.map(({ icon: Icon, t, d }) => (
              <li key={t} className="bg-surface p-6">
                <Icon aria-hidden className="size-5 text-accent" strokeWidth={1.6} />
                <h3 className="mt-4 text-[15px] font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Перечни элементов и чек-листы для коммерческих зданий согласуются с ответственными инженерами до работы на объекте.
          </p>
        </Section>

        {/* D. BUILDING INTELLIGENCE */}
        <Section
          id="platform"
          index="04"
          kicker="Интеллект здания"
          title="Результаты обследования становятся структурированными данными"
          lead="Каждый дефект привязан к зданию, месту и элементу — подъезду, блоку, этажу или зоне. Схема строится из паспорта и честно показывает: это схема, а не цифровой двойник."
          dark
        >
          <PlatformPreview />
          <ul className="mt-8 grid gap-4 text-sm text-muted md:grid-cols-3">
            {["Серьёзность и статус — разные признаки: критический дефект может быть уже в работе", "Предварительные наблюдения визуально отличаются от утверждённых выводов", "Неизвестные характеристики показываются как «неизвестно», а не придумываются"].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" /> {t}
              </li>
            ))}
          </ul>
        </Section>

        {/* E. DEFECT MANAGEMENT */}
        <Section id="defects" index="05" kicker="Управление дефектами" title="Путь дефекта — от обнаружения до проверенного устранения" lead="На каждом шаге видно, кто отвечает, что сделано и на каком основании.">
          <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            {LIFECYCLE.map(([s, who, what], i) => (
              <li key={s} className="relative bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className={i === LIFECYCLE.length - 1 ? "size-2 rounded-full bg-healthy" : "size-2 rounded-full bg-accent"} />
                  <span className="font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="mt-3 text-[15px] font-semibold">{s}</div>
                <div className="mt-2 label-tech !normal-case !tracking-normal">{who}</div>
                <div className="text-[13px] text-muted">{what}</div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">Ответвления — «Требует уточнения» и «Отклонён как ошибочный» — тоже сохраняются в истории с обоснованием.</p>
        </Section>

        {/* F. PREVENTIVE MAINTENANCE */}
        <Section id="maintenance" index="06" kicker="Профилактика" title="План работ, который виден заранее" lead="Предварительный план складывается из подтверждённых дефектов и типового регламента — только для систем, которые есть в паспорте здания. Годовой график ППР с приоритетами, сроками и ответственными.">
          <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[220px_repeat(12,1fr)] border-b border-line pb-2">
                <span className="label-tech">Мероприятие</span>
                {MONTHS.map((m) => (
                  <span key={m} className="label-tech text-center">{m}</span>
                ))}
              </div>
              {PLAN.map((p) => (
                <div key={p.t} className="grid grid-cols-[220px_repeat(12,1fr)] items-center border-b border-line py-2.5 last:border-0">
                  <span className="truncate pr-3 text-sm">{p.t}</span>
                  {MONTHS.map((_, i) => (
                    <span key={i} className="flex h-5 items-center border-l border-line/60 first:border-0">
                      {i >= p.m[0] && i <= p.m[1] && <span className={`h-2 w-full ${p.tone} ${i === p.m[0] ? "rounded-l-full" : ""} ${i === p.m[1] ? "rounded-r-full" : ""}`} />}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-wide text-faint uppercase">Пример плана · демонстрационные данные</p>
          </div>
        </Section>

        {/* F2. REQUESTS */}
        <Section
          id="requests"
          index="07"
          kicker="Заявки"
          title="От сообщения жителя до проверенного результата"
          lead="Житель или пользователь здания сообщает о проблеме с телефона и видит каждый шаг. Выполнение подтверждается фото, а проверяет его не исполнитель."
        >
          <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {REQUEST_FLOW.map(([s, who, what], i) => (
              <li key={s} className="bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className={i === REQUEST_FLOW.length - 1 ? "size-2 rounded-full bg-healthy" : "size-2 rounded-full bg-accent"} />
                  <span className="font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="mt-3 text-[15px] font-semibold">{s}</div>
                <div className="mt-2 label-tech !normal-case !tracking-normal">{who}</div>
                <div className="text-[13px] text-muted">{what}</div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">
            При аварии заявитель видит номера экстренных служб: Tirek не заменяет аварийные службы. Из заявки инженер может завести дефект — дальше он проходит обычную проверку.
          </p>
        </Section>

        {/* G. PARTNERSHIP WITH THE CUSTOMER */}
        <Section id="customer" index="08" kicker="Партнёрство с заказчиком" title="Чёткое разделение ответственности" lead="Tirek усиливает ОСИ, управляющую компанию или владельца здания инженерной экспертизой, но не забирает их полномочия." dark>
          <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
            {[
              ["Инженерная организация · Tirek", ["Обследует здание по чек-листу своего типа", "Фиксирует дефекты с фото и местом", "Подтверждает категории риска с обоснованием", "Рекомендует мероприятия и сроки", "Проверяет результат работ"]],
              ["Заказчик · ОСИ, УК, владелец", ["Видит утверждённые сведения о своих зданиях", "Согласовывает, переносит или отклоняет работы", "Фиксирует причины решений", "Скачивает отчёты и документы", "Сохраняет все организационные полномочия"]],
            ].map(([title, items]) => (
              <div key={title as string} className="bg-surface p-7 md:p-8">
                <h3 className="label-tech !text-accent">{title as string}</h3>
                <ul className="mt-5 space-y-3">
                  {(items as string[]).map((t) => (
                    <li key={t} className="flex gap-3 text-[15px] text-muted">
                      <span aria-hidden className="mt-2.5 h-px w-3 shrink-0 bg-line-strong" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* H. TECHNICAL REPORTING */}
        <Section id="reports" index="09" kicker="Технические отчёты" title="Отчёт, который можно проверить" lead="PDF формируется только из утверждённого обследования. Каждая версия неизменна и хранится с контрольной суммой.">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-line bg-surface p-7 md:p-8">
              <div className="flex items-start justify-between border-b border-line-strong pb-4">
                <div>
                  <div className="label-tech">Tirek · эксплуатационный отчёт</div>
                  <div className="mt-1 text-lg font-semibold">Отчёт по обследованию INS-2026-0001</div>
                </div>
                <span className="font-mono text-xs text-muted">v2</span>
              </div>
              <div className="mt-4 space-y-2 text-[13px]">
                {[
                  ["1. Идентификация здания", "паспорт, «неизвестно» вместо догадок"],
                  ["2. Реквизиты и ограничения осмотра", "кто, когда, что не обследовалось"],
                  ["3. Результаты чек-листа", "по элементам здания"],
                  ["4. Дефекты и фото", "утверждено / предварительно"],
                  ["5. План мероприятий", "приоритеты и сроки"],
                  ["6. Проверяющий инженер", "подпись и дата утверждения"],
                ].map(([a, b]) => (
                  <div key={a} className="flex justify-between gap-4 border-b border-dashed border-line pb-2">
                    <span>{a}</span>
                    <span className="text-right text-muted">{b}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 font-mono text-[10px] tracking-wide text-faint uppercase">Образец структуры отчёта · SHA-256 и номер версии на каждой странице</div>
            </div>
            <ul className="space-y-5">
              {[
                ["Только утверждённые данные", "Неутверждённое обследование нельзя выпустить как окончательный отчёт."],
                ["Версии, а не перезапись", "Исправление — новая версия с причиной; прежняя остаётся доступной."],
                ["Честный статус документа", "Отчёт Tirek не является официальным экспертным заключением — это фиксируется в самом документе."],
              ].map(([t, d]) => (
                <li key={t} className="border-l-2 border-accent pl-4">
                  <h3 className="font-semibold">{t}</h3>
                  <p className="mt-1 text-[15px] text-muted">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* H2. SECURITY */}
        <Section id="security" index="10" kicker="Безопасность" title="Доверие к данным заложено в систему" lead="Инженерные сведения и данные жителей защищены на сервере, а не скрыты в интерфейсе." dark>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map(([t, d]) => (
              <li key={t} className="bg-surface p-6">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  <Check aria-hidden className="size-4 shrink-0 text-accent" /> {t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* I. FINAL CTA */}
        <section id="contact" className="relative overflow-hidden border-t border-line bg-base text-ink">
          <div className="relative mx-auto max-w-[1240px] px-5 py-24 md:px-8 md:py-28 lg:py-32">
            <div className="max-w-2xl">
              <div className="label-tech">
                <span className="text-accent">11</span> / Начать
              </div>
              <h2 className="mt-6 text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.08] font-bold tracking-[-0.035em]">Начните с технического обследования вашего здания</h2>
              <p className="mt-5 text-lg text-muted">Жилой дом, бизнес-центр, торговый центр или гостиница — обсудим состав осмотра, сроки и то, какие сведения о здании уже есть. Без обязательств.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href={CONTACT_HREF} className={buttonClass("inverse", "lg")}>
                  Запросить обследование <ArrowUpRight className="size-4" />
                </a>
                <Link href="/login" className={buttonClass("inverse-outline", "lg")}>
                  Вход для партнёров
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-base text-faint">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-8 text-xs md:flex-row md:items-center md:justify-between md:px-8">
          <Logo />
          <p className="max-w-xl">
            Tirek не заменяет инженерную экспертизу, работу ОСИ и управляющих компаний и фактическое обслуживание здания. Он связывает эти процессы в единую управляемую цифровую систему.
          </p>
        </div>
      </footer>
    </div>
  );
}
