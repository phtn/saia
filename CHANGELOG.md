# Changelog

All notable changes to `saia` will be recorded here.

## [Unreleased]

### Added

- Insurance dashboard: overview, quote workflows for nine products, mobile insurance with IMEI scanning, policies, claims, analytics and tasks.
- Typed domain layer in `src/lib/insurance`, ported from the legacy `src/lib/js` modules.
- Voice assistant groundwork: command and form registry, rule-based interpreter, Web Speech wrapper, and assistant dock (⌘K).
- Step-pipeline form components ported from livesnaps' verification flow.
- Light and dark themes restyled after the layered-card references.
- `scripts/typecheck-btsx.mjs`, which type-checks `.btsx` components through their generated TSRX.

### Fixed

- `bun run typecheck` crashed: `tsconfig.json` now points the TSRX compiler at `octane/compiler/volar`.

### Changed

- Use the context directly in the theme provider, preparing for Octane's removal of the legacy `Context.Provider` alias while retaining compatibility with Octane 0.2.13.

### Fixed

- Mount the theme provider above the topbar so `ThemeToggle` can read and update the theme context.

- Replace the invalid sidebar callback placeholder in `App.btsx` with an empty function so the application builds.
- Rename the icon component to `Icon.btsx` so directory imports resolve to the named exports in `index.ts`.
