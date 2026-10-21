import { InspectionList } from "@/components/lists/InspectionList";
import { PageHeader } from "@/components/ui/Card";

export default function InspectionsPage() {
  return (
    <>
      <PageHeader title="Обследования" />
      <InspectionList />
    </>
  );
}
