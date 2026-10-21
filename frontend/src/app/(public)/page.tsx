import Link from "next/link";

// Public landing — dark, atmospheric surface (ТЗ 11.3). Content is a placeholder until the design stage.
const FEATURES = [
  ["Цифровой паспорт", "Структурированная карточка дома с элементами и системами. Неизвестное — «неизвестно», а не выдуманное."],
  ["Обследования", "Стандартизированные чек-листы по элементам здания, с фото прямо с объекта."],
  ["Реестр дефектов", "История каждого дефекта: повторные наблюдения, проверки, устранение."],
  ["Экспертная оценка риска", "Категории R1–R4 присваивает ответственный инженер с обоснованием."],
  ["План мероприятий", "Инженер рекомендует, ОСИ согласовывает, исполнитель отмечает, инженер проверяет."],
  ["Прозрачность для ОСИ", "Только утверждённые сведения, PDF-отчёты с фиксированной версией."],
];

export default function LandingPage() {
  return (
    <div className="surface-dark min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-mono text-sm uppercase tracking-[0.3em]">Tirek</span>
        <Link href="/login" className="rounded-sm border border-white/20 px-4 py-2 text-sm hover:border-white/50">
          Вход в платформу
        </Link>
      </header>

      <section className="blueprint-grid relative">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-36">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-blueprint">
            Architectural Intelligence
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Техническое состояние дома — в одной системе
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Цифровая инфраструктура технического партнёрства инженерной организации и ОСИ:
            обследования, дефекты, риски и мероприятия вместо бумаг, таблиц и переписок.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-px bg-white/10 px-6 py-px md:grid-cols-3">
        {FEATURES.map(([title, text]) => (
          <div key={title} className="bg-night p-6">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-2 text-sm text-white/60">{text}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-12 text-xs text-white/40">
        Tirek не заменяет инженерную экспертизу, работу ОСИ и фактическое обслуживание здания.
        Он связывает эти процессы в единую управляемую цифровую систему.
      </footer>
    </div>
  );
}
