.PHONY: .setup

COMPOSE_PROJECT_NAME ?= helperai
DOCKER_COMPOSE_CMD ?= docker compose
LOCAL_DETACHED ?= true

local: .setup
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) \
		$(DOCKER_COMPOSE_CMD) -f docker/docker-compose-local.yml up $(if $(filter true,$(LOCAL_DETACHED)),-d)

stop_local:
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) \
		$(DOCKER_COMPOSE_CMD) -f docker/docker-compose-local.yml down

.setup:
	mkdir -p docker/tmp/postgres
	mkdir -p docker/tmp/redis
