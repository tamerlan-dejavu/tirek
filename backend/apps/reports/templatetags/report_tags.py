from django import template

register = template.Library()


@register.filter
def get(mapping, key):
    return mapping.get(key, "") if mapping else ""


@register.filter
def unknown(value):
    """Render missing passport values as «неизвестно» instead of inventing them (ТЗ 5.3)."""
    return "неизвестно" if value in (None, "") else value
