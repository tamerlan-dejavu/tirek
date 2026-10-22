from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_v1 = [
    path("", include("apps.core.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.organizations.urls")),
    path("", include("apps.buildings.urls")),
    path("", include("apps.checklists.urls")),
    path("", include("apps.inspections.urls")),
    path("", include("apps.defects.urls")),
    path("", include("apps.risks.urls")),
    path("", include("apps.workorders.urls")),
    path("", include("apps.files.urls")),
    path("portal/", include("apps.portal.urls")),
    path("", include("apps.reports.urls")),
    path("", include("apps.audit.urls")),
    path("analytics/", include("apps.analytics.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.service_requests.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger"),
]
