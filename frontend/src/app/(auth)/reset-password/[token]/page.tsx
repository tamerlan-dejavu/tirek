import { SetPasswordForm } from "@/components/forms/SetPasswordForm";

export default async function ResetConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SetPasswordForm token={token} endpoint="auth/password-reset/confirm/" title="Новый пароль" />;
}
