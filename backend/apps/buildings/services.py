from .models import Building, BuildingPassportEntry, ElementGroup, ElementType

# Groups that make up the digital passport; «location» (подъезд, секция) is not a passport line
PASSPORT_GROUPS = [ElementGroup.STRUCTURAL, ElementGroup.ENGINEERING, ElementGroup.OPERATIONAL]


def ensure_passport(building: Building) -> int:
    """
    Create a passport entry (presence «неизвестно») for every classifier type of the building's
    type that has none yet. Entries of other types are kept (history) but not shown or counted.
    """
    existing = set(building.passport_entries.values_list("element_type_id", flat=True))
    missing = [
        t
        for t in ElementType.objects.filter(group__in=PASSPORT_GROUPS, is_active=True)
        if t.code not in existing and t.applies_to(building.building_type)
    ]
    BuildingPassportEntry.objects.bulk_create(
        [BuildingPassportEntry(building=building, element_type=t) for t in missing]
    )
    return len(missing)
