from rest_framework.routers import SimpleRouter

from .views import MaintenanceRuleViewSet, WorkOrderViewSet

router = SimpleRouter()
router.register("work-orders", WorkOrderViewSet, basename="work-order")
router.register("maintenance-rules", MaintenanceRuleViewSet, basename="maintenance-rule")
urlpatterns = router.urls
