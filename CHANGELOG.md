# Changelog

All notable changes to FM - Obsidian File Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2024-12-22

### Changed
- **BREAKING**: Renamed from "Ranger FM" to "FM - Obsidian File Manager"
- Plugin ID changed from `ranger-fm` to `fm-file-manager`
- CSS class prefix changed from `ranger-` to `fm-`
- All class names updated: `RangerView` → `FmView`, `RangerFmPlugin` → `FmPlugin`

### Added
- **File Copy**: Press `yy` to copy files or folders
- **File Move**: Press `dd` to cut (for moving) files or folders
- **Paste Operation**: Press `p` to paste copied/cut items
- Smart name handling when pasting in same folder (adds "copy" suffix)
- Full recursive folder copy/move support
- Visual feedback notifications for all operations
- Enhanced context menus with Copy/Cut options for files and folders
- Updated status bar showing new file operation shortcuts

### Improved
- Context menus now include keyboard shortcut hints (e.g., "Copy file (yy)")
- Better organization of context menu items with separators
- Updated documentation with file operation instructions

## [0.4.0] - 2024-12-22

### Added
- Status bar with keyboard shortcuts hints at the bottom
- Comprehensive README.md with features and usage documentation
- LICENSE file (MIT)
- SUBMISSION_GUIDE.md with detailed Obsidian community submission instructions
- SCREENSHOT_GUIDE.md for capturing plugin screenshots
- .gitignore file to exclude build artifacts
- Better visual feedback for selected items

### Changed
- **UI Overhaul**: Significantly improved visual design
  - Enhanced color scheme with accent colors
  - Larger, more prominent file icons (16px → 18px)
  - Better selected item highlighting (accent background with white text)
  - Improved path bar with accent border and background
  - Enhanced search bar with better focus states
  - Polished details panel styling
  - Better preview pane borders and padding
- Improved search highlighting with better contrast
- Updated manifest.json description for community submission (under 250 chars)
- Updated author information in manifest.json
- Enhanced internal code documentation
- Bumped version to 0.4.0

### Fixed
- Empty state messaging now centered and more prominent

## [0.3.4] - Previous Release

### Added
- Improved search functionality
- Preview pane toggle with `zp` keyboard shortcut
- Enhanced keyboard navigation

### Features from Earlier Versions
- Vim-style hjkl navigation
- Quick search with `/` key
- Real-time markdown preview
- File metadata display
- Context menu support
- Customizable preview and details panels
- Multiple file type icons
- Search match cycling with n/N
- Jump to top/bottom with gg/G
- Fast navigation with Ctrl+d/Ctrl+u

---

## Unreleased

### Planned
- Screenshot for documentation
- Additional keyboard shortcuts
- Custom color themes
- Folder bookmarks
- Rename operation

[0.5.0]: https://github.com/punassuming/obsidian-ranger/releases/tag/0.5.0
[0.4.0]: https://github.com/punassuming/obsidian-ranger/releases/tag/0.4.0
[0.3.4]: https://github.com/punassuming/obsidian-ranger/releases/tag/0.3.4
