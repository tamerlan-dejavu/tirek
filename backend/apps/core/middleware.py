from django.db import IntegrityError, transaction
from django.http import HttpResponse

from .models import IdempotencyKey

UNSAFE_METHODS = {"POST", "PATCH", "PUT"}
HEADER = "HTTP_IDEMPOTENCY_KEY"


class IdempotencyMiddleware:
    """
    Replays the stored response when a client retries a mutating request with the same
    `Idempotency-Key` header (ТЗ 7.2, 10: no data loss or duplicates on retry).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        key = request.META.get(HEADER)
        user = getattr(request, "user", None)
        if not key or request.method not in UNSAFE_METHODS or not (user and user.is_authenticated):
            return self.get_response(request)

        stored = IdempotencyKey.objects.filter(user=user, key=key).first()
        if stored:
            return HttpResponse(
                bytes(stored.response_body),
                status=stored.status_code,
                content_type=stored.content_type,
            )

        response = self.get_response(request)
        if 200 <= response.status_code < 300 and not response.streaming:
            try:
                with transaction.atomic():
                    IdempotencyKey.objects.create(
                        user=user,
                        key=key[:128],
                        method=request.method,
                        path=request.path[:512],
                        status_code=response.status_code,
                        response_body=response.content,
                        content_type=response.get("Content-Type", "application/json"),
                    )
            except IntegrityError:
                pass
        return response
