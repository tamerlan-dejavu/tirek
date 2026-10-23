#!/bin/sh
# Production entrypoint for hosts without docker-compose (Render): migrate, demo data, serve.
set -e
python manage.py migrate --noinput
if [ "$DEMO_MODE" = "true" ]; then
    # Idempotent: adds only what is missing
    python manage.py seed_demo
fi
# WEB_CONCURRENCY sets the number of gunicorn workers; PORT is provided by the host
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --timeout 120
