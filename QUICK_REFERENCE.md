# FM - Obsidian File Manager - Quick Reference

## Opening FM
Press **`-`** (hyphen) or use Command Palette: "Open FM - File Manager"

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

## File Operations

| Key | Action |
|-----|--------|
| `yy` | Copy file/folder |
| `dd` | Cut file/folder (for moving) |
| `p` | Paste copied/cut item |

## Search

| Key | Action |
|-----|--------|
| `/` | Open search |
| `n` | Next match |
| `N` | Previous match |
| `Enter` | Keep filter, exit search |
| `Esc` | Clear filter, exit search |

## View Controls

| Key | Action |
|-----|--------|
| `zp` | Toggle preview pane |
| `q` or `Esc` | Close FM |

## Mouse Support

- **Hover** over file to select it
- **Double-click** to open
- **Right-click** for context menu

## Context Menu (Right-Click)

### For Files:
- Open
- Open in new pane
- Copy file (yy)
- Cut file (dd)
- Copy path
- Delete

### For Folders:
- Enter folder
- Copy folder (yy)
- Cut folder (dd)
- Copy path

## File Operation Workflow

### Copy a File:
1. Navigate to file with `j`/`k`
2. Press `yy` to copy
3. Navigate to destination folder with `h`/`l`
4. Press `p` to paste

### Move a File:
1. Navigate to file with `j`/`k`
2. Press `dd` to cut
3. Navigate to destination folder with `h`/`l`
4. Press `p` to paste

## Status Bar

Bottom of screen shows keyboard shortcuts:
`j/k navigate • h/l parent/open • yy copy • dd cut • p paste • q close`

## Tips

- All operations work with keyboard only
- Search highlights matches in real-time
- Preview shows markdown rendering
- Selected items show in accent color
- Works with your Obsidian theme
- Copy/move operations support both files and folders

## Settings

Access via: **Settings → FM - File Manager**

- **Show preview by default** - Toggle markdown preview panel
- **Show details by default** - Toggle file metadata panel

---

For full documentation, see [README.md](README.md)
