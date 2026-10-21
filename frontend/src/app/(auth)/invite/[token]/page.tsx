import { SetPasswordForm } from "@/components/forms/SetPasswordForm";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SetPasswordForm token={token} endpoint="auth/invite/accept/" title="Добро пожаловать в Tirek" />;
}
