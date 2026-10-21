import { DefectList } from "@/components/lists/DefectList";
import { PageHeader } from "@/components/ui/Card";

export default function DefectsPage() {
  return (
    <>
      <PageHeader title="Реестр дефектов" subtitle="Поиск по номеру, адресу и тексту; фильтры по риску и состоянию" />
      <DefectList />
    </>
  );
}
