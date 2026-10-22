from django.db.models import IntegerField, Max
from django.db.models.functions import Cast, Substr
from django.utils import timezone


def next_number(model, code: str, field: str = "number") -> str:
    """
    Next human-readable number like «WO-2026-0007»: the largest existing suffix of the year + 1.
    Counting rows instead would collide when numbers have gaps (imported or seeded records).
    The unique constraint on the field remains the final guard against races.
    """
    prefix = f"{code}-{timezone.now().year}-"
    last = (
        model.objects.filter(**{f"{field}__startswith": prefix})
        .annotate(seq=Cast(Substr(field, len(prefix) + 1), IntegerField()))
        .aggregate(m=Max("seq"))["m"]
    )
    return f"{prefix}{(last or 0) + 1:04d}"
