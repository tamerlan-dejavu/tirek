from django.urls import path

from . import views

urlpatterns = [
    path("buildings/", views.my_buildings, name="portal-buildings"),
    path("buildings/<uuid:pk>/", views.building_overview, name="portal-building"),
]
