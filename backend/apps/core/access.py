"""
Single point of authorization (ТЗ 4.3, 8.2, 9.2).

A permission is never decided by role alone. Every check combines:
  user → active membership in an organization → role in that organization
       → active link between that organization and the building
       → (optionally) status of the record and the requested action.

Views must obtain querysets through `scope_to_buildings()` and call `require()`
before mutating anything. The frontend only mirrors these rules for UX.
"""

from __future__ import annotations

from django.db.models import Q, QuerySet
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.organizations.models import (
    BuildingAssignment,
    BuildingOrganizationLink,
    OrganizationMembership,
    OrganizationType,
    Role,
)

PROVIDER_ROLES = {Role.PROVIDER_ADMIN, Role.FIELD_SPECIALIST, Role.REVIEWING_ENGINEER}
CUSTOMER_ROLES = {Role.OSI_REPRESENTATIVE}


def _active_links(now=None) -> QuerySet[BuildingOrganizationLink]:
    now = now or timezone.now()
    return BuildingOrganizationLink.objects.filter(
        Q(valid_from__lte=now), Q(valid_to__isnull=True) | Q(valid_to__gt=now)
    )


def _active_memberships(user) -> QuerySet[OrganizationMembership]:
    return OrganizationMembership.objects.filter(
        user=user, is_active=True, organization__is_active=True
    )


def roles_for_building(user, building_id) -> set[str]:
    """Effective roles of `user` for one building, across all their organizations."""
    if not user.is_authenticated or not user.is_active:
        return set()
    linked_orgs = set(
        _active_links().filter(building_id=building_id).values_list("organization_id", flat=True)
    )
    roles: set[str] = set()
    for m in _active_memberships(user).select_related("organization"):
        if m.organization_id not in linked_orgs:
            continue
        allowed = (
            PROVIDER_ROLES if m.organization.type == OrganizationType.PROVIDER else CUSTOMER_ROLES
        )
        if m.role not in allowed:
            continue
        # Field specialists see only buildings they were assigned to (ТЗ 4.2)
        if (
            m.role == Role.FIELD_SPECIALIST
            and not BuildingAssignment.objects.filter(
                building_id=building_id, user=user, is_active=True
            ).exists()
        ):
            continue
        roles.add(m.role)
    return roles


def accessible_building_ids(user, roles: set[str] | None = None) -> QuerySet:
    """IDs of buildings the user may see, optionally restricted to some roles."""
    from apps.buildings.models import Building

    if not user.is_authenticated or not user.is_active:
        return Building.objects.none().values("id")

    memberships = _active_memberships(user)
    if roles is not None:
        memberships = memberships.filter(role__in=roles)

    provider_full = memberships.filter(
        organization__type=OrganizationType.PROVIDER,
        role__in=[Role.PROVIDER_ADMIN, Role.REVIEWING_ENGINEER],
    ).values("organization_id")
    provider_field = memberships.filter(
        organization__type=OrganizationType.PROVIDER, role=Role.FIELD_SPECIALIST
    ).values("organization_id")
    customer = memberships.filter(
        organization__type=OrganizationType.CUSTOMER, role=Role.OSI_REPRESENTATIVE
    ).values("organization_id")

    links = _active_links()
    assigned = BuildingAssignment.objects.filter(user=user, is_active=True).values("building_id")
    return (
        Building.objects.filter(
            Q(id__in=links.filter(organization_id__in=provider_full).values("building_id"))
            | Q(id__in=links.filter(organization_id__in=customer).values("building_id"))
            | (
                Q(id__in=links.filter(organization_id__in=provider_field).values("building_id"))
                & Q(id__in=assigned)
            )
        )
        .values("id")
        .distinct()
    )


def scope_to_buildings(qs: QuerySet, user, building_field: str = "building") -> QuerySet:
    """Filter any queryset to rows belonging to buildings the user can access."""
    return qs.filter(**{f"{building_field}__in": accessible_building_ids(user)})


def is_customer_only(user, building_id) -> bool:
    roles = roles_for_building(user, building_id)
    return bool(roles) and roles <= CUSTOMER_ROLES


def has_role(user, building_id, *roles: str) -> bool:
    return bool(roles_for_building(user, building_id) & set(roles))


def require(user, building_id, *roles: str, message: str | None = None) -> None:
    """Raise 403 unless the user holds one of `roles` for this building."""
    if not has_role(user, building_id, *roles):
        raise PermissionDenied(message or "Недостаточно прав для этого действия.")
