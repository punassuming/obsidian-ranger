# File Nav - Ranger for Obsidian - Quick Reference

## Opening File Nav - Ranger for Obsidian
Press **`-`** (hyphen) or use Command Palette: "Open File Nav - Ranger for Obsidian"

## Navigation

| Key | Action |
|-----|--------|
| `j` | Move down |
| `k` | Move up |
| `l` or `Enter` | Open file / Enter folder |
| `h` | Go to parent folder |
| `Ctrl+d` | Jump down 10 items |
| `Ctrl+u` | Jump up 10 items |
| `gg` | Jump to top |
| `G` | Jump to bottom |
| `gh` or `g/` | Go to vault root (home) |
| `gt` | Go to next File Nav tab |
| `gT` | Go to previous File Nav tab |
| `gf` | Go to next Obsidian favorite (file/folder) |
| `gF` | Go to previous Obsidian favorite (file/folder) |
| `T` | Open new File Nav tab |

## File Operations

| Key | Action |
|-----|--------|
| `y` | Copy file/folder |
| `x` | Cut file/folder (for moving) |
| `d` | Delete file/folder |
| `p` | Paste copied/cut item |
| `a` | Create new note |
| `A` | Create new folder |
| `r` | Rename selected item |
| `D` | Duplicate selected item |

## Search and Filter

| Key | Action |
|-----|--------|
| `/` | Open search mode (highlight matches) |
| `f` | Open filter mode (show only matches) |
| `n` | Next match |
| `N` | Previous match |
| `Enter` | Keep filter/highlights, exit |
| `Esc` | Clear filter/highlights, exit |

## View Controls

| Key | Action |
|-----|--------|
| `zd` | Toggle preview pane visibility |
| `zp` | Toggle preview mode (rendered/text) |
| `zm` | Toggle deer mode (structure-only) |
| `q` or `Esc` | Close File Nav - Ranger for Obsidian |

## Mouse Support

- **Hover** over file to select it
- **Double-click** to open
- **Right-click** for context menu

## Context Menu (Right-Click)

### For Files:
- Open
- Open in new pane
- Rename (r)
- Duplicate (D)
- Copy file (y)
- Cut file (x)
- Copy path
- Delete (d)

### For Folders:
- Enter folder
- Rename (r)
- Duplicate (D)
- Copy folder (y)
- Cut folder (x)
- Copy path

> **Note:** Use the `d` keyboard shortcut to delete folders.

## File Operation Workflow

### Create a Note:
1. Navigate to destination folder with `h`/`l`
2. Press `a` to create new note
3. Enter note name

### Create a Folder:
1. Navigate to parent folder with `h`/`l`
2. Press `A` to create new folder
3. Enter folder name

### Copy a File:
1. Navigate to file with `j`/`k`
2. Press `y` to copy
3. Navigate to destination folder with `h`/`l`
4. Press `p` to paste

### Move a File:
1. Navigate to file with `j`/`k`
2. Press `x` to cut
3. Navigate to destination folder with `h`/`l`
4. Press `p` to paste

### Rename a File:
1. Navigate to file with `j`/`k`
2. Press `r` to rename
3. Enter new name

### Duplicate a File:
1. Navigate to file with `j`/`k`
2. Press `D` to duplicate
3. A copy will be created with " copy" appended

### Delete a File:
1. Navigate to file with `j`/`k`
2. Press `d` to delete
3. Confirm deletion when prompted

## Status Bar

Bottom of screen shows keyboard shortcuts:
`j/k navigate • h/l parent/open • / search • f filter • y copy • x cut • d delete • p paste • q close`

## Tips

- All operations work with keyboard only
- Search mode highlights matches; filter mode shows only matches
- Press `zd` to toggle preview pane, `zp` to toggle preview mode, `zm` to toggle deer mode (structure-only)
- Deer mode hides both preview and details panels, showing only the file structure
- Preview shows markdown rendering or raw text
- Selected items show in accent color
- Works with your Obsidian theme
- Copy/move operations support both files and folders
- Create, rename, duplicate, and delete operations work on both files and folders

## Settings

Access via: **Settings → File Nav - Ranger for Obsidian**

- **Deer mode (structure-only)** - Hide both preview and details panes by default (shows only file structure)
- **Show preview by default** - Toggle markdown preview panel
- **Show details by default** - Toggle file metadata panel
- **Show file extensions** - Show file extensions in the list
- **Show hidden files** - Include dotfiles in results
- **Show hidden folders** - Include dotfolders in results
- **Group folders first** - Sort folders before files

---

For full documentation, see [README.md](../README.md)
