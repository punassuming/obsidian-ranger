# FM - Obsidian File Manager

A complete file manager for Obsidian with keyboard navigation and file operations. Navigate your vault efficiently with vim-inspired shortcuts and manage files with copy, move, and delete operations.

> **Note:** Screenshot coming soon! See [SCREENSHOT_GUIDE.md](SCREENSHOT_GUIDE.md) for how to capture plugin screenshots.

## Features

- **Vim-style Navigation**: Navigate with `hjkl` keys for intuitive file browsing
- **File Operations**: Copy, move (cut), and delete files and folders
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
3. Click Browse and search for "FM - Obsidian File Manager"
4. Click Install, then Enable

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/punassuming/obsidian-ranger/releases)
2. Extract files to your vault's `.obsidian/plugins/fm-file-manager/` directory
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Usage

### Opening FM

- Press `-` (hyphen) to open FM in the current pane
- Or use Command Palette: "Open FM - File Manager"

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
| `yy` | Copy file or folder |
| `dd` | Cut file or folder (for moving) |
| `p` | Paste copied/cut item |
| `zp` | Toggle preview pane |
| `q` / `Esc` | Close FM (or exit search) |

### Search Mode

Press `/` to enter search mode:
- Type to filter files and folders by name
- Matching text is highlighted in real-time
- Press `Enter` to keep filter and exit search bar
- Press `Esc` to clear filter and exit search
- Use `n` / `N` to cycle through matches

### File Operations

#### Copy
1. Navigate to file or folder you want to copy
2. Press `yy` to copy
3. Navigate to destination folder
4. Press `p` to paste

#### Move
1. Navigate to file or folder you want to move
2. Press `dd` to cut
3. Navigate to destination folder
4. Press `p` to paste

#### Delete
- Use context menu (right-click) and select Delete
- Confirmation required before deletion

### Context Menu

Right-click on any file or folder for quick actions:
- **Files**: Open, Open in new pane, Copy file, Cut file, Copy path, Delete
- **Folders**: Enter folder, Copy folder, Cut folder, Copy path

## Settings

Access plugin settings via Settings → FM - File Manager:

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

### 0.5.0
- **Renamed** to FM - Obsidian File Manager
- **Added** file copy operation with `yy` keyboard shortcut
- **Added** file move (cut) operation with `dd` keyboard shortcut
- **Added** paste operation with `p` keyboard shortcut
- **Enhanced** context menus with copy/cut options for files and folders
- **Improved** status bar to show file operation shortcuts

### 0.4.0
- Improved search functionality
- Added preview pane toggle (zp)
- Enhanced keyboard navigation

---

If you find this plugin useful, consider:
- ⭐ Starring the repository on GitHub
- 🐛 Reporting bugs and suggesting features
- 🤝 Contributing improvements
