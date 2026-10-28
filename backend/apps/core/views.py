from django.conf import settings
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
def features(request):
    """Optional features switched on for this installation (UI shows only what is enabled)."""
    return Response(
        {"risk_scoring": settings.FEATURE_RISK_SCORING, "polls": settings.FEATURE_POLLS}
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    return Response({"status": "ok"})
