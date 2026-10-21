import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def exception_handler(exc, context):
    """Uniform error shape; unexpected errors never leak internal details (ТЗ 9.3)."""
    response = drf_exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error", exc_info=exc)
        return Response(
            {"error": {"code": "server_error", "message": "Внутренняя ошибка сервера."}},
            status=500,
        )
    code = getattr(exc, "default_code", "error")
    response.data = {"error": {"code": code, "detail": response.data}}
    return response
