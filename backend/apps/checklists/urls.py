from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register(
    "checklist-templates", views.ChecklistTemplateViewSet, basename="checklist-template"
)
router.register(
    "checklist-versions", views.ChecklistTemplateVersionViewSet, basename="checklist-version"
)
router.register("checklist-items", views.ChecklistItemViewSet, basename="checklist-item")
urlpatterns = router.urls
