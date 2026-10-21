import { ReportList } from "@/components/lists/ReportList";
import { Card, PageHeader } from "@/components/ui/Card";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        code="07 · Технические отчёты"
        title="Отчёты"
        subtitle="Версионированные PDF из утверждённых данных. Каждая версия неизменна и имеет контрольную сумму."
      />
      <Card flush>
        <ReportList />
      </Card>
      <p className="mt-4 max-w-3xl text-xs text-muted">
        Отчёт Tirek — эксплуатационный документ по результатам визуального обследования. Он не является официальным
        экспертным заключением; юридический статус определяется отдельно.
      </p>
    </>
  );
}
