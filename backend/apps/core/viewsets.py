from rest_framework import mixins, viewsets
from rest_framework.exceptions import NotFound

from . import access


class BuildingScopedViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Base viewset for every building-bound resource.

    - Querysets are always scoped by `access.scope_to_buildings` (no cross-org leakage).
    - No DELETE by default: history is preserved, not removed (ТЗ 2.3, 7.2).
    - Subclasses declare which roles may create / update.
    """

    building_field = "building"
    create_roles: tuple[str, ...] = ()
    update_roles: tuple[str, ...] = ()
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        return access.scope_to_buildings(
            super().get_queryset(), self.request.user, self.building_field
        )

    def building_id_for_create(self, serializer) -> object:
        building = serializer.validated_data.get("building")
        if building is None:
            raise NotFound("Здание не найдено.")
        return building.pk

    def building_id_for_instance(self, instance) -> object:
        obj = instance
        for part in self.building_field.split("__"):
            obj = getattr(obj, part)
        return obj.pk

    def perform_create(self, serializer):
        access.require(
            self.request.user, self.building_id_for_create(serializer), *self.create_roles
        )
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        access.require(
            self.request.user,
            self.building_id_for_instance(serializer.instance),
            *self.update_roles,
        )
        serializer.save()
