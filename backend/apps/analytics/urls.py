from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.dashboard, name="analytics-dashboard"),
    path("breakdown/", views.breakdown, name="analytics-breakdown"),
    path("activity/", views.activity, name="analytics-activity"),
]
