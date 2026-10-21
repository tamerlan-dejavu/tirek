from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone


@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def send_notification_email(self, notification_id: str):
    from .models import Notification

    n = Notification.objects.select_related("recipient").filter(pk=notification_id).first()
    if n is None or n.emailed_at:
        return
    try:
        send_mail(
            n.title,
            f"{n.body}\n\n{settings.FRONTEND_URL}{n.link}",
            None,
            [n.recipient.email],
        )
    except Exception as exc:
        raise self.retry(exc=exc) from exc
    Notification.objects.filter(pk=n.pk).update(emailed_at=timezone.now())
