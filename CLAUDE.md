# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install        # Install dependencies
npm run dev        # Start dev server with hot-reload
npm run build      # Compile and minify for production
npm run preview    # Preview production build locally
```

No test runner or linter is configured.

## Architecture

This is a minimal **Vue 3 + Vite** single-page application.

- `src/main.js` — entry point; mounts the root Vue app to `#app` in `index.html`
- `src/App.vue` — root component (currently a placeholder)
- `vite.config.js` — Vite config with `@vitejs/plugin-vue` and Vue DevTools; `@` is aliased to `src/`

There are no router, state management, or component subdirectories yet — the app is at the earliest scaffold stage.
