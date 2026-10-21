.PHONY: up down build logs migrate makemigrations superuser seed test test-back test-front e2e lint fmt schema

up:
	test -f .env || cp .env.example .env
	docker compose up -d --build

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f backend worker frontend

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

superuser:
	docker compose exec backend python manage.py createsuperuser

seed:
	docker compose exec backend python manage.py seed_demo

test: test-back test-front

test-back:
	docker compose exec backend pytest

test-front:
	cd frontend && npm test

e2e:
	cd frontend && npx playwright test

lint:
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint && npm run typecheck

fmt:
	cd backend && ruff check --fix . && ruff format .
	cd frontend && npm run format

# Export OpenAPI schema and regenerate typed API client for the frontend
schema:
	docker compose exec backend python manage.py spectacular --file /app/openapi.yaml
	cd frontend && npm run api:generate
