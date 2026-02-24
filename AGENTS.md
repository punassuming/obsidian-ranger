# AGENTS.md

Guidance for coding agents working in `obsidian-ranger` (File Nav - Ranger for Obsidian).

## Scope and Goal

- Keep the plugin keyboard-first, minimal, fast, and Obsidian-native.
- Prefer focused changes with clear behavior and low regression risk.

## Repository Snapshot

- Main source: `src/main.ts`
- Built output: `main.js` (generated)
- Styles: `styles.css`
- Plugin metadata: `manifest.json`
- Version compatibility map: `versions.json`
- Build tooling: `build.mjs`, `esbuild.config.mjs`
- Lint config: `eslint.config.mts`
- Docs: `README.md`, `docs/quick-reference.md`, `docs/contributing.md`, `docs/changelog.md`

## Environment and Commands

- Install deps: `npm ci`
- Dev watch build: `npm run dev`
- Production build: `npm run build`
- Lint: `npm run lint`
- Sync manifest/versions to package version: `npm run version`

Notes:
- `npm run build` runs TypeScript checks (`tsc -noEmit -skipLibCheck`) and bundles to `main.js`.
- `main.js` is generated from `src/main.ts`; do not hand-edit `main.js` unless explicitly required.
- `npm run version` updates `manifest.json` and `versions.json` and stages those files.

## Coding Conventions

- Language: TypeScript (strict settings enabled in `tsconfig.json`).
- Keep `no-explicit-any` and `no-unsafe-assignment` constraints in mind (enforced by ESLint).
- Match existing style: concise functions, clear naming, minimal comments, 2-space indentation.
- Prefer existing Obsidian APIs and current plugin patterns over introducing abstractions.

## Change Workflow

1. Read related code paths in `src/main.ts` and relevant docs before editing.
2. Make minimal, targeted edits.
3. Run `npm run build` and `npm run lint` after substantial changes.
4. For behavior changes, update user docs (`README.md` and/or `docs/quick-reference.md`).
5. Add a changelog entry in `docs/changelog.md` for user-visible changes.

## Manual Validation Checklist

- Open plugin in Obsidian desktop and verify:
- `-` opens File Nav.
- Core navigation keys still work (`hjkl`, `gg`, `G`, `/`, `f`).
- File operations (copy/move/delete/rename/duplicate/create) still function.
- Preview/details toggles (`zd`, `zp`, `zm`) behave correctly.
- Search/filter state and selection state are stable after operations.

## Release and CI Notes

- CI runs build + lint on Node 20 and 22 (`.github/workflows/lint.yml`).
- Release assets are `manifest.json`, `main.js`, `styles.css` (`.github/workflows/release.yml`).
- Version bumps are automated on merged PRs to `main` (`.github/workflows/auto-version-bump.yml`).

## AGENTS.md Maintenance Rule

- Treat this file as a living contract.
- Update `AGENTS.md` in the same PR whenever any of these change:
- Build/lint/version commands
- Source layout or major architecture
- CI/release workflow behavior
- Coding/testing conventions used by contributors
