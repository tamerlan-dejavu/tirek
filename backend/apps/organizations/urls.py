from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("organizations", views.OrganizationViewSet, basename="organization")
router.register("memberships", views.MembershipViewSet, basename="membership")
router.register("building-links", views.BuildingLinkViewSet, basename="building-link")
router.register(
    "building-assignments", views.BuildingAssignmentViewSet, basename="building-assignment"
)
urlpatterns = router.urls
