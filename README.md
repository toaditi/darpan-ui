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
VITE_DARPAN_UI_MODE=pilot
VITE_DARPAN_AUTH_BYPASS=false
```

For local UI-only prototyping without backend login, set:

```bash
VITE_DARPAN_AUTH_BYPASS=true
```

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

Default local URL: `http://localhost:5173`.

## Wave 1 Routes

- `/login` (initial screen)
- `/` (module hub)
- `/connections/llm`
- `/connections/sftp`
- `/connections/netsuite/auth`
- `/connections/netsuite/endpoints`
- `/connections/read-db`
- `/schemas/library`
- `/schemas/infer`
- `/schemas/editor/:jsonSchemaId`
- `/roadmap/reconciliation` (roadmap card for upcoming module rollout)

## Legacy Redirect Support

- During phased cutover, pass `?legacy=1` when opening migrated routes from backend links to display migration banner context.
- Keep backend and darpan-ui routes in parallel until parity sign-off, then retire legacy backend screens in the following release.

## Notes

- API contracts remain owned by `darpan-backend/runtime/component/darpan/service/facade/**`.
