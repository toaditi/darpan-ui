# darpan-ui

Command-first frontend facade for the Darpan browser pilot.

## Purpose

- Host migrated module screens in `darpan-ui` while backend screens remain in parallel during cutover.
- Consume authenticated facade contracts from `darpan-backend` (`service/facade/**`).
- Keep custom UI/PWA behavior out of backend `screen/**`, `template/**`, and `theme-library/**`.

## Ownership boundary

- `darpan-ui`: all custom UI, PWA shell, and browser interaction flows.
- `darpan-backend`: Moqui backend contracts, business logic, and reconciliation processing only.

## Tech Stack

- Vue 3
- TypeScript (strict)
- Vite
- ESLint (flat config)
- Vitest

## Configuration

Set environment variables in `.env` or CI environment:

```bash
# Optional in local dev. If omitted, darpan-ui uses same-origin /rpc/json with Vite proxy.
# VITE_DARPAN_API_BASE_URL=http://localhost:8080
# VITE_DARPAN_RPC_URL=http://localhost:8080/rpc/json
# Optional customer-safe Linear access pages exposed from /roadmap/reconciliation.
# VITE_DARPAN_LINEAR_ROADMAP_URL=https://linear.app/your-public-roadmap
# VITE_DARPAN_LINEAR_REQUEST_URL=https://linear.app/your-request-form
# Optional. Set false when the Linear target should open only in a new tab.
# VITE_DARPAN_LINEAR_EMBED_ENABLED=true
VITE_DARPAN_UI_MODE=pilot
VITE_DARPAN_AUTH_BYPASS=false
```

## GitHub Pages Deployment

The current public Pages URL is:

- `https://toaditi.github.io/darpan-ui/`

For release-week auth and cookie validation, the Pages build must be pointed at a real backend target through GitHub Actions repository or environment variables:

```bash
VITE_DARPAN_API_BASE_URL=https://your-pilot-host.example.com
# or, when the RPC route is different from the API origin:
VITE_DARPAN_RPC_URL=https://your-pilot-host.example.com/rpc/json
```

Notes:

- `VITE_DARPAN_RPC_URL` wins when both are set.
- If neither backend variable is set, the deployed Pages app falls back to same-origin `/rpc/json`.
- On GitHub Pages, that fallback is not a valid pilot backend target by itself, so the Pages URL alone is not enough for Friday release-week auth or cookie validation.
- Prefer the final pilot smoke to run against the same-site or reverse-proxied host that will actually serve invite-only users.

For local UI-only prototyping without backend login, set:

```bash
VITE_DARPAN_AUTH_BYPASS=true
```

## Commands

```bash
npm install
npm run dev
npm run dev:stack
npm run check
npm run build
npm run preview
```

Default local URL: `http://localhost:5173`.

Use `npm run dev:stack` when working against the local backend and frontend together. The helper starts Vite plus `../darpan-backend/gradlew run` and stops both when you exit.

Before starting, the helper clears any existing listeners on the expected backend and frontend ports so the new session can come up on the intended ports instead of falling back to alternates.

If the backend checkout lives somewhere else, override the path before running the command:

```bash
DARPAN_BACKEND_DIR=/absolute/path/to/darpan-backend npm run dev:stack
```

If the backend needs a different startup command, Gradle task, or port defaults, override them with one of:

```bash
DARPAN_BACKEND_TASK=runProduction npm run dev:stack
DARPAN_BACKEND_COMMAND="./gradlew --no-daemon runProduction" npm run dev:stack
DARPAN_BACKEND_PORT=8081 DARPAN_FRONTEND_PORT=5174 npm run dev:stack
```

## Wave 1 Routes

- `/login` (initial screen)
- `/` (module hub)
- `/connections/llm`
- `/connections/sftp`
- `/connections/netsuite/auth`
- `/connections/netsuite/endpoints`
- `/schemas/library`
- `/schemas/infer`
- `/schemas/editor/:jsonSchemaId`
- `/roadmap/reconciliation` (customer roadmap and request access, backed by configurable Linear URLs)

## Legacy Redirect Support

- During phased cutover, pass `?legacy=1` when opening migrated routes from backend links to display migration banner context.
- Keep backend and darpan-ui routes in parallel until parity sign-off, then retire legacy backend screens in the following release.

## Notes

- API contracts remain owned by `darpan-backend/runtime/component/darpan/service/facade/**`.
