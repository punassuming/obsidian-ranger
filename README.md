# Ranger FM

Ranger FM is a minimal file manager for [Obsidian](https://obsidian.md/) that emulates the navigation flow of the ranger terminal tool. It opens in the current pane and lets you browse your vault entirely with the keyboard.

## Features

- Familiar `hjkl` style navigation plus `gg`, `G`, `Ctrl+d`, and `Ctrl+u` shortcuts.
- Open folders/files in place, with automatic previews and metadata when available.
- Toggleable inline search (`/`) with incremental filtering and match hopping (`n`/`N`).
- Optional preview and details panels that can be turned on/off from the settings tab.
- Command palette entry and default hotkey (`-`) to open the view.

## Installation

1. Copy `manifest.json`, `main.js`, and `styles.css` into a folder named `ranger-fm` inside your vault's `.obsidian/plugins` directory.
2. Restart Obsidian (or reload plugins) and enable **Ranger FM** in *Settings → Community plugins*.

## Development

Requirements: Node.js 18+

```bash
npm install
npm run dev   # rebuilds on change
# or
npm run build # single build used for releases
```

The source lives in `src/main.ts` and is bundled into `main.js` via [esbuild](https://esbuild.github.io/). Do not edit the generated `main.js` directly.

### Version manifest

`versions.json` tracks which plugin version supports which minimum Obsidian version. Update both `manifest.json` and `versions.json` whenever you release a new version.
