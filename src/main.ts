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

import { Plugin, ItemView, TFile, TFolder, MarkdownRenderer, setIcon, Menu, PluginSettingTab, Setting } from 'obsidian';

// Helper: choose an icon name for a file based on extension
function iconForFileName(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  // markdown and notes
  if (ext === 'md' || ext === 'txt' || ext === 'rtf' || ext === 'org') return 'file-text';
  // images
  if (['png','jpg','jpeg','gif','svg','webp','bmp','tiff','tif','ico','avif','heic'].includes(ext)) return 'image';
  // audio
  if (['mp3','wav','m4a','flac','ogg','oga','aac','aiff','alac','opus'].includes(ext)) return 'music';
  // video
  if (['mp4','mkv','webm','mov','avi','m4v','wmv'].includes(ext)) return 'video';
  // spreadsheets / data
  if (['csv','tsv','xls','xlsx','ods'].includes(ext)) return 'table';
  // presentations / docs
  if (['pdf','ppt','pptx','odp'].includes(ext)) return 'file-text';
  // code
  if (['js','ts','tsx','jsx','json','yaml','yml','toml','xml','html','css','scss','sass','less','py','rb','java','kt','c','cc','cpp','h','hpp','rs','go','sh','zsh','fish','lua','php','pl','r','swift'].includes(ext)) return 'code';
  // archives & packages
  if (['zip','rar','7z','tar','gz','bz2','xz','tgz'].includes(ext)) return 'package';
  return 'file';
}

function setEntryIcon(el, entry) {
  if (entry instanceof TFolder) {
    setIcon(el, 'folder');
  } else if (entry instanceof TFile) {
    setIcon(el, iconForFileName(entry.name));
  } else {
    setIcon(el, 'file');
  }
}

const VIEW_TYPE_RANGER = 'ranger-fm-view';

class RangerView extends ItemView {
  constructor(leaf, app, plugin) {
    super(leaf);
    this.app = app;
    this.plugin = plugin;
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
    this.showPreview = true;
    this.showDetails = true;
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
    // adopt defaults from plugin settings if available
    const s = this.plugin?.settings;
    if (s) {
      this.showPreview = !!s.showPreview;
      this.showDetails = !!s.showDetails;
    }
    const fileFromPath = (p) => p ? this.app.vault.getAbstractFileByPath(p) : null;
    const startFile = fileFromPath(this.selectFilePath);
    const start = startFile || fileFromPath(this.startFolderPath);
    if (start instanceof TFolder) this.currentFolder = start;
    else if (start instanceof TFile) { this.currentFolder = start.parent || this.app.vault.getRoot(); this.preselectPath = start.path; }
    else this.currentFolder = this.app.vault.getRoot();

    const root = this.contentEl;
    root.empty();
    const host = root.createDiv({ cls: 'ranger-fm', attr: { tabindex: '0' } });
    this.hostEl = host;

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
    if (!this.showDetails) this.detailsEl.addClass('is-hidden');
    if (!this.showPreview) {
      this.previewEl.addClass('is-hidden');
      this.hostEl.addClass('single');
    }

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

      if (["j","k","h","l","/","Enter","Escape","q","g","G","n","N","z"].includes(k) || (evt.ctrlKey && (k === 'd' || k === 'u'))) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      if (k === 'Escape' && this.searchActive) {
        this.exitSearchMode(true, true);
        return;
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
      else if (k === 'z') this.handleZ();
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
    // Update entries and clamp selection (no filtering; quick-select mode)
    this.allEntries = this.getFolderEntries(this.currentFolder);
    this.entries = this.allEntries;
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
      const item = this.listEl.createEl('div', { cls: 'ranger-item' });
      if (idx === this.selectedIndex) item.addClass('is-selected');

      const icon = item.createEl('span', { cls: 'ranger-icon' });
      setEntryIcon(icon, entry);
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

      // Context menu
      item.addEventListener('contextmenu', (evt) => {
        evt.preventDefault();
        this.openContextMenu(evt, entry);
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
    // Quick-select mode: do not filter; highlight matches and jump selection
    this.searchQuery = (this.searchInputEl.value || '').trim();
    if (this.searchQuery) this.lastSearchQuery = this.searchQuery;

    // If current selection doesn't match, move to next match from top
    const query = this.searchQuery.toLowerCase();
    const cur = this.entries[this.selectedIndex];
    const curMatches = query && cur ? cur.name.toLowerCase().includes(query) : false;
    if (query && !curMatches) {
      const next = this.entries.findIndex(e => e.name.toLowerCase().includes(query));
      if (next >= 0) this.selectedIndex = next;
    }

    // Re-render list with highlights (all items remain visible)
    this.listEl.empty();
    if (this.entries.length === 0) {
      this.listEl.createEl('div', { cls: 'ranger-empty', text: '(empty)' });
      this.previewEl.empty();
      this.detailsEl.empty();
      return;
    }
    this.entries.forEach((entry, idx) => {
      const item = this.listEl.createEl('div', { cls: 'ranger-item' });
      if (idx === this.selectedIndex) item.addClass('is-selected');
      const icon = item.createEl('span', { cls: 'ranger-icon' });
      setEntryIcon(icon, entry);
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
      item.addEventListener('contextmenu', (evt) => {
        evt.preventDefault();
        this.openContextMenu(evt, entry);
      });
    });
    // Keep selected item in view
    const node = this.listEl.querySelectorAll('.ranger-item')[this.selectedIndex];
    if (node) node.scrollIntoView({ block: 'nearest' });
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

  handleZ() {
    if (this._zTimer) { // second key in chord
      window.clearTimeout(this._zTimer);
      this._zTimer = null;
      return;
    }
    this._zTimer = window.setTimeout(() => { this._zTimer = null; }, 400);
    // Listen for the next keypress on the host to detect 'p'
    const onKey = (evt) => {
      if (!this._zTimer) return;
      const k = evt.key;
      if (k === 'p' || k === 'P') {
        evt.preventDefault();
        evt.stopPropagation();
        this.togglePreviewPane();
      }
      window.clearTimeout(this._zTimer);
      this._zTimer = null;
      this.contentEl.removeEventListener('keydown', onKey, true);
    };
    this.contentEl.addEventListener('keydown', onKey, true);
  }

  togglePreviewPane() {
    this.showPreview = !this.showPreview;
    if (this.previewEl) {
      if (this.showPreview) this.previewEl.removeClass('is-hidden');
      else this.previewEl.addClass('is-hidden');
    }
    if (this.hostEl) {
      if (this.showPreview) this.hostEl.removeClass('single');
      else this.hostEl.addClass('single');
    }
    this.renderPreview();
  }

  openContextMenu(evt, entry) {
    const menu = new Menu(this.app);
    if (entry instanceof TFile) {
      menu.addItem((i) => i.setTitle('Open').setIcon('file').onClick(() => {
        this.leaf.openFile(entry);
      }));
      menu.addItem((i) => i.setTitle('Open in new pane').setIcon('split').onClick(async () => {
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.openFile(entry);
        this.app.workspace.revealLeaf(leaf);
      }));
      menu.addItem((i) => i.setTitle('Copy path').setIcon('copy').onClick(async () => {
        try { await navigator.clipboard.writeText(entry.path); } catch {}
      }));
      menu.addItem((i) => i.setTitle('Delete').setIcon('trash').onClick(async () => {
        if (confirm(`Delete ${entry.path}?`)) await this.app.vault.delete(entry);
      }));
    } else if (entry instanceof TFolder) {
      menu.addItem((i) => i.setTitle('Enter folder').setIcon('folder').onClick(() => {
        const idx = this.entries.findIndex(e => e.path === entry.path);
        if (idx >= 0) { this.selectedIndex = idx; this.activate(); }
      }));
      menu.addItem((i) => i.setTitle('Copy path').setIcon('copy').onClick(async () => {
        try { await navigator.clipboard.writeText(entry.path); } catch {}
      }));
    }
    menu.showAtMouseEvent(evt);
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
    const query = (this.searchInputEl.value || '').trim() || this.searchQuery || this.lastSearchQuery || '';
    if (!query) return;
    // Cycle among matches in the full list
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
    if (this.showDetails) {
      const title = this.detailsEl.createEl('div', { cls: 'ranger-details-title', text: entry.name });
      title.setAttr('title', entry.path);
    }
    const meta = this.showDetails ? this.detailsEl.createEl('div', { cls: 'ranger-details-meta' }) : null;
    if (isFolder) {
      const kids = this.getFolderEntries(entry);
      const dcount = kids.filter(k => k instanceof TFolder).length;
      const fcount = kids.length - dcount;
      if (meta) meta.setText(`${entry.path} • ${dcount} folders, ${fcount} files`);
      return; // nothing to render as markdown
    }

    // File details
    const size = entry.stat?.size ?? 0;
    const mtime = entry.stat?.mtime ? new Date(entry.stat.mtime) : null;
    if (meta) {
      const parts = [entry.path, size ? `${size} bytes` : null, mtime ? `modified ${mtime.toLocaleString()}` : null].filter(Boolean);
      meta.setText(parts.join(' • '));
    }

    // Render preview (truncate large files)
    const token = ++this.previewToken;
    if (!this.showPreview) return;
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

const DEFAULT_SETTINGS = {
  showPreview: true,
  showDetails: true,
};

class RangerFmPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_RANGER,
      (leaf) => new RangerView(leaf, this.app, this)
    );

    this.addSettingTab(new RangerSettingTab(this.app, this));

    this.addCommand({
      id: 'open-ranger-fm',
      name: 'Open Ranger FM',
      hotkeys: [{ modifiers: [], key: '-' }],
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        const leaf = this.app.workspace.getLeaf(activeFile ? false : true);
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

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class RangerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h3', { text: 'Ranger FM Settings' });

    new Setting(containerEl)
      .setName('Show preview by default')
      .setDesc('Show the markdown preview panel on the right')
      .addToggle((t) => t.setValue(!!this.plugin.settings.showPreview).onChange(async (v) => {
        this.plugin.settings.showPreview = v;
        await this.plugin.saveSettings();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RANGER);
        for (const leaf of leaves) {
          const view = leaf.view;
          view.showPreview = v;
          if (view.previewEl) {
            if (v) view.previewEl.removeClass('is-hidden'); else view.previewEl.addClass('is-hidden');
            view.renderPreview();
          }
          if (view.hostEl) {
            if (v) view.hostEl.removeClass('single'); else view.hostEl.addClass('single');
          }
        }
      }));

    new Setting(containerEl)
      .setName('Show details by default')
      .setDesc('Show the file/folder details panel above the preview')
      .addToggle((t) => t.setValue(!!this.plugin.settings.showDetails).onChange(async (v) => {
        this.plugin.settings.showDetails = v;
        await this.plugin.saveSettings();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RANGER);
        for (const leaf of leaves) {
          const view = leaf.view;
          view.showDetails = v;
          if (view.detailsEl) {
            if (v) view.detailsEl.removeClass('is-hidden'); else view.detailsEl.addClass('is-hidden');
            view.renderPreview();
          }
        }
      }));
  }
}

export default RangerFmPlugin;
