import django_filters

from .models import OPEN_STATUSES, Defect, DefectPriority, DefectStatus, RiskCategory


class DefectFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=DefectStatus.choices)
    risk = django_filters.MultipleChoiceFilter(
        field_name="current_risk__category", choices=RiskCategory.choices
    )
    priority = django_filters.MultipleChoiceFilter(choices=DefectPriority.choices)
    category = django_filters.CharFilter(field_name="category_id")
    is_open = django_filters.BooleanFilter(method="filter_open")
    detected_from = django_filters.DateFilter(field_name="detected_on", lookup_expr="gte")
    detected_to = django_filters.DateFilter(field_name="detected_on", lookup_expr="lte")

    class Meta:
        model = Defect
        fields = ["building", "element", "inspection", "preliminary_severity"]

    def filter_open(self, qs, name, value):
        return (
            qs.filter(status__in=OPEN_STATUSES) if value else qs.exclude(status__in=OPEN_STATUSES)
        )
