# Changelog

All notable changes to File Nav - Ranger for Obsidian will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2024-12-22

### Changed
- Renamed the plugin to File Nav - Ranger for Obsidian
- Plugin ID updated to `file-nav-ranger`

## [0.6.0] - 2024-12-22

### Changed
- Renamed the plugin to Ranger File Manager
- Plugin ID updated to `ranger-file-manager`
- Documentation reorganized into the `docs/` directory

### Added
- File display options for extensions and hidden files
- Folder display options for hidden folders and folder-first sorting

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

### Added
- **Go to Common Folders**: New `g` prefix shortcuts for quick navigation
  - `gh` or `g/` - Go to vault root (home)
- **Tab Navigation**: Switch between File Nav tabs
  - `gt` - Go to next File Nav tab
  - `gT` - Go to previous File Nav tab
  - `T` - Open new File Nav tab in split/new pane
- **New Command**: "Open File Nav in new tab" available in Command Palette
- Enhanced `handleG()` to support multi-key combinations similar to vim
- **Ranger-style Sorting Chords**:
  - `on` - Sort by name
  - `od` - Sort by modified date/time
  - `os` - Sort by size
- **Sort Mode Setting**: Added a `Sort by` folder option in settings to persist the active sort mode

### Fixed
- Chord overlay (`g`/`z` key-combo helper) now times out automatically after 2.5 seconds.
- Pressing `Esc` while a chord overlay is open now dismisses the overlay instead of closing File Nav.
- Invalid second keys now cancel the pending chord so the overlay cannot remain stuck.
- Expired pending key chords now clear before processing the next key, so normal navigation keys are no longer swallowed after timeout.
- Chord overlay visibility now uses an explicit hidden state, preventing the helper modal from remaining visible after chord timeout/cancel.
- Updating split ratio while preview is hidden now keeps the file pane at full width.

### Changed
- Reduced the default file-list split ratio from 40% to 35% to give the preview pane more room by default.

### Planned
- Screenshot for documentation
- Additional keyboard shortcuts
- Custom color themes
- Folder bookmarks
- Go to daily notes folder shortcut

[0.6.1]: https://github.com/punassuming/obsidian-ranger/releases/tag/0.6.1
[0.6.0]: https://github.com/punassuming/obsidian-ranger/releases/tag/0.6.0
[0.5.0]: https://github.com/punassuming/obsidian-ranger/releases/tag/0.5.0
[0.4.0]: https://github.com/punassuming/obsidian-ranger/releases/tag/0.4.0
[0.3.4]: https://github.com/punassuming/obsidian-ranger/releases/tag/0.3.4
