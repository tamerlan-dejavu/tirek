from rest_framework.routers import SimpleRouter

from .views import WorkOrderViewSet

router = SimpleRouter()
router.register("work-orders", WorkOrderViewSet, basename="work-order")
urlpatterns = router.urls
