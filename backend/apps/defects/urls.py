from rest_framework.routers import SimpleRouter

from .views import DefectCategoryViewSet, DefectViewSet

router = SimpleRouter()
router.register("defects", DefectViewSet, basename="defect")
router.register("defect-categories", DefectCategoryViewSet, basename="defect-category")
urlpatterns = router.urls
