# darpan-ui

Frontend repo for the Darpan browser pilot.

## Purpose

- Build and validate pilot UX outside the Moqui component repo.
- Consume backend contracts exposed by `hotwax/darpan`.
- Support future transfer to HotWax org without contract changes.

## Tech Stack

- Vue 3
- TypeScript (strict)
- Vite
- ESLint (flat config)
- Vitest

## Configuration

Set environment variables in `.env` or CI environment.

```bash
VITE_DARPAN_API_BASE_URL=http://localhost:8080
VITE_DARPAN_UI_MODE=pilot
```

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

## Notes

- This repository is temporary by design and will be transferred/mirrored to HotWax org when permissions are available.
- API contracts remain owned by `hotwax/darpan`.
