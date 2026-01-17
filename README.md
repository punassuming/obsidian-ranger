# File Nav - Ranger for Obsidian

A complete file manager for Obsidian with keyboard navigation and file operations. Navigate your vault efficiently with vim-inspired shortcuts and manage files with create, rename, duplicate, copy, move, and delete operations.

> **Note:** Screenshot coming soon!

## Features

- **Vim-style Navigation**: Navigate with `hjkl` keys for intuitive file browsing
- **File Operations**: Create, rename, duplicate, copy, move (cut), and delete files and folders
- **Quick Search**: Press `/` to highlight matching files in real-time
- **Filter Mode**: Press `f` to filter list to only matching entries
- **Markdown Preview**: See file contents in real-time as you browse
- **Preview Modes**: Toggle between rendered and text preview with `zp`
- **File Details**: View file metadata including size and modification date
- **Keyboard Shortcuts**: Fully keyboard-driven for maximum efficiency
- **Context Menus**: Right-click for quick actions
- **Multiple File Type Icons**: Visual indicators for different file types

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "File Nav - Ranger for Obsidian"
4. Click Install, then Enable

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/punassuming/obsidian-ranger/releases)
2. Extract files to your vault's `.obsidian/plugins/file-nav-ranger/` directory
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Usage

### Opening File Nav - Ranger for Obsidian

- Press `-` (hyphen) to open File Nav - Ranger for Obsidian in the current pane
- Or use Command Palette: "Open File Nav - Ranger for Obsidian"

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Move selection down / up |
| `h` | Go to parent folder |
| `l` / `Enter` | Open file or enter folder |
| `/` | Toggle search mode (highlight matches) |
| `f` | Filter list to matching entries |
| `n` / `N` | Cycle to next / previous search match |
| `gg` | Jump to top |
| `G` | Jump to bottom |
| `Ctrl+d` / `Ctrl+u` | Move down / up by 10 items |
| `y` | Copy file or folder |
| `x` | Cut file or folder (for moving) |
| `d` | Delete file or folder |
| `p` | Paste copied/cut item |
| `a` | Create new note |
| `A` | Create new folder |
| `r` | Rename selected item |
| `D` | Duplicate selected item |
| `zd` | Toggle preview pane visibility |
| `zp` | Toggle preview mode (rendered/text) |
| `q` / `Esc` | Close File Nav - Ranger for Obsidian (or exit search) |

### Search and Filter Modes

**Search Mode (`/`):**
- Type to highlight matching files and folders by name
- Matching text is highlighted in real-time
- Press `Enter` to keep highlights and exit search bar
- Press `Esc` to clear highlights and exit search
- Use `n` / `N` to cycle through matches

**Filter Mode (`f`):**
- Type to filter the list to only matching entries
- Only matching files and folders are shown
- Press `Enter` to keep filter and exit filter bar
- Press `Esc` to clear filter and show all entries

### File Operations

#### Create New Note
1. Navigate to the folder where you want to create the note
2. Press `a` to create a new note
3. Enter the note name
4. The new note will be created and selected

#### Create New Folder
1. Navigate to the parent folder
2. Press `A` to create a new folder
3. Enter the folder name
4. The new folder will be created and selected

#### Copy
1. Navigate to file or folder you want to copy
2. Press `y` to copy
3. Navigate to destination folder
4. Press `p` to paste

#### Move
1. Navigate to file or folder you want to move
2. Press `x` to cut
3. Navigate to destination folder
4. Press `p` to paste

#### Rename
1. Navigate to file or folder you want to rename
2. Press `r` to rename
3. Enter the new name
4. The item will be renamed

#### Duplicate
1. Navigate to file or folder you want to duplicate
2. Press `D` to duplicate
3. A copy will be created with " copy" appended to the name

#### Delete
1. Navigate to file or folder you want to delete
2. Press `d` to delete
3. Confirm the deletion when prompted
4. The item will be moved to trash (or permanently deleted if trash is not available)

### Context Menu

Right-click on any file or folder for quick actions:
- **Files**: Open, Open in new pane, Rename, Duplicate, Copy file, Cut file, Copy path, Delete
- **Folders**: Enter folder, Rename, Duplicate, Copy folder, Cut folder, Copy path, Delete

## Settings

Access plugin settings via Settings → File Nav - Ranger for Obsidian:

- **Show preview by default**: Enable/disable the markdown preview panel
- **Show details by default**: Enable/disable the file/folder details panel
- **Show file extensions**: Toggle filename extensions in the list
- **Show hidden files**: Include dotfiles in file results
- **Show hidden folders**: Include dotfolders in folder results
- **Group folders first**: Control folder-first sorting

## Documentation

- [Quick reference](docs/quick-reference.md)
- [Changelog](docs/changelog.md)
- [Contributing](docs/contributing.md)

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

See [docs/changelog.md](docs/changelog.md) for release history.

If you find this plugin useful, consider:
- ⭐ Starring the repository on GitHub
- 🐛 Reporting bugs and suggesting features
- 🤝 Contributing improvements
