# Contributing to Ranger FM

Thank you for your interest in contributing to Ranger FM! This guide will help you get started.

## Quick Start for Development

### Prerequisites
- Node.js (for syntax checking)
- Obsidian (for testing the plugin)
- Git

### Setup Development Environment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/punassuming/obsidian-ranger.git
   cd obsidian-ranger
   ```

2. **Link to Obsidian vault:**
   ```bash
   # Create a symbolic link to your test vault's plugins directory
   # Linux/macOS:
   ln -s "$(pwd)" "/path/to/your/vault/.obsidian/plugins/ranger-fm"
   
   # Windows (run as Administrator):
   mklink /D "C:\path\to\vault\.obsidian\plugins\ranger-fm" "C:\path\to\obsidian-ranger"
   ```

3. **Enable the plugin:**
   - Open Obsidian
   - Go to Settings → Community plugins
   - Disable Safe Mode (if needed)
   - Enable "Ranger FM"

### Making Changes

This is a simple plugin with no build step. You can edit the files directly:

- **main.js** - Core plugin logic
- **styles.css** - All styling
- **manifest.json** - Plugin metadata

After making changes:
1. Reload Obsidian (Ctrl+R / Cmd+R)
2. Test your changes
3. Check browser console (Ctrl+Shift+I / Cmd+Option+I) for errors

### Code Style

- Use consistent indentation (2 spaces)
- Follow existing code patterns
- Add comments for complex logic
- Keep functions focused and readable

### Testing Your Changes

1. **Manual Testing:**
   - Open Ranger FM with `-` key
   - Test all keyboard shortcuts
   - Try different file types
   - Test search functionality
   - Verify context menus work
   - Check preview rendering

2. **Syntax Check:**
   ```bash
   node -c main.js
   ```

3. **JSON Validation:**
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"
   ```

## Types of Contributions

### Bug Reports
- Check existing issues first
- Provide clear reproduction steps
- Include Obsidian version and OS
- Share console errors if applicable

### Feature Requests
- Describe the use case
- Explain expected behavior
- Consider if it fits the plugin's philosophy (keyboard-driven, minimal)

### Code Contributions

#### Good First Issues
- UI tweaks and polish
- Additional file type icons
- Documentation improvements
- Keyboard shortcut additions

#### Larger Features
- Discuss in an issue first
- Keep changes focused
- Update documentation
- Test thoroughly

## Pull Request Process

1. **Fork and Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes:**
   - Write clean, documented code
   - Follow existing patterns
   - Test thoroughly

3. **Commit:**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```
   
   Use conventional commit format:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `style:` formatting, CSS
   - `refactor:` code restructure
   - `test:` testing
   - `chore:` maintenance

4. **Push and PR:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a PR on GitHub

5. **PR Description Should Include:**
   - What changed and why
   - Testing performed
   - Screenshots (for UI changes)
   - Related issue numbers

## Code Organization

### main.js Structure
```
- Helper functions (iconForFileName, setEntryIcon)
- RangerView class (main view logic)
  - Lifecycle methods (onOpen, onClose)
  - Navigation methods (move, up, activate)
  - Search methods (enterSearchMode, applySearchFilter)
  - Rendering methods (render, renderPreview, renderStatusBar)
  - Keyboard handling
- RangerFmPlugin class (plugin setup)
- RangerSettingTab class (settings UI)
```

### styles.css Organization
```
- Base container (.ranger-fm)
- Path bar (.ranger-path)
- Search bar (.ranger-search)
- Layout (.ranger-layout, .ranger-left, .ranger-right)
- File list (.ranger-list, .ranger-item)
- Preview pane (.ranger-preview)
- Details panel (.ranger-details)
- Status bar (.ranger-status)
```

## Plugin Philosophy

Ranger FM aims to be:
- **Keyboard-first:** Every action accessible via keyboard
- **Minimal:** Focus on core file navigation
- **Fast:** Quick to open and navigate
- **Familiar:** Vim/ranger-inspired for power users
- **Integrated:** Feels native to Obsidian

When contributing, keep these principles in mind.

## Resources

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [Obsidian Plugin Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Ranger File Manager](https://github.com/ranger/ranger) (inspiration)

## Questions?

- Open an issue for questions
- Check existing issues and PRs
- Be patient and respectful

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Ranger FM! 🚀
