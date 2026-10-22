from rest_framework import serializers

from apps.accounts.models import User
from apps.buildings.models import BuildingElement
from apps.core.fields import DisplayNameField

from .models import Poll, PollOption, ServiceRequest, ServiceRequestEvent


class ServiceRequestSerializer(serializers.ModelSerializer):
    building_address = serializers.CharField(source="building.address", read_only=True)
    author_name = DisplayNameField(source="author")
    assignee_name = DisplayNameField(source="assignee")
    defect_number = serializers.CharField(source="defect.number", read_only=True, default=None)
    category_label = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = ServiceRequest
        fields = [
            "id",
            "number",
            "building",
            "building_address",
            "author",
            "author_name",
            "category",
            "category_label",
            "entrance",
            "floor",
            "apartment",
            "place",
            "description",
            "contact_phone",
            "is_emergency",
            "emergency_confirmed_at",
            "status",
            "assignee",
            "assignee_name",
            "due_date",
            "resolution",
            "defect",
            "defect_number",
            "created_at",
            "updated_at",
        ]
        # Residents may only describe the problem; everything else is set by the dispatcher
        read_only_fields = [
            "id",
            "number",
            "author",
            "emergency_confirmed_at",
            "status",
            "assignee",
            "due_date",
            "resolution",
            "defect",
            "created_at",
            "updated_at",
        ]


class ServiceRequestEventSerializer(serializers.ModelSerializer):
    actor_name = DisplayNameField(source="actor")

    class Meta:
        model = ServiceRequestEvent
        fields = ["id", "from_status", "to_status", "actor_name", "comment", "created_at"]
        read_only_fields = fields


class AssignSerializer(serializers.Serializer):
    assignee = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True))
    due_date = serializers.DateField(required=False, allow_null=True)
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class TextSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, default="")


class CreateDefectSerializer(serializers.Serializer):
    element = serializers.PrimaryKeyRelatedField(queryset=BuildingElement.objects.all())
    defect_type = serializers.CharField(required=False, allow_blank=True, default="")


class PollOptionSerializer(serializers.ModelSerializer):
    votes = serializers.IntegerField(read_only=True, default=None)

    class Meta:
        model = PollOption
        fields = ["id", "text", "sort_order", "votes"]


class PollSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    my_vote = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    building_address = serializers.CharField(source="building.address", read_only=True)
    option_texts = serializers.ListField(
        child=serializers.CharField(max_length=255), write_only=True, min_length=2
    )

    class Meta:
        model = Poll
        fields = [
            "id",
            "building",
            "building_address",
            "question",
            "description",
            "closes_at",
            "is_published",
            "options",
            "option_texts",
            "my_vote",
            "total_votes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def _voted(self, poll) -> bool:
        return self.get_my_vote(poll) is not None

    def get_my_vote(self, poll):
        user = self.context["request"].user
        vote = poll.votes.filter(user=user).first()
        return vote.option_id if vote else None

    def get_total_votes(self, poll):
        return poll.votes.count()

    def get_options(self, poll):
        # Results are shown after voting (or to organizers) to avoid steering the answer
        user = self.context["request"].user
        show = self._voted(poll) or poll.created_by_id == user.pk or self.context.get("organizer")
        return [
            {"id": o.id, "text": o.text, "votes": o.votes.count() if show else None}
            for o in poll.options.all()
        ]

    def create(self, validated_data):
        texts = validated_data.pop("option_texts")
        poll = Poll.objects.create(**validated_data)
        for i, t in enumerate(texts):
            PollOption.objects.create(poll=poll, text=t, sort_order=i)
        return poll
