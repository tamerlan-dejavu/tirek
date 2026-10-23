from .models import Building, BuildingPassportEntry, ElementGroup, ElementType

# Groups that make up the digital passport; «location» (подъезд, секция) is not a passport line
PASSPORT_GROUPS = [ElementGroup.STRUCTURAL, ElementGroup.ENGINEERING, ElementGroup.OPERATIONAL]


def ensure_passport(building: Building) -> int:
    """Create a passport entry (presence «неизвестно») for every classifier type missing one."""
    existing = set(building.passport_entries.values_list("element_type_id", flat=True))
    missing = ElementType.objects.filter(group__in=PASSPORT_GROUPS, is_active=True).exclude(
        code__in=existing
    )
    BuildingPassportEntry.objects.bulk_create(
        [BuildingPassportEntry(building=building, element_type=t) for t in missing]
    )
    return len(missing)
