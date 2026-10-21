from rest_framework.routers import SimpleRouter

from .views import RiskAssessmentViewSet

router = SimpleRouter()
router.register("risk-assessments", RiskAssessmentViewSet, basename="risk-assessment")
urlpatterns = router.urls
