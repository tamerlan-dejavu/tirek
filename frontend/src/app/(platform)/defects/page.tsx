import { DefectList } from "@/components/lists/DefectList";
import { Card, PageHeader } from "@/components/ui/Card";

export default function DefectsPage() {
  return (
    <>
      <PageHeader
        code="04 · Реестр дефектов"
        title="Дефекты"
        subtitle="Серьёзность (R1–R4) и статус процесса — независимые признаки. Предварительные оценки отмечены пунктиром."
      />
      <Card flush>
        <DefectList />
      </Card>
    </>
  );
}
