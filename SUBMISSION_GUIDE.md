# Obsidian Community Plugin Submission Guide

This guide explains how to submit Ranger FM to the Obsidian Community Plugins directory.

## Prerequisites Checklist

Before submitting, ensure you have:

- [x] **README.md** - Comprehensive documentation with features, installation, and usage instructions
- [x] **LICENSE** - MIT License added to the repository
- [x] **manifest.json** - Updated with proper author information and description
- [x] **.gitignore** - Excludes build artifacts and dependencies
- [ ] **Screenshot** - Add a screenshot.png showing the plugin interface
- [ ] **GitHub Release** - Create a versioned release with distribution files

## Step 1: Prepare Your Repository

### 1.1 Add a Screenshot

Take a screenshot of Ranger FM in action and save it as `screenshot.png` in the root directory. This helps users see what the plugin looks like.

### 1.2 Verify manifest.json

Your `manifest.json` should contain:
```json
{
  "id": "ranger-fm",
  "name": "Ranger FM",
  "version": "0.4.0",
  "minAppVersion": "1.4.0",
  "description": "Keyboard-driven file navigator with ranger-style hjkl navigation...",
  "author": "punassuming",
  "authorUrl": "https://github.com/punassuming/obsidian-ranger",
  "isDesktopOnly": true
}
```

## Step 2: Create a GitHub Release

### 2.1 Tag the Release

```bash
git tag -a 0.4.0 -m "Release v0.4.0 - UI improvements and community submission"
git push origin 0.4.0
```

### 2.2 Create Release on GitHub

1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Select tag: `0.4.0`
4. Release title: `v0.4.0`
5. Description: Brief changelog of improvements
6. Upload the following files as release assets:
   - `main.js`
   - `manifest.json`
   - `styles.css`

## Step 3: Submit to Obsidian Community Plugins

### 3.1 Fork obsidian-releases Repository

Fork: https://github.com/obsidianmd/obsidian-releases

### 3.2 Edit community-plugins.json

Add your plugin entry to the end of the array in `community-plugins.json`:

```json
{
  "id": "ranger-fm",
  "name": "Ranger FM",
  "author": "punassuming",
  "description": "Keyboard-driven file navigator with ranger-style hjkl navigation. Browse files efficiently with vim-inspired shortcuts.",
  "repo": "punassuming/obsidian-ranger"
}
```

**Important notes:**
- Add a comma after the previous entry
- Ensure proper JSON formatting
- The `id` must match your manifest.json
- Description should be concise (max 250 characters)

### 3.3 Create Pull Request

1. Commit your changes to your fork
2. Create a PR to `obsidianmd/obsidian-releases`
3. Title: "Add Ranger FM plugin"
4. Fill out the PR template completely:
   - Link to your repository
   - Confirm you've followed all guidelines
   - Mention any notable features
   - Add screenshots in the PR description

### 3.4 PR Template Example

```markdown
## Plugin Information

**Repository:** https://github.com/punassuming/obsidian-ranger
**Latest Release:** v0.4.0

## Description

Ranger FM is a keyboard-driven file navigator inspired by the ranger file manager. It provides vim-style hjkl navigation for efficiently browsing vault files with real-time preview and search capabilities.

## Key Features

- Vim-style hjkl navigation
- Quick search with `/` key
- Real-time markdown preview
- Full keyboard control
- Context menus for file operations

## Screenshots

[Attach screenshot showing the plugin interface]

## Checklist

- [x] Repository has comprehensive README
- [x] LICENSE file included
- [x] manifest.json properly configured
- [x] Release created with required files
- [x] Description is under 250 characters
- [x] Plugin ID doesn't contain "obsidian"
- [x] Tested in latest Obsidian version
```

## Step 4: Review Process

### What to Expect

1. **Automated Checks** - GitHub Actions will verify your submission
2. **Manual Review** - Obsidian team reviews for:
   - Code quality and security
   - Proper documentation
   - User experience
   - Community guidelines compliance
3. **Possible Feedback** - Be prepared to make changes if requested
4. **Approval & Merge** - Once approved, your plugin goes live!

### Timeline

- Initial automated checks: Minutes
- Manual review: Can take several days to weeks depending on queue
- Be patient and responsive to feedback

## Step 5: Post-Submission

### After Approval

Once merged, your plugin will be:
- Listed in Obsidian's Community Plugins browser
- Searchable by all Obsidian users
- Installable with one click

### Maintaining Your Plugin

- **Bug Fixes**: Release patches as needed
- **Feature Updates**: Create new releases following semver
- **User Support**: Monitor GitHub issues
- **Documentation**: Keep README up to date

### Creating Future Releases

For each new version:
1. Update version in `manifest.json`
2. Create GitHub release with same tag
3. Upload distribution files
4. Users will auto-update in Obsidian

## Resources

- [Obsidian Plugin Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Submission Requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [Plugin API Reference](https://github.com/obsidianmd/obsidian-api)
- [Community Discord](https://obsidian.md/community)

## Common Issues

### Release Files Missing
**Problem:** GitHub release doesn't have required files
**Solution:** Upload `main.js`, `manifest.json`, and `styles.css` as release assets

### ID Conflicts
**Problem:** Plugin ID already taken or invalid
**Solution:** Choose a unique ID that doesn't contain "obsidian"

### Description Too Long
**Problem:** Description exceeds 250 characters
**Solution:** Make it more concise, focus on key features

### Automated Tests Fail
**Problem:** PR checks fail
**Solution:** Verify JSON formatting and all required fields

## Support

If you need help with submission:
- Check [Obsidian Developer Discord](https://obsidian.md/community)
- Review other approved plugin PRs for examples
- Read the official documentation thoroughly

---

Good luck with your submission! 🚀
