from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("inspections", views.InspectionViewSet, basename="inspection")
router.register("inspection-answers", views.InspectionAnswerViewSet, basename="inspection-answer")
urlpatterns = router.urls
