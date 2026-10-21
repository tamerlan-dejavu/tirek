from rest_framework.routers import SimpleRouter

from .views import StoredFileViewSet

router = SimpleRouter()
router.register("files", StoredFileViewSet, basename="file")
urlpatterns = router.urls
