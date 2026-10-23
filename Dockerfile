# Backend production image built from the repository root, for hosts that expect ./Dockerfile
# (Render). Mirrors the "prod" stage of backend/Dockerfile, which docker-compose uses.
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
# WeasyPrint (PDF) needs Pango; libmagic detects the real file type on upload
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b fonts-dejavu libmagic1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/ .
RUN pip install .
RUN DJANGO_SETTINGS_MODULE=config.settings.prod DJANGO_SECRET_KEY=build \
    DATABASE_URL=sqlite:////tmp/build.db python manage.py collectstatic --noinput
RUN useradd --system --create-home --uid 1001 app && chown -R app /app
USER app
# Migrations, demo data (DEMO_MODE=true), gunicorn on $PORT
CMD ["sh", "bin/start.sh"]
