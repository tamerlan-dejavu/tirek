from rest_framework.routers import SimpleRouter

from .views import DefectViewSet

router = SimpleRouter()
router.register("defects", DefectViewSet, basename="defect")
urlpatterns = router.urls
