# AGENTS.md

Monorepo with two real projects; the repo root has no build (root `Makefile` / `README.md` are empty stubs, `apps/web` is empty).

- `backend/` — Java 21 Maven multi-module Spring Boot 4 admin platform (24 modules). All Java work happens here.
- `core/agent/` — Python FastAPI + LangChain/LangGraph agent service, uv-managed.

## backend

Commands (run from `backend/`):

- `./mvnw clean install` — full build + tests (Maven Wrapper 3.9.9; compiles `--release 21`, local JDK 23 is fine).
- `./mvnw -pl commons/hucoo-commons-util test` or `./mvnw -pl application/hucoo-application-admin test -Dtest=AdminApplicationTests` — focused tests.
- `./mvnw -pl application/hucoo-application-admin spring-boot:run` — admin app, port 8081.
- `./mvnw -pl middleware/hucoo-gateway-server spring-boot:run` — gateway, port 8080.
- Run `./mvnw install` first: with `-pl`, sibling modules resolve from `~/.m2`, not the reactor.
- `AdminApplicationTests` is the fastest end-to-end check (context + MockMvc unified `Result` + actuator + `/v3/api-docs`).

Non-obvious conventions and gotchas:

- Java packages, Maven groupId (`dev.hucoo`) and all artifactIds/module dirs are prefixed `hucoo-*` (`hucoo-agent-platform`, `hucoo-commons-api`, `hucoo-module-tenant`); config property prefix deliberately stays `agent-platform.*` (e.g. `agent-platform.persistence.enabled`). Nacos service names are `hucoo-application-admin` / `hucoo-gateway-server`; the database is `hucoo_agent_platform`.
- Dependency direction is enforced by convention: `application → modules → middleware → components → commons → dependencies`. `modules/*` must never depend on each other — expose a `*Facade` in the module's `api/` package instead.
- Adding a business module needs 3 edits outside the module dir: root `pom.xml` `<modules>` + dependencyManagement entry (root and `dependencies/hucoo-dependencies-bom`), and the package in `AdminApplication.scanBasePackages`.
- `components/*` activate only via `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` (they are not component-scanned). `AdminApplication` is the only `@MapperScan` owner — don't add another one in `hucoo-component-database`.
- Persistence is Mock by default: `agent-platform.persistence.enabled=false` → `Mock*ApplicationService` serves the REST API from memory; `true` → `*ApplicationServiceImpl` (MyBatis-Plus). dev/test use H2 in-memory; the `prod` profile uses MySQL + Flyway (`resources/db/migration`).
- MyBatis-Plus 3.5.17 with the Boot 4 starter (`mybatis-plus-spring-boot4-starter`). `IService`/`ServiceImpl` are in `com.baomidou.mybatisplus.spring.service[.impl]`, not `.extension.service`; pagination/tenant interceptors come from `mybatis-plus-jsqlparser`.
- Boot 4 moved test annotations: `@AutoConfigureMockMvc` is in `org.springframework.boot.webmvc.test.autoconfigure` (artifact `spring-boot-webmvc-test`, already provided by `hucoo-component-test`).
- Keep `hucoo-gateway-server` WebFlux-only: do not add `spring-boot-starter-web`, `hucoo-component-web`, or `hucoo-component-security` — servlet MVC on the classpath breaks Spring Cloud Gateway.
- Never add `bootstrap.yml`; Nacos config uses `spring.config.import: optional:nacos:...`. With no Nacos running you get `GrpcClient` / login ERROR log spam — expected, startup and tests still pass.
- Version pins are deliberate: Spring Cloud 2025.1.3 pairs with Boot 4.0.8, Spring Cloud Alibaba 2025.1.0.0 (Nacos client 3.1.1), springdoc 3.0.3 (3.1.x targets Boot 4.1). Verify BOM compatibility before bumping.
- Lombok + MapStruct processors are configured once in the root POM (`pluginManagement > maven-compiler-plugin > annotationProcessorPaths`); add new processors there, never per module. No JPA/Hibernate anywhere.
- `docker compose up -d` at repo root provides Nacos 3.1.1 (8848), MySQL 8.4, Redis 7.4. Swagger UI: `http://localhost:8081/swagger-ui.html`.
- Testcontainers 2.x naming: `testcontainers-mysql` / `testcontainers-junit-jupiter`, `MySQLContainer` is non-generic; `BaseIntegrationTest` requires Docker.

## core/agent

- Python `>=3.11` managed by uv: `cd core/agent && uv sync && uv run main.py`. (Floor is 3.11, not lower: LangGraph's v3 streaming needs `asyncio` task-context propagation, gated to 3.11+.)
- Run from `core/agent`: imports are top-level (`controller.api`, `domain.response`), no `src/` layout.
- `main.py` calls `load_dotenv()`; `.env` holds `SERVICE_PORT` / `WORKERS` for uvicorn (default port 2000). Routes mount under `/agent/v1`; responses use `domain/response.py::ServiceResponse` + `constants/error_code.py::ErrorCode`.
