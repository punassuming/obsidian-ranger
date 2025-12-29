/*
  File Nav - Ranger for Obsidian - File navigator with keyboard navigation
  
  Features:
    - Vim-style hjkl navigation
    - Quick search with / key (highlighted matches)
    - Filter list with f key
    - Real-time markdown preview pane
    - Image preview support
    - File details with metadata
    - File operations: copy, move, delete, rename, duplicate
    - Quick create notes and folders
    - Context menus for file operations
    - Customizable preview and details panels
  
  Key Bindings:
    j/k: move selection down/up
    l / Enter: open file or enter folder
    h: go up to parent folder
    /: toggle search bar (type to highlight)
    f: filter list to matching entries
    n / N: cycle next/prev search match
    Ctrl+d / Ctrl+u: move down/up by 10 items
    gg / G: jump to top/bottom
    zd: toggle preview pane
    zp: toggle rendered/text preview
    q or Esc: exit search or close view
    a / A: new note / new folder
    r: rename selected item
    D: duplicate selected item
    yy: copy file/folder
    dd: cut (move) file/folder
    p: paste
  
  Command: Open File Nav - Ranger for Obsidian (default hotkey '-')
*/

const { Plugin, ItemView, TFile, TFolder, MarkdownRenderer, setIcon, Menu, PluginSettingTab, Setting, Notice } = require('obsidian');

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

const VIEW_TYPE_FM = 'file-nav-ranger-view';

// Image file extensions for preview
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];

class FmView extends ItemView {
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
    this.filterQuery = '';
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
    this.showHiddenFiles = true;
    this.showHiddenFolders = true;
    this.showFileExtensions = true;
    this.sortFoldersFirst = true;
    this.previewMode = 'rendered';
    // Clipboard for copy/move operations
    this.clipboard = null;
    this.clipboardOperation = null; // 'copy' or 'cut'
    // History: remember last selected file in each folder
    this.folderHistory = new Map(); // folderPath -> entryPath
    // Search/filter mode tracking
    this.searchMode = null; // 'search' or 'filter'
    this.filterActive = false;
  }

  getViewType() { return VIEW_TYPE_FM; }
  getDisplayText() { return this.formatWindowTitle(this.getWindowTitlePath()); }

  formatWindowTitle(path) {
    return `file: ${path || '/'}`;
  }

  getWindowTitlePath() {
    const entry = this.entries?.[this.selectedIndex];
    return entry?.path || this.currentFolder?.path || '/';
  }

  updateWindowTitle() {
    const title = this.formatWindowTitle(this.getWindowTitlePath());
    if (this.leaf?.setTitle) {
      this.leaf.setTitle(title);
    } else if (this.setTitle) {
      this.setTitle(title);
    } else if (this.leaf?.tabHeaderInnerTitleEl) {
      this.leaf.tabHeaderInnerTitleEl.textContent = title;
    }
  }

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
      this.showHiddenFiles = !!s.showHiddenFiles;
      this.showHiddenFolders = !!s.showHiddenFolders;
      this.showFileExtensions = !!s.showFileExtensions;
      this.sortFoldersFirst = !!s.sortFoldersFirst;
    }
    const fileFromPath = (p) => p ? this.app.vault.getAbstractFileByPath(p) : null;
    const startFile = fileFromPath(this.selectFilePath);
    const start = startFile || fileFromPath(this.startFolderPath);
    if (start instanceof TFolder) this.currentFolder = start;
    else if (start instanceof TFile) { this.currentFolder = start.parent || this.app.vault.getRoot(); this.preselectPath = start.path; }
    else this.currentFolder = this.app.vault.getRoot();

    const root = this.contentEl;
    root.empty();
    const host = root.createDiv({ cls: 'fm-fm', attr: { tabindex: '0' } });
    this.hostEl = host;

    // Path bar
    this.pathEl = host.createDiv({ cls: 'fm-path' });
    // Search bar
    this.searchWrapEl = host.createDiv({ cls: 'fm-search is-hidden' });
    this.searchInputEl = this.searchWrapEl.createEl('input', { type: 'text', placeholder: 'Search (Esc to exit)...' });
    this.registerDomEvent(this.searchInputEl, 'input', () => this.applySearchFilter());
    this.registerDomEvent(this.searchInputEl, 'keydown', (evt) => {
      const k = evt.key;
      if (k === '/' && this.searchMode === 'search') {
        evt.preventDefault();
        evt.stopPropagation();
        this.clearSearchInput();
        return;
      }
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
    this.layoutEl = host.createDiv({ cls: 'fm-layout' });
    this.leftEl = this.layoutEl.createDiv({ cls: 'fm-left' });
    this.listEl = this.leftEl.createDiv({ cls: 'fm-list', attr: { tabindex: '0' } });
    this.rightEl = this.layoutEl.createDiv({ cls: 'fm-right' });
    this.detailsEl = this.rightEl.createDiv({ cls: 'fm-details' });
    this.previewEl = this.rightEl.createDiv({ cls: 'fm-preview' });
    if (!this.showDetails) this.detailsEl.addClass('is-hidden');
    if (!this.showPreview) {
      this.previewEl.addClass('is-hidden');
      this.hostEl.addClass('single');
    }

    // Status bar with keyboard hints
    this.statusEl = host.createDiv({ cls: 'fm-status' });
    this.renderStatusBar();

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

      if (["j","k","h","l","/","f","a","A","r","D","Enter","Escape","q","g","G","n","N","z","y","d","p"].includes(k) || (evt.ctrlKey && (k === 'd' || k === 'u'))) {
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
      else if (k === '/') {
        if (this.searchActive && this.searchMode === 'search') {
          this.clearSearchInput();
        } else {
          this.enterSearchMode('search');
        }
      }
      else if (k === 'f') this.enterSearchMode('filter');
      else if (k === 'g') this.handleG();
      else if (k === 'G' || (k === 'g' && evt.shiftKey)) this.jumpBottom();
      else if (k === 'n') this.cycleSearch(1);
      else if (k === 'N') this.cycleSearch(-1);
      else if (k === 'Escape' || k === 'q') this.closeView();
      else if (k === 'z') this.handleZ();
      else if (k === 'y') this.handleY();
      else if (k === 'd') this.handleD();
      else if (k === 'p') this.handleP();
      else if (k === 'a') this.createNewNote();
      else if (k === 'A') this.createNewFolder();
      else if (k === 'r') this.renameEntry();
      else if (k === 'D') this.duplicateEntry();
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
      if (child instanceof TFolder) {
        if (!this.showHiddenFolders && child.name.startsWith('.')) continue;
        dirs.push(child);
      } else if (child instanceof TFile) {
        if (!this.showHiddenFiles && child.name.startsWith('.')) continue;
        files.push(child);
      }
    }
    if (this.sortFoldersFirst) {
      dirs.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));
      return [...dirs, ...files];
    }
    return [...dirs, ...files].sort((a, b) => a.name.localeCompare(b.name));
  }

  getEntryLabel(entry) {
    if (entry instanceof TFile && !this.showFileExtensions) {
      return entry.basename;
    }
    return entry.name;
  }

  getEntrySearchName(entry) {
    return this.getEntryLabel(entry);
  }

  render() {
    // Update entries and clamp selection (no filtering; quick-select mode)
    this.allEntries = this.getFolderEntries(this.currentFolder);
    this.entries = this.allEntries;
    this.updateEntriesForFilter();
    // honor a pending file selection
    if (this.preselectPath) {
      const i = this.entries.findIndex(e => e.path === this.preselectPath);
      if (i >= 0) this.selectedIndex = i;
      this.preselectPath = null;
    } else {
      // Check folder history to restore previous selection
      const folderPath = this.currentFolder.path;
      const rememberedPath = this.folderHistory.get(folderPath);
      if (rememberedPath) {
        const i = this.entries.findIndex(e => e.path === rememberedPath);
        if (i >= 0) this.selectedIndex = i;
      }
    }
    if (this.selectedIndex >= this.entries.length) this.selectedIndex = Math.max(0, this.entries.length - 1);
    if (this.selectedIndex < 0) this.selectedIndex = 0;

    // Render path
    const path = this.currentFolder.path === '/' ? '/' : this.currentFolder.path;
    this.pathEl.setText(path);

    this.renderList();
    
    // Scroll selected item into view
    this.scrollToSelected();
  }

  renderSelectionOnly() {
    // Update CSS class only to avoid full rerender flicker
    const nodes = this.listEl.querySelectorAll('.fm-item');
    nodes.forEach((n, i) => {
      if (i === this.selectedIndex) n.addClass('is-selected');
      else n.removeClass('is-selected');
    });
    this.updateWindowTitle();
  }

  scrollToSelected() {
    // Scroll the selected item into view
    const nodes = this.listEl.querySelectorAll('.fm-item');
    const node = nodes[this.selectedIndex];
    if (node) {
      node.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }

  move(delta) {
    if (!this.entries.length) return;
    this.selectedIndex = (this.selectedIndex + delta + this.entries.length) % this.entries.length;
    this.renderSelectionOnly();
    // Keep selected item in view
    const node = this.listEl.querySelectorAll('.fm-item')[this.selectedIndex];
    if (node) node.scrollIntoView({ block: 'nearest' });
    this.renderPreview();
    // Save current selection to history
    this.saveCurrentSelection();
  }

  saveCurrentSelection() {
    // Save the current selected entry to folder history
    if (this.entries.length > 0 && this.selectedIndex >= 0 && this.selectedIndex < this.entries.length) {
      const folderPath = this.currentFolder.path;
      const selectedEntry = this.entries[this.selectedIndex];
      this.folderHistory.set(folderPath, selectedEntry.path);
    }
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
      // Save current selection before entering folder
      this.saveCurrentSelection();
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
  enterSearchMode(mode) {
    const isRepeat = this.searchActive && this.searchMode === mode;
    this.searchActive = true;
    this.searchMode = mode;
    if (mode === 'filter') {
      this.filterActive = true;
    }
    this.searchWrapEl.removeClass('is-hidden');
    this.searchInputEl.value = mode === 'filter' ? (this.filterQuery || '') : (this.searchQuery || '');
    if (isRepeat) {
      this.clearSearchInput();
      return;
    }
    this.searchInputEl.focus();
    this.applySearchFilter();
  }

  exitSearchMode(rerender = true, clear = true) {
    // Persist last search query for n/N cycling
    const rawValue = (this.searchInputEl.value || '').trim();
    if (this.searchMode === 'search') {
      this.lastSearchQuery = rawValue || this.lastSearchQuery || '';
    }
    this.searchActive = false;
    const mode = this.searchMode;
    this.searchMode = null;
    if (clear) {
      if (mode === 'search') this.searchQuery = '';
      if (mode === 'filter') {
        this.filterQuery = '';
        this.filterActive = false;
      }
      this.searchInputEl.value = '';
    } else {
      if (mode === 'search') this.searchQuery = rawValue;
      if (mode === 'filter') {
        this.filterQuery = rawValue;
        this.filterActive = !!this.filterQuery;
      }
    }
    this.searchWrapEl.addClass('is-hidden');
    if (this.listEl) this.listEl.focus({ preventScroll: true });
    if (rerender) this.render();
  }

  applySearchFilter() {
    // Quick-select mode: do not filter; highlight matches and jump selection
    const query = (this.searchInputEl.value || '').trim();
    const currentPath = this.entries[this.selectedIndex]?.path;
    if (this.searchMode === 'search') {
      this.searchQuery = query;
      if (this.searchQuery) this.lastSearchQuery = this.searchQuery;
    } else if (this.searchMode === 'filter') {
      this.filterQuery = query;
    }
    if (this.searchMode === 'filter') this.filterActive = true;
    this.updateEntriesForFilter();
    if (currentPath) {
      const nextIndex = this.entries.findIndex((entry) => entry.path === currentPath);
      this.selectedIndex = nextIndex >= 0 ? nextIndex : 0;
    }

    if (this.searchMode === 'search') {
      // If current selection doesn't match, move to next match from top
      const queryLower = this.searchQuery.toLowerCase();
      const cur = this.entries[this.selectedIndex];
      const curMatches = queryLower && cur ? this.getEntrySearchName(cur).toLowerCase().includes(queryLower) : false;
      if (queryLower && !curMatches) {
        const next = this.entries.findIndex(e => this.getEntrySearchName(e).toLowerCase().includes(queryLower));
        if (next >= 0) this.selectedIndex = next;
      }
    }

    this.renderList();
    this.scrollToSelected();
  }

  filterEntries(query) {
    const q = query.toLowerCase();
    return this.allEntries.filter((e) => this.getEntrySearchName(e).toLowerCase().includes(q));
  }

  updateEntriesForFilter() {
    if (this.filterActive && this.filterQuery) {
      this.entries = this.filterEntries(this.filterQuery);
    } else {
      this.entries = this.allEntries;
    }
    if (this.selectedIndex >= this.entries.length) {
      this.selectedIndex = Math.max(0, this.entries.length - 1);
    }
  }

  getActiveHighlightQuery() {
    if (this.searchMode === 'filter') return this.filterQuery;
    if (this.searchMode === 'search') return this.searchQuery;
    return this.searchQuery || (this.filterActive ? this.filterQuery : '');
  }

  renderList() {
    this.listEl.empty();
    if (this.entries.length === 0) {
      this.listEl.createEl('div', { cls: 'fm-empty', text: '(empty)' });
      this.previewEl.empty();
      this.detailsEl.empty();
      this.updateWindowTitle();
      return;
    }
    const highlightQuery = this.getActiveHighlightQuery();
    this.entries.forEach((entry, idx) => {
      const item = this.listEl.createEl('div', { cls: 'fm-item' });
      if (idx === this.selectedIndex) item.addClass('is-selected');

      const icon = item.createEl('span', { cls: 'fm-icon' });
      setEntryIcon(icon, entry);
      icon.setAttr('aria-hidden', 'true');
      const nameEl = item.createEl('span', { cls: 'fm-name' });
      nameEl.innerHTML = this.renderNameWithHighlight(this.getEntryLabel(entry), highlightQuery);

      // Mouse support - click to select
      item.addEventListener('click', () => {
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
    this.updateWindowTitle();
  }

  clearSearchInput() {
    if (this.searchMode === 'filter') {
      this.filterQuery = '';
    } else {
      this.searchQuery = '';
    }
    this.searchInputEl.value = '';
    this.searchInputEl.focus();
    this.applySearchFilter();
  }

  /**
   * Renders a file/folder name with search query matches highlighted.
   * Escapes HTML to prevent XSS, then wraps matching segments in <span> tags.
   * 
   * @param {string} name - The file or folder name to render
   * @param {string} query - The search query to highlight (case-insensitive)
   * @returns {string} HTML string with highlighted matches
   */
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
    // Listen for the next keypress on the host to detect 'p' or 'd'
    const onKey = (evt) => {
      if (!this._zTimer) return;
      const k = evt.key;
      if (k === 'p' || k === 'P') {
        evt.preventDefault();
        evt.stopPropagation();
        this.togglePreviewMode();
      } else if (k === 'd' || k === 'D') {
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

  handleY() {
    // yy: copy file/folder
    if (this._yTimer) { // second 'y'
      window.clearTimeout(this._yTimer);
      this._yTimer = null;
      this.copyEntry();
      return;
    }
    this._yTimer = window.setTimeout(() => { this._yTimer = null; }, 400);
  }

  handleD() {
    // dd: cut (move) file/folder
    if (this._dTimer) { // second 'd'
      window.clearTimeout(this._dTimer);
      this._dTimer = null;
      this.cutEntry();
      return;
    }
    this._dTimer = window.setTimeout(() => { this._dTimer = null; }, 400);
  }

  handleP() {
    // p: paste
    this.pasteEntry();
  }

  copyEntry() {
    if (!this.entries.length) return;
    const entry = this.entries[this.selectedIndex];
    this.clipboard = entry;
    this.clipboardOperation = 'copy';
    // Visual feedback
    new Notice(`Copied: ${entry.name}`);
  }

  cutEntry() {
    if (!this.entries.length) return;
    const entry = this.entries[this.selectedIndex];
    this.clipboard = entry;
    this.clipboardOperation = 'cut';
    // Visual feedback
    new Notice(`Cut: ${entry.name} (ready to move)`);
  }

  async pasteEntry() {
    if (!this.clipboard) {
      new Notice('Nothing to paste');
      return;
    }

    const source = this.clipboard;
    const destFolder = this.currentFolder;

    // Use helper to check if we're pasting in the same location
    if (this.isSameFolderCopy(source, destFolder)) {
      // Need to create a copy with a different name
      await this.copyFileWithNewName(source, destFolder);
    } else if (source instanceof TFolder && source.path === destFolder.path) {
      new Notice('Cannot paste folder into itself');
      return;
    } else if (this.clipboardOperation === 'copy') {
      await this.copyToFolder(source, destFolder);
    } else if (this.clipboardOperation === 'cut') {
      await this.moveToFolder(source, destFolder);
      this.clipboard = null;
      this.clipboardOperation = null;
    }

    this.render();
  }

  isSameFolderCopy(source, destFolder) {
    return source instanceof TFile && 
           source.parent?.path === destFolder.path && 
           this.clipboardOperation === 'copy';
  }

  async copyFileWithNewName(file, destFolder) {
    const ext = file.extension;
    const baseName = file.basename;
    let counter = 1;
    const extSuffix = ext ? `.${ext}` : '';
    let newName = `${baseName} copy${extSuffix}`;
    let newPath = destFolder.path === '/' ? newName : `${destFolder.path}/${newName}`;

    // Find available name (with safety limit)
    const MAX_ATTEMPTS = 1000;
    while (this.app.vault.getAbstractFileByPath(newPath) && counter < MAX_ATTEMPTS) {
      counter++;
      newName = `${baseName} copy ${counter}${extSuffix}`;
      newPath = destFolder.path === '/' ? newName : `${destFolder.path}/${newName}`;
    }

    if (counter >= MAX_ATTEMPTS) {
      new Notice('Failed to find available filename');
      return;
    }

    try {
      const content = await this.app.vault.read(file);
      await this.app.vault.create(newPath, content);
      new Notice(`Copied to: ${newName}`);
    } catch (err) {
      new Notice(`Failed to copy: ${err.message}`);
    }
  }

  async copyToFolder(source, destFolder) {
    const newPath = destFolder.path === '/' ? source.name : `${destFolder.path}/${source.name}`;
    
    // Check if destination already exists
    if (this.app.vault.getAbstractFileByPath(newPath)) {
      new Notice(`Already exists: ${source.name}`);
      return;
    }

    try {
      if (source instanceof TFile) {
        const content = await this.app.vault.read(source);
        await this.app.vault.create(newPath, content);
        new Notice(`Copied: ${source.name}`);
      } else if (source instanceof TFolder) {
        await this.copyFolderRecursive(source, newPath);
        new Notice(`Copied folder: ${source.name}`);
      }
    } catch (err) {
      new Notice(`Failed to copy: ${err.message}`);
    }
  }

  async copyFolderRecursive(sourceFolder, destPath) {
    // Create destination folder
    await this.app.vault.createFolder(destPath);

    // Copy all children
    for (const child of sourceFolder.children) {
      const childDestPath = `${destPath}/${child.name}`;
      if (child instanceof TFile) {
        const content = await this.app.vault.read(child);
        await this.app.vault.create(childDestPath, content);
      } else if (child instanceof TFolder) {
        await this.copyFolderRecursive(child, childDestPath);
      }
    }
  }

  async moveToFolder(source, destFolder) {
    const newPath = destFolder.path === '/' ? source.name : `${destFolder.path}/${source.name}`;
    
    // Check if destination already exists
    if (this.app.vault.getAbstractFileByPath(newPath)) {
      new Notice(`Already exists: ${source.name}`);
      return;
    }

    try {
      await this.app.vault.rename(source, newPath);
      new Notice(`Moved: ${source.name}`);
    } catch (err) {
      new Notice(`Failed to move: ${err.message}`);
    }
  }

  buildChildPath(parentPath, name) {
    return parentPath === '/' ? name : `${parentPath}/${name}`;
  }

  normalizeNoteName(name) {
    const trimmed = name.trim().replace(/^\/+/, '');
    if (!trimmed) return '';
    if (!/\.[^/.]+$/.test(trimmed)) return `${trimmed}.md`;
    return trimmed;
  }

  async createNewNote() {
    const rawName = prompt('New note name');
    const noteName = this.normalizeNoteName(rawName || '');
    if (!noteName) return;
    const path = this.buildChildPath(this.currentFolder.path, noteName);
    if (this.app.vault.getAbstractFileByPath(path)) {
      new Notice(`Already exists: ${noteName}`);
      return;
    }
    try {
      const file = await this.app.vault.create(path, '');
      this.preselectPath = file.path;
      this.render();
      new Notice(`Created note: ${file.name}`);
    } catch (err) {
      new Notice(`Failed to create note: ${err.message}`);
    }
  }

  async createNewFolder() {
    const rawName = prompt('New folder name');
    const folderName = (rawName || '').trim().replace(/^\/+/, '');
    if (!folderName) return;
    const path = this.buildChildPath(this.currentFolder.path, folderName);
    if (this.app.vault.getAbstractFileByPath(path)) {
      new Notice(`Already exists: ${folderName}`);
      return;
    }
    try {
      await this.app.vault.createFolder(path);
      this.preselectPath = path;
      this.render();
      new Notice(`Created folder: ${folderName}`);
    } catch (err) {
      new Notice(`Failed to create folder: ${err.message}`);
    }
  }

  async renameEntry() {
    if (!this.entries.length) return;
    const entry = this.entries[this.selectedIndex];
    const rawName = prompt('Rename to', entry.name);
    const newName = (rawName || '').trim();
    if (!newName || newName === entry.name) return;
    const parentPath = entry.parent?.path || '/';
    const newPath = this.buildChildPath(parentPath, newName);
    if (this.app.vault.getAbstractFileByPath(newPath)) {
      new Notice(`Already exists: ${newName}`);
      return;
    }
    try {
      await this.app.vault.rename(entry, newPath);
      this.preselectPath = newPath;
      this.render();
      new Notice(`Renamed to: ${newName}`);
    } catch (err) {
      new Notice(`Failed to rename: ${err.message}`);
    }
  }

  async duplicateEntry() {
    if (!this.entries.length) return;
    const entry = this.entries[this.selectedIndex];
    if (entry instanceof TFile) {
      await this.copyFileWithNewName(entry, entry.parent || this.currentFolder);
    } else if (entry instanceof TFolder) {
      await this.copyFolderWithNewName(entry);
    }
    this.render();
  }

  async copyFolderWithNewName(folder) {
    const parentPath = folder.parent?.path || '/';
    let counter = 1;
    let newName = `${folder.name} copy`;
    let newPath = this.buildChildPath(parentPath, newName);
    const MAX_ATTEMPTS = 1000;
    while (this.app.vault.getAbstractFileByPath(newPath) && counter < MAX_ATTEMPTS) {
      counter++;
      newName = `${folder.name} copy ${counter}`;
      newPath = this.buildChildPath(parentPath, newName);
    }
    if (counter >= MAX_ATTEMPTS) {
      new Notice('Failed to find available folder name');
      return;
    }
    try {
      await this.copyFolderRecursive(folder, newPath);
      this.preselectPath = newPath;
      new Notice(`Duplicated folder: ${newName}`);
    } catch (err) {
      new Notice(`Failed to duplicate: ${err.message}`);
    }
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

  togglePreviewMode() {
    this.previewMode = this.previewMode === 'rendered' ? 'text' : 'rendered';
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
      menu.addSeparator();
      menu.addItem((i) => i.setTitle('Rename (r)').setIcon('pencil').onClick(() => {
        this.selectedIndex = this.entries.findIndex(e => e.path === entry.path);
        this.renameEntry();
      }));
      menu.addItem((i) => i.setTitle('Duplicate (D)').setIcon('files').onClick(() => {
        this.selectedIndex = this.entries.findIndex(e => e.path === entry.path);
        this.duplicateEntry();
      }));
      menu.addSeparator();
      menu.addItem((i) => i.setTitle('Copy file (yy)').setIcon('copy').onClick(() => {
        this.selectedIndex = this.entries.findIndex(e => e.path === entry.path);
        this.copyEntry();
      }));
      menu.addItem((i) => i.setTitle('Cut file (dd)').setIcon('scissors').onClick(() => {
        this.selectedIndex = this.entries.findIndex(e => e.path === entry.path);
        this.cutEntry();
      }));
      menu.addSeparator();
      menu.addItem((i) => i.setTitle('Copy path').setIcon('clipboard').onClick(async () => {
        try { await navigator.clipboard.writeText(entry.path); } catch {}
      }));
      menu.addItem((i) => i.setTitle('Delete').setIcon('trash').onClick(async () => {
        if (confirm(`Delete ${entry.path}?`)) {
          await this.app.vault.delete(entry);
          this.render();
        }
      }));
    } else if (entry instanceof TFolder) {
      menu.addItem((i) => i.setTitle('Enter folder').setIcon('folder').onClick(() => {
        const idx = this.entries.findIndex(e => e.path === entry.path);
        if (idx >= 0) { this.selectedIndex = idx; this.activate(); }
      }));
      menu.addSeparator();
      menu.addItem((i) => i.setTitle('Rename (r)').setIcon('pencil').onClick(() => {
        this.selectedIndex = this.entries.findIndex(e => e.path === entry.path);
        this.renameEntry();
      }));
      menu.addItem((i) => i.setTitle('Duplicate (D)').setIcon('files').onClick(() => {
        this.selectedIndex = this.entries.findIndex(e => e.path === entry.path);
        this.duplicateEntry();
      }));
      menu.addSeparator();
      menu.addItem((i) => i.setTitle('Copy folder (yy)').setIcon('copy').onClick(() => {
        this.selectedIndex = this.entries.findIndex(e => e.path === entry.path);
        this.copyEntry();
      }));
      menu.addItem((i) => i.setTitle('Cut folder (dd)').setIcon('scissors').onClick(() => {
        this.selectedIndex = this.entries.findIndex(e => e.path === entry.path);
        this.cutEntry();
      }));
      menu.addSeparator();
      menu.addItem((i) => i.setTitle('Copy path').setIcon('clipboard').onClick(async () => {
        try { await navigator.clipboard.writeText(entry.path); } catch {}
      }));
    }
    menu.showAtMouseEvent(evt);
  }

  jumpTop() {
    if (!this.entries.length) return;
    this.selectedIndex = 0;
    this.renderSelectionOnly();
    const node = this.listEl.querySelectorAll('.fm-item')[this.selectedIndex];
    if (node) node.scrollIntoView({ block: 'nearest' });
    this.renderPreview();
  }

  jumpBottom() {
    if (!this.entries.length) return;
    this.selectedIndex = this.entries.length - 1;
    this.renderSelectionOnly();
    const node = this.listEl.querySelectorAll('.fm-item')[this.selectedIndex];
    if (node) node.scrollIntoView({ block: 'nearest' });
    this.renderPreview();
  }

  cycleSearch(step) {
    const activeSearchValue = this.searchMode === 'search' ? this.searchInputEl.value : this.searchQuery;
    const query = (activeSearchValue || '').trim() || this.searchQuery || this.lastSearchQuery || '';
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
      const node = this.listEl.querySelectorAll('.fm-item')[this.selectedIndex];
      if (node) node.scrollIntoView({ block: 'nearest' });
      this.renderPreview();
    }
  }

  renderStatusBar() {
    if (!this.statusEl) return;
    this.statusEl.empty();
    const hints = [
      { keys: ['j', 'k'], desc: 'navigate' },
      { keys: ['h', 'l'], desc: 'parent/open' },
      { keys: ['/'], desc: 'search' },
      { keys: ['f'], desc: 'filter' },
      { keys: ['a', 'A'], desc: 'new note/folder' },
      { keys: ['r'], desc: 'rename' },
      { keys: ['D'], desc: 'duplicate' },
      { keys: ['yy'], desc: 'copy' },
      { keys: ['dd'], desc: 'cut' },
      { keys: ['p'], desc: 'paste' },
      { keys: ['zd'], desc: 'toggle panes' },
      { keys: ['zp'], desc: 'preview mode' },
      { keys: ['q'], desc: 'close' },
    ];
    hints.forEach((hint, idx) => {
      if (idx > 0) {
        this.statusEl.createSpan({ cls: 'fm-status-sep', text: '•' });
      }
      const hintEl = this.statusEl.createSpan({ cls: 'fm-status-hint' });
      hint.keys.forEach((key, kidx) => {
        if (kidx > 0) hintEl.createSpan({ text: '/' });
        hintEl.createSpan({ cls: 'fm-status-key', text: key });
      });
      hintEl.createSpan({ text: hint.desc });
    });
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
      const title = this.detailsEl.createEl('div', { cls: 'fm-details-title', text: entry.name });
      title.setAttr('title', entry.path);
    }
    const meta = this.showDetails ? this.detailsEl.createEl('div', { cls: 'fm-details-meta' }) : null;
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

    // Check if it's an image file
    const ext = entry.extension.toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) {
      if (!this.showPreview) return;
      if (this.previewMode === 'text') {
        this.previewEl.createEl('div', { cls: 'fm-preview-text', text: 'Image preview disabled in text mode.' });
        return;
      }
      try {
        const img = this.previewEl.createEl('img');
        img.src = this.app.vault.getResourcePath(entry);
        img.alt = entry.name;
      } catch (e) {
        this.previewEl.createEl('div', { cls: 'fm-preview-error', text: 'Unable to load image.' });
      }
      return;
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
      this.previewEl.removeClass('markdown-preview-view');
      if (this.previewMode === 'text') {
        this.previewEl.createEl('pre', { cls: 'fm-preview-text', text });
      } else {
        await MarkdownRenderer.renderMarkdown(text, this.previewEl, entry.path, this);
        this.previewEl.addClass('markdown-preview-view');
      }
    } catch (e) {
      if (token !== this.previewToken) return;
      this.previewEl.createEl('div', { cls: 'fm-preview-error', text: 'Unable to render preview.' });
    }
  }
}

const DEFAULT_SETTINGS = {
  showPreview: true,
  showDetails: true,
  showHiddenFiles: true,
  showHiddenFolders: true,
  showFileExtensions: true,
  sortFoldersFirst: true,
};

class FmPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    if (this.app.viewRegistry?.viewByType?.[VIEW_TYPE_FM]) {
      this.app.viewRegistry.unregisterView(VIEW_TYPE_FM);
    }
    this.registerView(
      VIEW_TYPE_FM,
      (leaf) => new FmView(leaf, this.app, this)
    );

    this.addSettingTab(new FmSettingTab(this.app, this));

    this.addCommand({
      id: 'open-fm-file-manager',
      name: 'Open File Nav - Ranger for Obsidian',
      hotkeys: [{ modifiers: [], key: '-' }],
      callback: async () => {
    const activeFile = this.app.workspace.getActiveFile();
    const leaf = this.app.workspace.getLeaf(false);
        const startFolder = activeFile?.parent || this.app.vault.getRoot();
        await leaf.setViewState({
          type: VIEW_TYPE_FM,
          active: true,
          state: { startFolder: startFolder.path, selectFile: activeFile?.path || null, prevFile: activeFile?.path || null },
        });
        this.app.workspace.revealLeaf(leaf);
      },
    });
  }

  onunload() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
    for (const leaf of leaves) {
      leaf.setViewState({ type: 'empty' });
    }
    if (this.app.viewRegistry?.viewByType?.[VIEW_TYPE_FM]) {
      this.app.viewRegistry.unregisterView(VIEW_TYPE_FM);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class FmSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h3', { text: 'File Nav - Ranger for Obsidian Settings' });

    new Setting(containerEl)
      .setName('Show preview by default')
      .setDesc('Show the markdown preview panel on the right')
      .addToggle((t) => t.setValue(!!this.plugin.settings.showPreview).onChange(async (v) => {
        this.plugin.settings.showPreview = v;
        await this.plugin.saveSettings();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
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
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
        for (const leaf of leaves) {
          const view = leaf.view;
          view.showDetails = v;
          if (view.detailsEl) {
            if (v) view.detailsEl.removeClass('is-hidden'); else view.detailsEl.addClass('is-hidden');
            view.renderPreview();
          }
        }
      }));

    containerEl.createEl('h4', { text: 'File options' });

    new Setting(containerEl)
      .setName('Show file extensions')
      .setDesc('Display file extensions in the file list')
      .addToggle((t) => t.setValue(!!this.plugin.settings.showFileExtensions).onChange(async (v) => {
        this.plugin.settings.showFileExtensions = v;
        await this.plugin.saveSettings();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
        for (const leaf of leaves) {
          const view = leaf.view;
          view.showFileExtensions = v;
          view.render();
        }
      }));

    new Setting(containerEl)
      .setName('Show hidden files')
      .setDesc('Include dotfiles (files starting with ".")')
      .addToggle((t) => t.setValue(!!this.plugin.settings.showHiddenFiles).onChange(async (v) => {
        this.plugin.settings.showHiddenFiles = v;
        await this.plugin.saveSettings();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
        for (const leaf of leaves) {
          const view = leaf.view;
          view.showHiddenFiles = v;
          view.render();
        }
      }));

    containerEl.createEl('h4', { text: 'Folder options' });

    new Setting(containerEl)
      .setName('Show hidden folders')
      .setDesc('Include folders starting with "."')
      .addToggle((t) => t.setValue(!!this.plugin.settings.showHiddenFolders).onChange(async (v) => {
        this.plugin.settings.showHiddenFolders = v;
        await this.plugin.saveSettings();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
        for (const leaf of leaves) {
          const view = leaf.view;
          view.showHiddenFolders = v;
          view.render();
        }
      }));

    new Setting(containerEl)
      .setName('Group folders first')
      .setDesc('List folders before files when sorting')
      .addToggle((t) => t.setValue(!!this.plugin.settings.sortFoldersFirst).onChange(async (v) => {
        this.plugin.settings.sortFoldersFirst = v;
        await this.plugin.saveSettings();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
        for (const leaf of leaves) {
          const view = leaf.view;
          view.sortFoldersFirst = v;
          view.render();
        }
      }));
  }
}

module.exports = FmPlugin;
