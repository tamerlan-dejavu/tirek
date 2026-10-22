from rest_framework import serializers


class DisplayNameField(serializers.Field):
    """
    Read-only human name of a related object (str(obj)), `null` when the relation is empty.
    Replaces `CharField(source="x.__str__")`, which renders a bound method repr when x is None.
    """

    def __init__(self, **kwargs):
        kwargs["read_only"] = True
        super().__init__(**kwargs)

    def to_representation(self, value):
        return str(value)
