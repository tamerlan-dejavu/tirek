from rest_framework.exceptions import ValidationError


def assert_transition(transitions: dict[str, set[str]], current: str, target: str) -> None:
    """Reject status changes that are not in the declared lifecycle."""
    if target not in transitions.get(current, set()):
        raise ValidationError(
            {"status": f"Переход «{current}» → «{target}» недопустим."}, code="invalid_transition"
        )
