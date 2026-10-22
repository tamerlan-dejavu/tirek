from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("service-requests", views.ServiceRequestViewSet, basename="service-request")
router.register("polls", views.PollViewSet, basename="poll")

urlpatterns = [
    path("resident/overview/", views.resident_overview, name="resident-overview"),
    *router.urls,
]
