from rest_framework import serializers

from apps.organizations.models import Organization, OrganizationMembership, OrganizationType, Role

from .models import (
    Building,
    BuildingDocument,
    BuildingElement,
    BuildingPassportEntry,
    ElementType,
)


class BuildingSerializer(serializers.ModelSerializer):
    completeness = serializers.IntegerField(read_only=True)
    # Required on create: the provider organization that will service the building
    provider_organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.filter(type=OrganizationType.PROVIDER, is_active=True),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Building
        fields = [
            "id",
            "internal_code",
            "name",
            "address",
            "city",
            "year_built",
            "floors",
            "entrances",
            "apartments",
            "total_area_m2",
            "structural_scheme",
            "management_organization",
            "main_photo",
            "cadastral_number",
            "field_sources",
            "completeness",
            "created_at",
            "updated_at",
            "provider_organization",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "completeness"]

    def validate_provider_organization(self, org):
        user = self.context["request"].user
        if not OrganizationMembership.objects.filter(
            user=user, organization=org, role=Role.PROVIDER_ADMIN, is_active=True
        ).exists():
            raise serializers.ValidationError("Вы не администратор этой организации.")
        return org

    def validate(self, attrs):
        if self.instance is None and "provider_organization" not in attrs:
            raise serializers.ValidationError(
                {"provider_organization": "Укажите обслуживающую организацию."}
            )
        return attrs


class BuildingHistorySerializer(serializers.Serializer):
    history_id = serializers.IntegerField()
    history_date = serializers.DateTimeField()
    history_type = serializers.CharField()
    history_user = serializers.CharField(allow_null=True)
    changes = serializers.DictField()


class ElementTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ElementType
        fields = ["code", "group", "name", "sort_order"]


class BuildingElementSerializer(serializers.ModelSerializer):
    path = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = BuildingElement
        fields = [
            "id",
            "building",
            "parent",
            "element_type",
            "name",
            "location",
            "description",
            "is_active",
            "path",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "path"]

    def validate(self, attrs):
        building = attrs.get("building") or getattr(self.instance, "building", None)
        parent = attrs.get("parent")
        if parent and parent.building_id != building.pk:
            raise serializers.ValidationError({"parent": "Родитель из другого здания."})
        node = parent
        while node is not None:
            if self.instance and node.pk == self.instance.pk:
                raise serializers.ValidationError({"parent": "Циклическая иерархия."})
            node = node.parent
        return attrs


class BuildingDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuildingDocument
        fields = [
            "id",
            "building",
            "file",
            "kind",
            "title",
            "document_date",
            "is_published",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PassportEntrySerializer(serializers.ModelSerializer):
    element_name = serializers.CharField(source="element_type.name", read_only=True)
    group = serializers.CharField(source="element_type.group", read_only=True)
    updated_by_name = serializers.SerializerMethodField()
    # How the entry relates to the rest of the record: elements on the schematic, open defects
    elements_count = serializers.SerializerMethodField()
    open_defects = serializers.SerializerMethodField()

    class Meta:
        model = BuildingPassportEntry
        fields = [
            "id",
            "building",
            "element_type",
            "element_name",
            "group",
            "presence",
            "quantity",
            "characteristics",
            "source",
            "updated_by_name",
            "updated_at",
            "elements_count",
            "open_defects",
        ]
        read_only_fields = ["id", "building", "element_type", "updated_at"]

    def get_updated_by_name(self, obj):
        return str(obj.updated_by) if obj.updated_by_id else None

    def get_elements_count(self, obj):
        return self.context.get("elements", {}).get(obj.element_type_id, 0)

    def get_open_defects(self, obj):
        return self.context.get("defects", {}).get(obj.element_type_id, 0)

    def validate(self, attrs):
        presence = attrs.get("presence", getattr(self.instance, "presence", None))
        if presence != "present" and attrs.get("quantity"):
            raise serializers.ValidationError(
                {"quantity": "Количество указывается, только если элемент есть."}
            )
        return attrs
