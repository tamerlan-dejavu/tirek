from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("buildings", views.BuildingViewSet, basename="building")
router.register("element-types", views.ElementTypeViewSet, basename="element-type")
router.register("building-elements", views.BuildingElementViewSet, basename="building-element")
router.register("building-documents", views.BuildingDocumentViewSet, basename="building-document")
router.register("passport-entries", views.PassportEntryViewSet, basename="passport-entry")
urlpatterns = router.urls
