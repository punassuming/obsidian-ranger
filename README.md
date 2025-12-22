# Ranger FM - File Navigator for Obsidian

A minimal, keyboard-driven file navigator for Obsidian with ranger-style navigation. Browse your vault files efficiently using vim-inspired hjkl keys.

> **Note:** Screenshot coming soon! See [SCREENSHOT_GUIDE.md](SCREENSHOT_GUIDE.md) for how to capture plugin screenshots.

## Features

- **Vim-style Navigation**: Navigate with `hjkl` keys for intuitive file browsing
- **Quick Search**: Press `/` to quickly filter and find files
- **Markdown Preview**: See file contents in real-time as you browse
- **File Details**: View file metadata including size and modification date
- **Keyboard Shortcuts**: Fully keyboard-driven for maximum efficiency
- **Context Menus**: Right-click for quick actions
- **Multiple File Type Icons**: Visual indicators for different file types

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Ranger FM"
4. Click Install, then Enable

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/punassuming/obsidian-ranger/releases)
2. Extract files to your vault's `.obsidian/plugins/ranger-fm/` directory
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Usage

### Opening Ranger FM

- Press `-` (hyphen) to open Ranger FM in the current pane
- Or use Command Palette: "Open Ranger FM"

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Move selection down / up |
| `h` | Go to parent folder |
| `l` / `Enter` | Open file or enter folder |
| `/` | Toggle search/filter mode |
| `n` / `N` | Cycle to next / previous search match |
| `gg` | Jump to top |
| `G` | Jump to bottom |
| `Ctrl+d` / `Ctrl+u` | Move down / up by 10 items |
| `zp` | Toggle preview pane |
| `q` / `Esc` | Close Ranger FM (or exit search) |

### Search Mode

Press `/` to enter search mode:
- Type to filter files and folders by name
- Matching text is highlighted in real-time
- Press `Enter` to keep filter and exit search bar
- Press `Esc` to clear filter and exit search
- Use `n` / `N` to cycle through matches

### Context Menu

Right-click on any file or folder for quick actions:
- Open file
- Open in new pane
- Copy path to clipboard
- Delete file (with confirmation)

## Settings

Access plugin settings via Settings → Ranger FM:

- **Show preview by default**: Enable/disable the markdown preview panel
- **Show details by default**: Enable/disable the file/folder details panel

## Development

This plugin is built using the [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api).

### Building

```bash
# Install dependencies
npm install

# Build the plugin
npm run build
```

## Support

If you encounter any issues or have suggestions:
- [Open an issue](https://github.com/punassuming/obsidian-ranger/issues) on GitHub
- Check existing issues for similar problems

## Credits

Inspired by [ranger](https://github.com/ranger/ranger), the console file manager with vim-like keybindings.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Created by the Obsidian community.

## Changelog

### 0.3.4
- Improved search functionality
- Added preview pane toggle (zp)
- Enhanced keyboard navigation

---

If you find this plugin useful, consider:
- ⭐ Starring the repository on GitHub
- 🐛 Reporting bugs and suggesting features
- 🤝 Contributing improvements
