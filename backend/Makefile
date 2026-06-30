.PHONY: dev down

dev:
	docker compose up -d
	@echo "Waiting for services to be healthy..."
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' cofi_postgres)" = "healthy" ] && \
	       [ "$$(docker inspect -f '{{.State.Health.Status}}' cofi_redis)" = "healthy" ]; do \
	  sleep 1; \
	done
	@echo "Services ready. Starting air..."
	air

down:
	pkill -x air || true
	docker compose down
