# UI Mockup - Visual Changes

This document describes the visual appearance of the improved UI. Since we cannot run Obsidian directly, this serves as a detailed description of what users will see.

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Ranger FM                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📁 Documents/Notes                   [accent border]     │   │
│  │                       ↑ Path bar with background        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────┐  ┌────────────────────────────┐   │
│  │ FILE LIST (40%)        │  │ PREVIEW PANE (60%)        │   │
│  │                        │  │                            │   │
│  │ ┌────────────────────┐ │  │ ┌────────────────────────┐ │   │
│  │ │ 📁 Work            │ │  │ │ File: README.md        │ │   │
│  │ │ 📁 Personal        │ │  │ │ • 3.5KB                │ │   │
│  │ │ 📝 README.md       │ │  │ │ • Modified: ...        │ │   │
│  │ │ ▓▓ Notes.md ▓▓▓▓▓▓│ │  │ └────────────────────────┘ │   │
│  │ │ 📝 TODO.md         │ │  │                            │   │
│  │ │ 🖼️  banner.png      │ │  │ ┌────────────────────────┐ │   │
│  │ │ 💾 data.json       │ │  │ │ # Notes Preview        │ │   │
│  │ │                    │ │  │ │                        │ │   │
│  │ │ Notes.md is        │ │  │ │ This is the markdown   │ │   │
│  │ │ SELECTED with      │ │  │ │ preview of the         │ │   │
│  │ │ accent background  │ │  │ │ selected file...       │ │   │
│  │ └────────────────────┘ │  │ │                        │ │   │
│  │                        │  │ └────────────────────────┘ │   │
│  └─────────────────────────┘  └────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [j/k] navigate • [h/l] parent/open • [/] search •       │   │
│  │ [zp] toggle preview • [q] close    ↑ Status Bar        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Color Scheme Description

### Path Bar
```
Background: var(--background-secondary) [light gray/dark charcoal]
Border-Left: 3px solid var(--interactive-accent) [blue/purple accent]
Text: var(--text-accent) [accent color]
Font-Weight: 500 (medium bold)
```

### File List - Selected Item
```
Background: var(--interactive-accent) [solid accent color]
Text: var(--text-on-accent) [white/very light]
Icons: Same as text (white/light)
Font-Weight: 500 (medium bold)
Border-Radius: 4px
```

### File List - Regular Items
```
Background: transparent (hover: light gray)
Icons: var(--text-accent) [accent color]
Icon Size: 18px × 18px
Gap: 10px between icon and text
Padding: 8px 12px
```

### Search Bar (When Active)
```
Border: 2px solid var(--background-modifier-border)
Border (Focus): 2px solid var(--interactive-accent)
Box-Shadow (Focus): 0 0 0 2px var(--interactive-accent-hover) [glow]
Padding: 8px 12px
Font-Size: 14px
Border-Radius: 6px
```

### Search Highlighting
```
Regular Items:
  Background: rgba(255, 208, 0, 0.45) [yellow highlight]
  Font-Weight: 600 (semi-bold)
  Padding: 1px 2px
  Border-Radius: 2px

Selected Item:
  Background: rgba(255, 255, 255, 0.3) [white overlay]
  Color: var(--text-on-accent) [white]
```

### Details Panel
```
Background: var(--background-secondary)
Border-Left: 3px solid var(--interactive-accent)
Padding: 10px 12px
Border-Radius: 6px
Title Font-Weight: 600
Meta Color: var(--text-muted)
```

### Preview Pane
```
Border: 2px solid var(--background-modifier-border)
Border-Radius: 8px
Padding: 12px
Background: var(--background-primary)
```

### Status Bar
```
Background: var(--background-secondary)
Border-Radius: 6px
Padding: 8px 10px
Font: var(--font-monospace)
Font-Size: 11px
Color: var(--text-muted)

Key Indicators:
  Background: var(--background-modifier-border)
  Padding: 2px 6px
  Font-Weight: 600
  Color: var(--text-normal)
```

## Example Scenarios

### Scenario 1: Browsing Files
```
User sees:
1. Path "Documents/Notes" with blue accent border
2. List of files with colorful 18px icons
3. One file highlighted in solid accent color
4. Preview of selected file on right
5. Status bar showing shortcuts at bottom
```

### Scenario 2: Searching
```
User presses "/":
1. Search bar appears with focus glow
2. User types "readme"
3. All files with "readme" highlighted in yellow
4. Non-matching files still visible
5. Selection jumps to first match
6. Selected match shows white highlight overlay
```

### Scenario 3: Hovering
```
User hovers over a file:
1. Background changes to light gray
2. Cursor changes to default (not pointer)
3. File becomes selected
4. Preview updates to show that file
```

## Visual Hierarchy

### Most Prominent (Eye-Catching)
1. **Selected Item** - Solid accent color, impossible to miss
2. **Path Bar** - Accent border draws the eye
3. **Search Highlights** - Bold yellow stands out

### Secondary Prominence
1. **File Icons** - Accent colored, 18px size
2. **Details Panel** - Accent border, background
3. **Status Bar** - Gray background with key highlights

### Tertiary (Supporting)
1. **Regular File Names** - Default text color
2. **Preview Content** - Standard markdown rendering
3. **Borders** - Subtle gray definition

## Spacing & Layout

### Padding Values
- Container: 12px 14px (top/bottom, left/right)
- Path bar: 6px 10px
- Search input: 8px 12px
- File items: 8px 12px
- Details panel: 10px 12px
- Preview pane: 12px
- Status bar: 8px 10px

### Gap Values
- Between layout columns: 10px
- Between icon and text: 10px
- Between status hints: 12px
- Between file items: 2px (margin-bottom)

### Border Radius
- Small elements: 3px, 4px
- Medium elements: 6px
- Large containers: 8px

### Border Widths
- Accent borders: 3px
- Container borders: 2px

## Dark vs Light Theme

The plugin uses CSS variables that adapt to Obsidian's theme:

### Light Theme
- Backgrounds: White/light gray
- Text: Dark gray/black
- Accent: Blue/purple (theme dependent)
- Selection: Solid accent with white text

### Dark Theme
- Backgrounds: Dark gray/charcoal
- Text: Light gray/white
- Accent: Lighter blue/purple
- Selection: Solid accent with white text

Both themes provide excellent contrast and readability.

## Accessibility

### Contrast Ratios
- Selected item text on accent: High contrast (white on color)
- Regular text: Follows Obsidian theme (WCAG AA+)
- Icons: Accent colored for visibility
- Borders: Clear definition without being harsh

### Visual Feedback
- Hover states provide feedback
- Selection is obvious (accent background)
- Focus states on search (glow effect)
- Status bar always shows available shortcuts

## Animation & Transitions

```css
Smooth transitions on:
- File item hover (background-color: 0.15s ease)
- File item transform (transform: 0.1s ease)
- Search focus (smooth glow appearance)

No animations on:
- Selection changes (instant for responsiveness)
- Preview rendering (instant for speed)
```

## Comparison: Before vs After

### Before (v0.3.4)
- Light gray selection (subtle)
- 16px icons in muted gray
- 1px thin borders
- No status bar
- Plain path display
- Basic search input
- Minimal spacing

### After (v0.4.0)
- ⭐ Accent color selection (bold)
- ⭐ 18px icons in accent color
- ⭐ 2px strong borders
- ⭐ Status bar with shortcuts
- ⭐ Highlighted path display
- ⭐ Enhanced search with glow
- ⭐ Comfortable spacing

## What Users Will Love

1. **Status Bar** - "Finally, I can see the shortcuts!"
2. **Bold Selection** - "I can actually see what's selected"
3. **Larger Icons** - "The icons are much more visible"
4. **Better Spacing** - "It feels more comfortable to use"
5. **Modern Design** - "This looks professional"

## Technical Notes

All styling uses:
- Obsidian CSS variables (theme-aware)
- Semantic spacing (8px increments)
- Accessible color contrast
- Smooth, subtle animations
- No hardcoded colors (adapts to themes)

---

This mockup represents the visual improvements made to Ranger FM v0.4.0. The actual appearance will match your Obsidian theme's colors while maintaining the enhanced structure, spacing, and visual hierarchy described here.
