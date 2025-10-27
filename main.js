/*
  Ranger FM - a minimal ranger-style file navigator for Obsidian
  Occupies the current pane (ItemView). Keys:
    j/k: move selection
    l / Enter: open file or enter folder
    h: go up to parent folder
    /: toggle search bar (type to filter)
    q or Esc: exit search bar or return to previous file
    Ctrl+d / Ctrl+u: move down/up by 10 items
    gg / G: jump to top/bottom
    n / N: cycle next/prev search match
  Command: Open Ranger FM (default hotkey '-')
*/

const { Plugin, ItemView, TFile, TFolder, MarkdownRenderer } = require('obsidian');

const VIEW_TYPE_RANGER = 'ranger-fm-view';

class RangerView extends ItemView {
  constructor(leaf, app) {
    super(leaf);
    this.app = app;
    this.currentFolder = this.app.vault.getRoot();
    this.entries = [];
    this.allEntries = [];
    this.selectedIndex = 0;
    this.searchActive = false;
    this.searchQuery = '';
    this.previewToken = 0;
    this.prevFilePath = null;
    this.startFolderPath = null;
    this.selectFilePath = null;
    this.preselectPath = null;
    this.initialized = false;
    this.lastSearchQuery = '';
    this._suppressEnterUntil = 0;
  }

  getViewType() { return VIEW_TYPE_RANGER; }
  getDisplayText() { return 'Ranger FM'; }

  async setState(state) {
    this.prevFilePath = state?.prevFile || null;
    this.startFolderPath = state?.startFolder || null;
    this.selectFilePath = state?.selectFile || null;
    // If view already initialized, immediately navigate
    if (this.initialized) {
      if (this.selectFilePath) this.setStartLocation(this.selectFilePath);
      else if (this.startFolderPath) this.setStartFolder(this.startFolderPath);
    }
  }

  getState() {
    return { startFolder: this.currentFolder?.path || '/', prevFile: this.prevFilePath };
  }

  onOpen() {
    this.initialized = true;
    const fileFromPath = (p) => p ? this.app.vault.getAbstractFileByPath(p) : null;
    const startFile = fileFromPath(this.selectFilePath);
    const start = startFile || fileFromPath(this.startFolderPath);
    if (start instanceof TFolder) this.currentFolder = start;
    else if (start instanceof TFile) { this.currentFolder = start.parent || this.app.vault.getRoot(); this.preselectPath = start.path; }
    else this.currentFolder = this.app.vault.getRoot();

    const root = this.contentEl;
    root.empty();
    const host = root.createDiv({ cls: 'ranger-fm', attr: { tabindex: '0' } });

    // Path bar
    this.pathEl = host.createDiv({ cls: 'ranger-path' });
    // Search bar
    this.searchWrapEl = host.createDiv({ cls: 'ranger-search is-hidden' });
    this.searchInputEl = this.searchWrapEl.createEl('input', { type: 'text', placeholder: 'Search (Esc to exit)...' });
    this.registerDomEvent(this.searchInputEl, 'input', () => this.applySearchFilter());
    this.registerDomEvent(this.searchInputEl, 'keydown', (evt) => {
      const k = evt.key;
      if (k === 'Escape') {
        evt.preventDefault();
        evt.stopPropagation();
        this.exitSearchMode(true, true);
      } else if (k === 'Enter') {
        // Do not open: hide bar and keep filter applied
        evt.preventDefault();
        evt.stopPropagation();
        this._suppressEnterUntil = Date.now() + 250; // swallow any immediate Enter on host
        this.exitSearchMode(true, false);
      } else if ((evt.ctrlKey || evt.metaKey) && (k === 'j' || k === 'J')) {
        evt.preventDefault();
        evt.stopPropagation();
        this.move(1);
      } else if ((evt.ctrlKey || evt.metaKey) && (k === 'k' || k === 'K')) {
        evt.preventDefault();
        evt.stopPropagation();
        this.move(-1);
      }
    });
    // Layout
    this.layoutEl = host.createDiv({ cls: 'ranger-layout' });
    this.leftEl = this.layoutEl.createDiv({ cls: 'ranger-left' });
    this.listEl = this.leftEl.createDiv({ cls: 'ranger-list', attr: { tabindex: '0' } });
    this.rightEl = this.layoutEl.createDiv({ cls: 'ranger-right' });
    this.detailsEl = this.rightEl.createDiv({ cls: 'ranger-details' });
    this.previewEl = this.rightEl.createDiv({ cls: 'ranger-preview' });

    this.render();
    host.focus({ preventScroll: true });

    // Keyboard handling when the view has focus
    this.registerDomEvent(host, 'keydown', (evt) => {
      const activeInSearch = document.activeElement === this.searchInputEl;
      const k = evt.key;
      if (activeInSearch) {
        // While typing, still honor Ctrl+j/k to move within filtered list
        if ((evt.ctrlKey || evt.metaKey) && (k === 'j' || k === 'J')) {
          evt.preventDefault();
          evt.stopPropagation();
          this.move(1);
        } else if ((evt.ctrlKey || evt.metaKey) && (k === 'k' || k === 'K')) {
          evt.preventDefault();
          evt.stopPropagation();
          this.move(-1);
        }
        return; // otherwise let input consume keys
      }

      if (k === 'Enter' && Date.now() < this._suppressEnterUntil) {
        evt.preventDefault();
        evt.stopPropagation();
        return; // ignore Enter immediately after closing search
      }

      if (["j","k","h","l","/","Enter","Escape","q","g","G","n","N"].includes(k) || (evt.ctrlKey && (k === 'd' || k === 'u'))) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      if (evt.ctrlKey && k === 'd') this.move(10);
      else if (evt.ctrlKey && k === 'u') this.move(-10);
      else if (k === 'j') this.move(1);
      else if (k === 'k') this.move(-1);
      else if (k === 'l' || k === 'Enter') this.activate();
      else if (k === 'h') this.up();
      else if (k === '/') this.enterSearchMode();
      else if (k === 'g') this.handleG();
      else if (k === 'G' || (k === 'g' && evt.shiftKey)) this.jumpBottom();
      else if (k === 'n') this.cycleSearch(1);
      else if (k === 'N') this.cycleSearch(-1);
      else if (k === 'Escape' || k === 'q') this.closeView();
    });
  }

  async onClose() {
    // nothing special
  }

  setStartFolder(path) {
    const abs = path ? this.app.vault.getAbstractFileByPath(path) : null;
    let folder = this.app.vault.getRoot();
    if (abs instanceof TFolder) folder = abs;
    else if (abs instanceof TFile) folder = abs.parent || folder;
    this.currentFolder = folder;
    this.selectedIndex = 0;
    if (this.searchActive) this.exitSearchMode(false);
    this.render();
  }

  setStartLocation(filePath) {
    const abs = filePath ? this.app.vault.getAbstractFileByPath(filePath) : null;
    if (abs instanceof TFile) {
      this.currentFolder = abs.parent || this.app.vault.getRoot();
      this.preselectPath = abs.path;
      this.selectedIndex = 0;
      if (this.searchActive) this.exitSearchMode(false);
      this.render();
    } else if (abs instanceof TFolder) {
      this.setStartFolder(abs.path);
    } else if (this.startFolderPath) {
      this.setStartFolder(this.startFolderPath);
    }
  }

  getFolderEntries(folder) {
    if (!(folder instanceof TFolder)) return [];
    const children = folder.children || [];
    const dirs = [];
    const files = [];
    for (const child of children) {
      if (child instanceof TFolder) dirs.push(child);
      else if (child instanceof TFile) files.push(child);
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    return [...dirs, ...files];
  }

  render() {
    // Update entries and clamp selection
    this.allEntries = this.getFolderEntries(this.currentFolder);
    if (this.searchQuery) this.entries = this.filterEntries(this.searchQuery);
    else this.entries = this.allEntries;
    // honor a pending file selection
    if (this.preselectPath) {
      const i = this.entries.findIndex(e => e.path === this.preselectPath);
      if (i >= 0) this.selectedIndex = i;
      this.preselectPath = null;
    }
    if (this.selectedIndex >= this.entries.length) this.selectedIndex = Math.max(0, this.entries.length - 1);
    if (this.selectedIndex < 0) this.selectedIndex = 0;

    // Render path
    const path = this.currentFolder.path === '/' ? '/' : this.currentFolder.path;
    this.pathEl.setText(path);

    // Render list
    this.listEl.empty();
    if (this.entries.length === 0) {
      this.listEl.createEl('div', { cls: 'ranger-empty', text: '(empty)' });
      this.renderPreview();
      return;
    }

    this.entries.forEach((entry, idx) => {
      const isFolder = entry instanceof TFolder;
      const item = this.listEl.createEl('div', { cls: 'ranger-item' });
      if (idx === this.selectedIndex) item.addClass('is-selected');

      const icon = item.createEl('span', { cls: 'ranger-icon', text: isFolder ? '📁' : '📄' });
      icon.setAttr('aria-hidden', 'true');
      const nameEl = item.createEl('span', { cls: 'ranger-name' });
      nameEl.innerHTML = this.renderNameWithHighlight(entry.name, this.searchQuery);

      // Mouse support (optional)
      item.addEventListener('mousemove', () => {
        if (this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          this.renderSelectionOnly();
          this.renderPreview();
        }
      });
      item.addEventListener('dblclick', () => {
        this.selectedIndex = idx;
        this.activate();
      });
    });

    this.renderPreview();
  }

  renderSelectionOnly() {
    // Update CSS class only to avoid full rerender flicker
    const nodes = this.listEl.querySelectorAll('.ranger-item');
    nodes.forEach((n, i) => {
      if (i === this.selectedIndex) n.addClass('is-selected');
      else n.removeClass('is-selected');
    });
  }

  move(delta) {
    if (!this.entries.length) return;
    this.selectedIndex = (this.selectedIndex + delta + this.entries.length) % this.entries.length;
    this.renderSelectionOnly();
    // Keep selected item in view
    const node = this.listEl.querySelectorAll('.ranger-item')[this.selectedIndex];
    if (node) node.scrollIntoView({ block: 'nearest' });
    this.renderPreview();
  }

  up() {
    const parent = this.currentFolder.parent;
    if (parent && parent instanceof TFolder) {
      const prev = this.currentFolder;
      this.currentFolder = parent;
      // Set selection to previous folder position when possible
      const idx = this.getFolderEntries(parent).findIndex((c) => c.path === prev.path);
      this.selectedIndex = idx >= 0 ? idx : 0;
      this.render();
    }
  }

  activate() {
    if (!this.entries.length) return;
    const entry = this.entries[this.selectedIndex];
    if (entry instanceof TFolder) {
      this.currentFolder = entry;
      this.selectedIndex = 0;
      // Clear search on folder change
      if (this.searchActive) this.exitSearchMode(false);
      this.render();
    } else if (entry instanceof TFile) {
      // Open file in this leaf (replaces the view)
      this.leaf.openFile(entry);
    }
  }

  closeView() {
    if (this.prevFilePath) {
      const prev = this.app.vault.getAbstractFileByPath(this.prevFilePath);
      if (prev instanceof TFile) {
        this.leaf.openFile(prev);
        return;
      }
    }
    // Otherwise do nothing
  }

  // --- Search ---
  enterSearchMode() {
    this.searchActive = true;
    this.searchWrapEl.removeClass('is-hidden');
    this.searchInputEl.value = this.searchQuery || '';
    this.searchInputEl.focus();
    this.applySearchFilter();
  }

  exitSearchMode(rerender = true, clear = true) {
    // Persist last search query for n/N cycling
    this.lastSearchQuery = (this.searchInputEl.value || '').trim() || this.lastSearchQuery || '';
    this.searchActive = false;
    if (clear) {
      this.searchQuery = '';
      this.searchInputEl.value = '';
    } else {
      this.searchQuery = (this.searchInputEl.value || '').trim();
    }
    this.searchWrapEl.addClass('is-hidden');
    if (this.listEl) this.listEl.focus({ preventScroll: true });
    if (rerender) this.render();
  }

  applySearchFilter() {
    this.searchQuery = (this.searchInputEl.value || '').trim();
    if (this.searchQuery) this.lastSearchQuery = this.searchQuery;
    const prevSelected = this.entries[this.selectedIndex]?.path;
    this.entries = this.searchQuery ? this.filterEntries(this.searchQuery) : this.allEntries.slice();
    // Preserve selection when possible
    if (prevSelected) {
      const idx = this.entries.findIndex(e => e.path === prevSelected);
      this.selectedIndex = idx >= 0 ? idx : 0;
    } else {
      this.selectedIndex = 0;
    }
    // Re-render list based on filtered entries
    // Don’t change folder path text
    this.listEl.empty();
    if (this.entries.length === 0) {
      this.listEl.createEl('div', { cls: 'ranger-empty', text: '(no matches)' });
      this.previewEl.empty();
      this.detailsEl.empty();
      return;
    }
    this.entries.forEach((entry, idx) => {
      const isFolder = entry instanceof TFolder;
      const item = this.listEl.createEl('div', { cls: 'ranger-item' });
      if (idx === this.selectedIndex) item.addClass('is-selected');
      item.createEl('span', { cls: 'ranger-icon', text: isFolder ? '📁' : '📄' });
      const nameEl = item.createEl('span', { cls: 'ranger-name' });
      nameEl.innerHTML = this.renderNameWithHighlight(entry.name, this.searchQuery);
      item.addEventListener('mousemove', () => {
        if (this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          this.renderSelectionOnly();
          this.renderPreview();
        }
      });
      item.addEventListener('dblclick', () => {
        this.selectedIndex = idx;
        this.activate();
      });
    });
    this.renderPreview();
  }

  filterEntries(query) {
    const q = query.toLowerCase();
    return this.allEntries.filter((e) => e.name.toLowerCase().includes(q));
  }

  // Render a file/folder name with matched segments highlighted
  renderNameWithHighlight(name, query) {
    if (!query) return this.escapeHtml(name);
    const q = query.toLowerCase();
    const n = name;
    const lower = n.toLowerCase();
    let i = 0;
    let html = '';
    while (true) {
      const idx = lower.indexOf(q, i);
      if (idx === -1) {
        html += this.escapeHtml(n.slice(i));
        break;
      }
      if (idx > i) html += this.escapeHtml(n.slice(i, idx));
      html += '<span class="ranger-match">' + this.escapeHtml(n.slice(idx, idx + q.length)) + '</span>';
      i = idx + q.length;
    }
    return html;
  }

  escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Jump handlers
  handleG() {
    if (this._gTimer) { // second 'g'
      window.clearTimeout(this._gTimer);
      this._gTimer = null;
      this.jumpTop();
      return;
    }
    this._gTimer = window.setTimeout(() => { this._gTimer = null; }, 400);
  }

  jumpTop() {
    if (!this.entries.length) return;
    this.selectedIndex = 0;
    this.renderSelectionOnly();
    const node = this.listEl.querySelectorAll('.ranger-item')[this.selectedIndex];
    if (node) node.scrollIntoView({ block: 'nearest' });
    this.renderPreview();
  }

  jumpBottom() {
    if (!this.entries.length) return;
    this.selectedIndex = this.entries.length - 1;
    this.renderSelectionOnly();
    const node = this.listEl.querySelectorAll('.ranger-item')[this.selectedIndex];
    if (node) node.scrollIntoView({ block: 'nearest' });
    this.renderPreview();
  }

  cycleSearch(step) {
    const query = (this.searchInputEl.value || '').trim() || this.lastSearchQuery || '';
    if (this.searchQuery) {
      // When filtering, just cycle within the filtered list
      if (!this.entries.length) return;
      this.selectedIndex = (this.selectedIndex + step + this.entries.length) % this.entries.length;
      this.renderSelectionOnly();
      const node = this.listEl.querySelectorAll('.ranger-item')[this.selectedIndex];
      if (node) node.scrollIntoView({ block: 'nearest' });
      this.renderPreview();
      return;
    }
    if (!query) return;
    // When not filtering, cycle among matches in the full list
    const matches = this.allEntries
      .map((e, i) => ({ e, i }))
      .filter(x => x.e.name.toLowerCase().includes(query.toLowerCase()));
    if (!matches.length) return;
    const curEntry = this.entries[this.selectedIndex];
    const curIndexInAll = curEntry ? this.allEntries.findIndex(e => e.path === curEntry.path) : -1;
    let pos = matches.findIndex(x => x.i === curIndexInAll);
    if (pos === -1) pos = step > 0 ? -1 : 0;
    pos = (pos + step + matches.length) % matches.length;
    const targetAllIndex = matches[pos].i;
    const idxInEntries = this.entries.findIndex(e => e.path === this.allEntries[targetAllIndex].path);
    if (idxInEntries >= 0) {
      this.selectedIndex = idxInEntries;
      this.renderSelectionOnly();
      const node = this.listEl.querySelectorAll('.ranger-item')[this.selectedIndex];
      if (node) node.scrollIntoView({ block: 'nearest' });
      this.renderPreview();
    }
  }
  // --- Preview & details ---
  async renderPreview() {
    this.detailsEl.empty();
    this.previewEl.empty();
    if (!this.entries.length) return;

    const entry = this.entries[this.selectedIndex];
    const isFolder = entry instanceof TFolder;

    // Details
    const title = this.detailsEl.createEl('div', { cls: 'ranger-details-title', text: entry.name });
    title.setAttr('title', entry.path);
    const meta = this.detailsEl.createEl('div', { cls: 'ranger-details-meta' });
    if (isFolder) {
      const kids = this.getFolderEntries(entry);
      const dcount = kids.filter(k => k instanceof TFolder).length;
      const fcount = kids.length - dcount;
      meta.setText(`${entry.path} • ${dcount} folders, ${fcount} files`);
      return; // nothing to render as markdown
    }

    // File details
    const size = entry.stat?.size ?? 0;
    const mtime = entry.stat?.mtime ? new Date(entry.stat.mtime) : null;
    const parts = [entry.path, size ? `${size} bytes` : null, mtime ? `modified ${mtime.toLocaleString()}` : null].filter(Boolean);
    meta.setText(parts.join(' • '));

    // Render preview (truncate large files)
    const token = ++this.previewToken;
    try {
      let text = await this.app.vault.read(entry);
      if (text && text.length > 50000) {
        text = text.slice(0, 50000) + "\n\n… (truncated)";
      }
      if (token !== this.previewToken) return; // outdated
      await MarkdownRenderer.renderMarkdown(text, this.previewEl, entry.path, this);
      this.previewEl.addClass('markdown-preview-view');
    } catch (e) {
      if (token !== this.previewToken) return;
      this.previewEl.createEl('div', { cls: 'ranger-preview-error', text: 'Unable to render preview.' });
    }
  }
}

class RangerFmPlugin extends Plugin {
  async onload() {
    this.registerView(
      VIEW_TYPE_RANGER,
      (leaf) => new RangerView(leaf, this.app)
    );

    this.addCommand({
      id: 'open-ranger-fm',
      name: 'Open Ranger FM',
      hotkeys: [{ modifiers: [], key: '-' }],
      callback: async () => {
        const leaf = this.app.workspace.getLeaf(false);
        const activeFile = this.app.workspace.getActiveFile();
        const startFolder = activeFile?.parent || this.app.vault.getRoot();
        await leaf.setViewState({
          type: VIEW_TYPE_RANGER,
          active: true,
          state: { startFolder: startFolder.path, selectFile: activeFile?.path || null, prevFile: activeFile?.path || null },
        });
        this.app.workspace.revealLeaf(leaf);
      },
    });
  }
}

module.exports = RangerFmPlugin;
