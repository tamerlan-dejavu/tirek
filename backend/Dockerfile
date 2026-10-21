FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
# WeasyPrint (PDF) needs Pango; libmagic detects the real file type on upload
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b fonts-dejavu libmagic1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml ./

FROM base AS dev
COPY . .
RUN pip install -e ".[dev]"

FROM base AS prod
COPY . .
RUN pip install .
RUN DJANGO_SETTINGS_MODULE=config.settings.prod DJANGO_SECRET_KEY=build \
    DATABASE_URL=sqlite:////tmp/build.db python manage.py collectstatic --noinput
RUN useradd --system --uid 1001 app && chown -R app /app
USER app
