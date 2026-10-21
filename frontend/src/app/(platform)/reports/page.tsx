import { ReportList } from "@/components/lists/ReportList";
import { PageHeader } from "@/components/ui/Card";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Отчёты"
        subtitle="Версионированные PDF из утверждённых данных. Не являются официальным экспертным заключением."
      />
      <ReportList />
    </>
  );
}
