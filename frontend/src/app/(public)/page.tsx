import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { HeroBuilding } from "@/components/landing/HeroBuilding";
import { PlatformPreview } from "@/components/landing/PlatformPreview";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Tirek — инженерная ясность для каждого дома" };

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
    <section id={id} aria-labelledby={`${id}-title`} className={dark ? "bg-navy text-white" : "bg-canvas text-ink"}>
      <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <div className={dark ? "font-mono text-xs tracking-[0.14em] text-white/45 uppercase" : "label-tech"}>
            <span className={dark ? "text-teal" : "text-teal-strong"}>{index}</span> / {kicker}
          </div>
          <div>
            <h2 id={`${id}-title`} className="max-w-3xl text-[30px] leading-[1.1] font-semibold tracking-[-0.025em] md:text-[42px]">
              {title}
            </h2>
            {lead && <p className={dark ? "mt-5 max-w-2xl text-lg text-white/65" : "mt-5 max-w-2xl text-lg text-muted"}>{lead}</p>}
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
  ["Нет общей картины", "ОСИ не видит, какие проблемы критичны, а какие могут подождать."],
];

const STEPS = [
  ["01", "Обследовать", "Структурированный чек-лист по элементам здания прямо на объекте."],
  ["02", "Зафиксировать", "Дефект с фото, местом и элементом — из пункта чек-листа."],
  ["03", "Оценить", "Инженер присваивает категорию риска R1–R4 с обоснованием."],
  ["04", "Приоритизировать", "Критическое — первым; срочные случаи — немедленное уведомление."],
  ["05", "Спланировать", "Мероприятия с ответственными и сроками; ОСИ согласовывает."],
  ["06", "Контролировать", "Выполнение подтверждается, инженер проверяет результат."],
];

const LIFECYCLE = [
  ["Обнаружен", "Полевой специалист", "фиксирует на объекте"],
  ["На проверке", "Проверяющий инженер", "изучает данные и фото"],
  ["Подтверждён", "Инженер", "утверждает категорию риска"],
  ["Запланирован", "ОСИ", "согласует мероприятие"],
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
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/* ── page ─────────────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="bg-navy">
      {/* A. HERO */}
      <header className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden className="grid-blueprint absolute inset-0 opacity-70" />
        <div aria-hidden className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_70%_40%,rgb(32_166_166/0.10),transparent_60%)]" />

        <nav className="relative mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 md:px-8" aria-label="Сайт">
          <Logo />
          <div className="hidden items-center gap-7 text-sm text-white/65 md:flex">
            <a href="#how" className="hover:text-white">Как это работает</a>
            <a href="#platform" className="hover:text-white">Платформа</a>
            <a href="#osi" className="hover:text-white">Для ОСИ</a>
            <a href="#reports" className="hover:text-white">Отчёты</a>
          </div>
          <Link href="/login" className={buttonClass("inverse-outline", "sm")}>
            Вход
          </Link>
        </nav>

        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-5 pt-10 pb-20 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-16 lg:pb-28">
          <div className="animate-[fade-up_700ms_var(--ease-precise)_both]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 font-mono text-[11px] tracking-[0.12em] text-white/60 uppercase">
              <span className="size-1.5 rounded-full bg-teal" /> Инженерное сопровождение МКД
            </div>
            <h1 className="text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] md:text-[64px]">
              Инженерная ясность для&nbsp;каждого дома
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              Tirek помогает объединениям собственников понимать техническое состояние дома, документировать дефекты,
              планировать профилактику и принимать обоснованные решения — на основе проверенных инженерных данных.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#contact" className={buttonClass("inverse", "lg")}>
                Запросить техническое обследование <ArrowRight className="size-4" />
              </a>
              <a href="#platform" className={buttonClass("inverse-outline", "lg")}>
                Посмотреть платформу
              </a>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[
                ["R1–R4", "экспертная категория риска"],
                ["v1 → v2", "история без перезаписи"],
                ["PDF", "версионированные отчёты"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-lg text-white">{k}</dt>
                  <dd className="mt-1 text-xs leading-snug text-white/50">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <HeroBuilding />
            <p className="mt-2 text-right font-mono text-[10px] tracking-wide text-white/35 uppercase">Схема · демонстрационные данные</p>
          </div>
        </div>

        {/* brand statement */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
            <p className="text-[22px] leading-snug font-medium tracking-[-0.015em] md:text-[28px]">
              «Мы не заменяем ОСИ.
              <br className="hidden md:block" /> Мы становимся его <span className="text-teal">техническим партнёром</span>».
            </p>
            <p className="max-w-sm text-sm text-white/55">
              Управленческие решения остаются за ОСИ. Технические выводы подтверждают ответственные инженеры.
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
          lead="Когда сведения о доме разбросаны по папкам, чатам и памяти специалистов, решения принимаются после аварии, а не до неё."
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
                  <span className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full border border-teal bg-navy font-mono text-[10px] text-teal">{n}</span>
                  <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-teal/50 to-transparent" />
                </div>
                <h3 className="mt-4 text-[17px] font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{d}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* D. BUILDING INTELLIGENCE */}
        <Section
          id="platform"
          index="03"
          kicker="Интеллект здания"
          title="Результаты обследования становятся структурированными данными"
          lead="Каждый дефект привязан к дому, подъезду и элементу. Схема строится из паспорта здания и честно показывает: это схема, а не цифровой двойник."
          dark
        >
          <PlatformPreview />
          <ul className="mt-8 grid gap-4 text-sm text-white/70 md:grid-cols-3">
            {["Серьёзность и статус — разные признаки: критический дефект может быть уже в работе", "Предварительные наблюдения визуально отличаются от утверждённых выводов", "Неизвестные характеристики показываются как «неизвестно», а не придумываются"].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" /> {t}
              </li>
            ))}
          </ul>
        </Section>

        {/* E. DEFECT MANAGEMENT */}
        <Section id="defects" index="04" kicker="Управление дефектами" title="Путь дефекта — от обнаружения до проверенного устранения" lead="На каждом шаге видно, кто отвечает, что сделано и на каком основании.">
          <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            {LIFECYCLE.map(([s, who, what], i) => (
              <li key={s} className="relative bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className={i === LIFECYCLE.length - 1 ? "size-2 rounded-full bg-healthy" : "size-2 rounded-full bg-teal"} />
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
        <Section id="maintenance" index="05" kicker="Профилактика" title="План работ, который виден заранее" lead="Мероприятия создаются из подтверждённых дефектов и регламентных осмотров — с приоритетом, сроком и ответственным.">
          <div className="registration overflow-x-auto rounded-lg border border-line bg-surface p-5">
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

        {/* G. PARTNERSHIP WITH OSI */}
        <Section id="osi" index="06" kicker="Партнёрство с ОСИ" title="Чёткое разделение ответственности" lead="Tirek усиливает ОСИ инженерной экспертизой, но не забирает его полномочия." dark>
          <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-2">
            {[
              ["Инженерная организация · Tirek", ["Обследует дом по стандартному чек-листу", "Фиксирует дефекты с фото и местом", "Подтверждает категории риска с обоснованием", "Рекомендует мероприятия и сроки", "Проверяет результат работ"]],
              ["ОСИ", ["Видит утверждённые сведения о своём доме", "Согласовывает, переносит или отклоняет работы", "Фиксирует причины решений", "Скачивает отчёты и документы", "Сохраняет все организационные полномочия"]],
            ].map(([title, items]) => (
              <div key={title as string} className="bg-navy p-7">
                <h3 className="font-mono text-xs tracking-[0.14em] text-teal uppercase">{title as string}</h3>
                <ul className="mt-5 space-y-3">
                  {(items as string[]).map((t) => (
                    <li key={t} className="flex gap-3 text-[15px] text-white/80">
                      <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-white/40" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* H. TECHNICAL REPORTING */}
        <Section id="reports" index="07" kicker="Технические отчёты" title="Отчёт, который можно проверить" lead="PDF формируется только из утверждённого обследования. Каждая версия неизменна и хранится с контрольной суммой.">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="registration rotate-[-0.6deg] rounded-sm border border-line bg-surface p-7 shadow-[0_30px_60px_-30px_rgb(16_29_44/0.35)]">
              <div className="flex items-start justify-between border-b-2 border-ink pb-3">
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
                <li key={t} className="border-l-2 border-teal pl-4">
                  <h3 className="font-semibold">{t}</h3>
                  <p className="mt-1 text-[15px] text-muted">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* I. FINAL CTA */}
        <section id="contact" className="relative overflow-hidden bg-navy text-white">
          <div aria-hidden className="grid-blueprint absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-[1200px] px-5 py-24 md:px-8">
            <div className="max-w-2xl">
              <div className="font-mono text-xs tracking-[0.14em] text-white/45 uppercase">
                <span className="text-teal">08</span> / Начать
              </div>
              <h2 className="mt-6 text-[34px] leading-[1.08] font-semibold tracking-[-0.025em] md:text-[48px]">Начните с технического обследования вашего дома</h2>
              <p className="mt-5 text-lg text-white/65">Обсудим состав осмотра, сроки и то, какие сведения о доме уже есть. Без обязательств.</p>
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

      <footer className="border-t border-white/10 bg-navy text-white/45">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-8 text-xs md:flex-row md:items-center md:justify-between md:px-8">
          <Logo />
          <p className="max-w-xl">
            Tirek не заменяет инженерную экспертизу, работу ОСИ и фактическое обслуживание здания. Он связывает эти процессы в единую управляемую цифровую систему.
          </p>
        </div>
      </footer>
    </div>
  );
}
