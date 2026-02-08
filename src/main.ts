/*
  File Nav - Ranger for Obsidian - File navigator with keyboard navigation
  
  Features:
    - Vim-style hjkl navigation
    - Multiple file selection with visual indicators
    - Batch operations: copy, move, delete multiple files
    - Quick search with / key (highlighted matches)
    - Filter list with f key
    - Real-time markdown preview pane
    - Image preview support
    - File details with metadata
    - File operations: copy, move, delete, rename, duplicate
    - Quick create notes and folders
    - Context menus for file operations
    - Customizable preview and details panels
    - Link preservation using Obsidian's internal API
  
  Key Bindings:
    j/k: move selection down/up
    l / Enter: open file or enter folder
    h: go up to parent folder
    /: toggle search bar (type to highlight)
    f: filter list to matching entries
    n / N: cycle next/prev search match
    Ctrl+d / Ctrl+u: move down/up by 10 items
    gg / G: jump to top/bottom
    gh / g/: go to vault root (home)
    gt / gT: next/previous File Nav tab
    T: open new File Nav tab
    v / Space: toggle file selection (for multi-file operations)
    Ctrl+a: select all / deselect all
    zd: toggle preview pane
    zp: toggle rendered/text preview
    q or Esc: exit search or close view
    a / A: new note / new folder
    r: rename selected item
    D: duplicate selected item
    y: copy file(s)/folder(s)
    x: cut (move) file(s)/folder(s)
    d: delete file(s)/folder(s) with confirmation
    p: paste
  
  Command: Open File Nav (no default hotkey)
*/

import {
  Plugin,
  ItemView,
  TFile,
  TFolder,
  MarkdownRenderer,
  Modal,
  TextComponent,
  ButtonComponent,
  setIcon,
  Menu,
  PluginSettingTab,
  Setting,
  Notice,
} from "obsidian";

// Helper: choose an icon name for a file based on extension
function iconForFileName(name: string): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  // markdown and notes
  if (
    ext === "md" ||
    ext === "txt" ||
    ext === "rtf" ||
    ext === "org" ||
    ext === "log"
  )
    return "file-text";
  // documents
  if (["doc", "docx", "odt", "pages"].includes(ext)) return "file-text";
  // ebooks
  if (["epub", "mobi", "azw", "azw3"].includes(ext)) return "book";
  // images
  if (
    [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "svg",
      "webp",
      "bmp",
      "tiff",
      "tif",
      "ico",
      "avif",
      "heic",
      "heif",
      "jfif",
      "jxl",
    ].includes(ext)
  )
    return "image";
  // audio
  if (
    [
      "mp3",
      "wav",
      "m4a",
      "flac",
      "ogg",
      "oga",
      "aac",
      "aiff",
      "alac",
      "opus",
    ].includes(ext)
  )
    return "music";
  // video
  if (["mp4", "mkv", "webm", "mov", "avi", "m4v", "wmv"].includes(ext))
    return "video";
  // spreadsheets / data
  if (["csv", "tsv", "xls", "xlsx", "ods"].includes(ext)) return "table";
  // presentations
  if (["ppt", "pptx", "odp", "key"].includes(ext)) return "presentation";
  // PDFs
  if (ext === "pdf") return "file-text";
  // code
  if (
    [
      "js",
      "ts",
      "tsx",
      "jsx",
      "mjs",
      "cjs",
      "json",
      "yaml",
      "yml",
      "toml",
      "xml",
      "html",
      "css",
      "scss",
      "sass",
      "less",
      "mdx",
      "py",
      "rb",
      "java",
      "kt",
      "c",
      "cc",
      "cpp",
      "h",
      "hpp",
      "cs",
      "rs",
      "go",
      "sh",
      "zsh",
      "fish",
      "lua",
      "php",
      "pl",
      "r",
      "swift",
    ].includes(ext)
  )
    return "code";
  // config
  if (["ini", "conf", "config", "env", "dotenv"].includes(ext))
    return "settings";
  // databases
  if (["db", "sqlite", "sqlite3", "duckdb"].includes(ext)) return "database";
  // archives & packages
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz"].includes(ext))
    return "package";
  return "file";
}

function setEntryIcon(el: HTMLElement, entry: any) {
  if (entry instanceof TFolder) {
    setIcon(el, "folder");
  } else if (entry instanceof TFile) {
    setIcon(el, iconForFileName(entry.name));
  } else {
    setIcon(el, "file");
  }
}

const VIEW_TYPE_FM = "file-nav-ranger-view";

// Image file extensions for preview
const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "bmp",
  "ico",
  "tiff",
  "tif",
  "avif",
  "heic",
  "heif",
  "jfif",
  "jxl",
];

const G_CHORD_OPTIONS = [
  { keys: ["g", "g"], desc: "top", action: (view: FmView) => view.jumpTop() },
  {
    keys: ["g", "h"],
    desc: "vault root (home)",
    action: (view: FmView) => view.gotoVaultRoot(),
  },
  {
    keys: ["g", "/"],
    desc: "vault root (slash)",
    action: (view: FmView) => view.gotoVaultRoot(),
  },
  { keys: ["g", "t"], desc: "next tab", action: (view: FmView) => view.gotoNextTab() },
  {
    keys: ["g", "T"],
    desc: "previous tab",
    action: (view: FmView) => view.gotoPrevTab(),
  },
];
const Z_CHORD_OPTIONS = [
  {
    keys: ["z", "d"],
    desc: "toggle panes",
    action: (view: FmView) => view.togglePreviewPane(),
  },
  {
    keys: ["z", "p"],
    desc: "preview mode",
    action: (view: FmView) => view.togglePreviewMode(),
  },
];
class FmView extends ItemView {
  app: any;
  plugin: FmPlugin;
  currentFolder: any;
  entries: any[];
  allEntries: any[];
  selectedIndex: number;
  searchActive: boolean;
  searchQuery: string;
  filterQuery: string;
  previewToken: number;
  prevFilePath: string | null;
  startFolderPath: string | null;
  selectFilePath: string | null;
  preselectPath: string | null;
  initialized: boolean;
  lastSearchQuery: string;
  _suppressEnterUntil: number;
  showPreview: boolean;
  showDetails: boolean;
  showHiddenFiles: boolean;
  showHiddenFolders: boolean;
  showFileExtensions: boolean;
  sortFoldersFirst: boolean;
  previewMode: string;
  clipboard: any;
  clipboardOperation: string | null;
  selectedFiles: Set<string>;
  folderHistory: Map<string, string>;
  searchMode: string | null;
  filterActive: boolean;
  chordOverlayEl: HTMLElement | null;
  chordOverlayTitleEl: HTMLElement | null;
  chordOverlayListEl: HTMLElement | null;
  _gTimer: number | null;
  _zTimer: number | null;
  hostEl: HTMLElement;
  pathEl: HTMLElement;
  searchWrapEl: HTMLElement;
  searchInputEl: HTMLInputElement;
  layoutEl: HTMLElement;
  leftEl: HTMLElement;
  listEl: HTMLElement;
  rightEl: HTMLElement;
  detailsEl: HTMLElement;
  previewEl: HTMLElement;
  statusEl: HTMLElement;
  
  constructor(leaf: any, app: any, plugin: FmPlugin) {
    super(leaf);
    this.app = app;
    this.plugin = plugin;
    this.currentFolder = this.app.vault.getRoot();
    this.entries = [];
    this.allEntries = [];
    this.selectedIndex = 0;
    this.searchActive = false;
    this.searchQuery = "";
    this.filterQuery = "";
    this.previewToken = 0;
    this.prevFilePath = null;
    this.startFolderPath = null;
    this.selectFilePath = null;
    this.preselectPath = null;
    this.initialized = false;
    this.lastSearchQuery = "";
    this._suppressEnterUntil = 0;
    this.showPreview = true;
    this.showDetails = true;
    this.showHiddenFiles = true;
    this.showHiddenFolders = true;
    this.showFileExtensions = true;
    this.sortFoldersFirst = true;
    this.previewMode = "rendered";
    // Clipboard for copy/move operations
    this.clipboard = null;
    this.clipboardOperation = null; // 'copy' or 'cut'
    // Multiple selection support
    this.selectedFiles = new Set(); // Set of file/folder paths for multi-selection
    // History: remember last selected file in each folder
    this.folderHistory = new Map(); // folderPath -> entryPath
    // Search/filter mode tracking
    this.searchMode = null; // 'search' or 'filter'
    this.filterActive = false;
    this.chordOverlayEl = null;
    this.chordOverlayTitleEl = null;
    this.chordOverlayListEl = null;
  }

  getViewType() {
    return VIEW_TYPE_FM;
  }
  getDisplayText() {
    return this.formatWindowTitle(this.getWindowTitlePath());
  }

  formatWindowTitle(path: string) {
    return `file: ${path || "/"}`;
  }

  getWindowTitlePath() {
    const entry = this.entries?.[this.selectedIndex];
    return entry?.path || this.currentFolder?.path || "/";
  }

  updateWindowTitle() {
    const title = this.formatWindowTitle(this.getWindowTitlePath());
    if ((this.leaf as any)?.setTitle) {
      (this.leaf as any).setTitle(title);
    } else if ((this as any).setTitle) {
      (this as any).setTitle(title);
    } else if ((this.leaf as any)?.tabHeaderInnerTitleEl) {
      (this.leaf as any).tabHeaderInnerTitleEl.textContent = title;
    }
  }

  async setState(state: any) {
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
    return {
      startFolder: this.currentFolder?.path || "/",
      prevFile: this.prevFilePath,
    };
  }

  async onOpen() {
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
    const fileFromPath = (p: string | null) =>
      p ? this.app.vault.getAbstractFileByPath(p) : null;
    const startFile = fileFromPath(this.selectFilePath);
    const start = startFile || fileFromPath(this.startFolderPath);
    if (start instanceof TFolder) this.currentFolder = start;
    else if (start instanceof TFile) {
      this.currentFolder = start.parent || this.app.vault.getRoot();
      this.preselectPath = start.path;
    } else this.currentFolder = this.app.vault.getRoot();

    const root = this.contentEl;
    root.empty();
    const host = root.createDiv({ cls: "fm-fm", attr: { tabindex: "0" } });
    this.hostEl = host;

    // Path bar
    this.pathEl = host.createDiv({ cls: "fm-path" });
    // Search bar
    this.searchWrapEl = host.createDiv({ cls: "fm-search is-hidden" });
    this.searchInputEl = this.searchWrapEl.createEl("input", {
      type: "text",
      placeholder: "Search (Esc to exit)...",
    });
    this.registerDomEvent(this.searchInputEl, "input", () =>
      this.applySearchFilter(),
    );
    this.registerDomEvent(this.searchInputEl, "keydown", (evt) => {
      const k = evt.key;
      if (k === "/" && this.searchMode === "search") {
        evt.preventDefault();
        evt.stopPropagation();
        this.clearSearchInput();
        return;
      }
      if (k === "Escape") {
        evt.preventDefault();
        evt.stopPropagation();
        this.exitSearchMode(true, true);
      } else if (k === "Enter") {
        // Do not open: hide bar and keep filter applied
        evt.preventDefault();
        evt.stopPropagation();
        this._suppressEnterUntil = Date.now() + 250; // swallow any immediate Enter on host
        this.exitSearchMode(true, false);
      } else if ((evt.ctrlKey || evt.metaKey) && (k === "j" || k === "J")) {
        evt.preventDefault();
        evt.stopPropagation();
        this.move(1);
      } else if ((evt.ctrlKey || evt.metaKey) && (k === "k" || k === "K")) {
        evt.preventDefault();
        evt.stopPropagation();
        this.move(-1);
      }
    });
    // Layout
    this.layoutEl = host.createDiv({ cls: "fm-layout" });
    this.leftEl = this.layoutEl.createDiv({ cls: "fm-left" });
    this.listEl = this.leftEl.createDiv({
      cls: "fm-list",
      attr: { tabindex: "0" },
    });
    this.rightEl = this.layoutEl.createDiv({ cls: "fm-right" });
    this.detailsEl = this.rightEl.createDiv({ cls: "fm-details" });
    this.previewEl = this.rightEl.createDiv({ cls: "fm-preview" });
    if (!this.showDetails) this.detailsEl.addClass("is-hidden");
    if (!this.showPreview) {
      this.previewEl.addClass("is-hidden");
      this.hostEl.addClass("single");
    }

    // Status bar with keyboard hints
    this.statusEl = host.createDiv({ cls: "fm-status" });
    this.renderStatusBar();

    this.render();
    host.focus({ preventScroll: true });

    // Keyboard handling across the view (capture to avoid focus quirks)
    this.registerDomEvent(this.contentEl, "keydown", (evt) => {
      const activeInSearch = document.activeElement === this.searchInputEl;
      const k = evt.key;
      if (this._gTimer) {
        // Preserve case to distinguish gt and gT.
        const option = G_CHORD_OPTIONS.find(
          (entry) => entry.keys[1] === k,
        );
        if (option) {
          evt.preventDefault();
          evt.stopPropagation();
          window.clearTimeout(this._gTimer);
          this._gTimer = null;
          this.hideChordOverlay();
          option.action(this);
          return;
        }
      }
      if (this._zTimer) {
        const normalizedKey = k.toLowerCase();
        const option = Z_CHORD_OPTIONS.find(
          (entry) => entry.keys[1] === normalizedKey,
        );
        if (option) {
          evt.preventDefault();
          evt.stopPropagation();
          window.clearTimeout(this._zTimer);
          this._zTimer = null;
          this.hideChordOverlay();
          option.action(this);
          return;
        }
      }
      if (activeInSearch) {
        // While typing, still honor Ctrl+j/k to move within filtered list
        if ((evt.ctrlKey || evt.metaKey) && (k === "j" || k === "J")) {
          evt.preventDefault();
          evt.stopPropagation();
          this.move(1);
        } else if ((evt.ctrlKey || evt.metaKey) && (k === "k" || k === "K")) {
          evt.preventDefault();
          evt.stopPropagation();
          this.move(-1);
        }
        return; // otherwise let input consume keys
      }

      if (k === "Enter" && Date.now() < this._suppressEnterUntil) {
        evt.preventDefault();
        evt.stopPropagation();
        return; // ignore Enter immediately after closing search
      }

      if (
        [
          "j",
          "k",
          "h",
          "l",
          "/",
          "f",
          "a",
          "A",
          "r",
          "D",
          "Enter",
          "Escape",
          "q",
          "g",
          "G",
          "n",
          "N",
          "z",
          "y",
          "x",
          "d",
          "p",
          "v",
          " ",
        ].includes(k) ||
        (evt.ctrlKey && (k === "d" || k === "u" || k === "a"))
      ) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      if (k === "Escape" && this.searchActive) {
        this.exitSearchMode(true, true);
        return;
      }
      if (evt.ctrlKey && k === "d") this.move(10);
      else if (evt.ctrlKey && k === "u") this.move(-10);
      else if (evt.ctrlKey && k === "a") this.selectAll();
      else if (k === "j") this.move(1);
      else if (k === "k") this.move(-1);
      else if (k === "l" || k === "Enter") this.activate();
      else if (k === "h") this.up();
      else if (k === "/") {
        if (this.searchActive && this.searchMode === "search") {
          this.clearSearchInput();
        } else {
          this.enterSearchMode("search");
        }
      } else if (k === "f") this.enterSearchMode("filter");
      else if (k === "g") this.handleG();
      else if (k === "G" || (k === "g" && evt.shiftKey)) this.jumpBottom();
      else if (k === "n") this.cycleSearch(1);
      else if (k === "N") this.cycleSearch(-1);
      else if (k === "Escape" || k === "q") this.closeView();
      else if (k === "z") this.handleZ();
      else if (k === "y") this.copyEntry();
      else if (k === "x") this.cutEntry();
      else if (k === "d") this.deleteEntry();
      else if (k === "p") this.handleP();
      else if (k === "a") this.createNewNote();
      else if (k === "A") this.createNewFolder();
      else if (k === "r") this.renameEntry();
      else if (k === "D") this.duplicateEntry();
      else if (k === "T") this.openNewTab();
      else if (k === "v" || k === " ") this.toggleSelection();
    }, true);
  }

  async onClose() {
    // nothing special
  }

  setStartFolder(path: any) {
    const abs = path ? this.app.vault.getAbstractFileByPath(path) : null;
    let folder = this.app.vault.getRoot();
    if (abs instanceof TFolder) folder = abs;
    else if (abs instanceof TFile) folder = abs.parent || folder;
    this.currentFolder = folder;
    this.selectedIndex = 0;
    if (this.searchActive) this.exitSearchMode(false);
    this.render();
  }

  setStartLocation(filePath: any) {
    const abs = filePath
      ? this.app.vault.getAbstractFileByPath(filePath)
      : null;
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

  getFolderEntries(folder: any) {
    if (!(folder instanceof TFolder)) return [];
    const children = folder.children || [];
    const dirs = [];
    const files = [];
    for (const child of children) {
      if (child instanceof TFolder) {
        if (!this.showHiddenFolders && child.name.startsWith(".")) continue;
        dirs.push(child);
      } else if (child instanceof TFile) {
        if (!this.showHiddenFiles && child.name.startsWith(".")) continue;
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

  getEntryLabel(entry: any) {
    if (entry instanceof TFile && !this.showFileExtensions) {
      return entry.basename;
    }
    return entry.name;
  }

  getEntrySearchName(entry: any) {
    return this.getEntryLabel(entry);
  }

  render() {
    // Update entries and clamp selection (no filtering; quick-select mode)
    this.allEntries = this.getFolderEntries(this.currentFolder);
    this.entries = this.allEntries;
    this.updateEntriesForFilter();
    // honor a pending file selection
    if (this.preselectPath) {
      const i = this.entries.findIndex((e) => e.path === this.preselectPath);
      if (i >= 0) this.selectedIndex = i;
      this.preselectPath = null;
    } else {
      // Check folder history to restore previous selection
      const folderPath = this.currentFolder.path;
      const rememberedPath = this.folderHistory.get(folderPath);
      if (rememberedPath) {
        const i = this.entries.findIndex((e) => e.path === rememberedPath);
        if (i >= 0) this.selectedIndex = i;
      }
    }
    if (this.selectedIndex >= this.entries.length)
      this.selectedIndex = Math.max(0, this.entries.length - 1);
    if (this.selectedIndex < 0) this.selectedIndex = 0;

    // Render path
    const path =
      this.currentFolder.path === "/" ? "/" : this.currentFolder.path;
    this.pathEl.setText(path);

    this.renderList();

    // Scroll selected item into view
    this.scrollToSelected();
  }

  renderSelectionOnly() {
    // Update CSS class only to avoid full rerender flicker
    const nodes = this.listEl.querySelectorAll(".fm-item");
    nodes.forEach((n, i) => {
      const entry = this.entries[i];
      if (!entry) return;
      
      // Update current selection indicator
      if (i === this.selectedIndex) n.addClass("is-selected");
      else n.removeClass("is-selected");
      
      // Update multi-selection indicator
      if (this.selectedFiles.has(entry.path)) {
        n.addClass("is-multi-selected");
      } else {
        n.removeClass("is-multi-selected");
      }
    });
    this.updateWindowTitle();
  }

  scrollToSelected() {
    // Scroll the selected item into view
    const nodes = this.listEl.querySelectorAll(".fm-item");
    const node = nodes[this.selectedIndex];
    if (node) {
      node.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }

  move(delta: number) {
    if (!this.entries.length) return;
    this.selectedIndex =
      (this.selectedIndex + delta + this.entries.length) % this.entries.length;
    this.renderSelectionOnly();
    // Keep selected item in view
    const node = this.listEl.querySelectorAll(".fm-item")[this.selectedIndex];
    if (node) node.scrollIntoView({ block: "nearest" });
    this.renderPreview();
    // Save current selection to history
    this.saveCurrentSelection();
  }

  saveCurrentSelection() {
    // Save the current selected entry to folder history
    if (
      this.entries.length > 0 &&
      this.selectedIndex >= 0 &&
      this.selectedIndex < this.entries.length
    ) {
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
      const idx = this.getFolderEntries(parent).findIndex(
        (c) => c.path === prev.path,
      );
      this.selectedIndex = idx >= 0 ? idx : 0;
      // Clear multi-selection when navigating
      this.clearSelection();
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
      // Clear multi-selection when navigating
      this.clearSelection();
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
  enterSearchMode(mode: string) {
    const isRepeat = this.searchActive && this.searchMode === mode;
    this.searchActive = true;
    this.searchMode = mode;
    if (mode === "filter") {
      this.filterActive = true;
    }
    this.searchWrapEl.removeClass("is-hidden");
    this.searchInputEl.value =
      mode === "filter" ? this.filterQuery || "" : this.searchQuery || "";
    if (isRepeat) {
      this.clearSearchInput();
      return;
    }
    this.searchInputEl.focus();
    this.applySearchFilter();
  }

  exitSearchMode(rerender = true, clear = true) {
    // Persist last search query for n/N cycling
    const rawValue = (this.searchInputEl.value || "").trim();
    if (this.searchMode === "search") {
      this.lastSearchQuery = rawValue || this.lastSearchQuery || "";
    }
    this.searchActive = false;
    const mode = this.searchMode;
    this.searchMode = null;
    if (clear) {
      if (mode === "search") this.searchQuery = "";
      if (mode === "filter") {
        this.filterQuery = "";
        this.filterActive = false;
      }
      this.searchInputEl.value = "";
    } else {
      if (mode === "search") this.searchQuery = rawValue;
      if (mode === "filter") {
        this.filterQuery = rawValue;
        this.filterActive = !!this.filterQuery;
      }
    }
    this.searchWrapEl.addClass("is-hidden");
    if (this.listEl) this.listEl.focus({ preventScroll: true });
    if (rerender) this.render();
  }

  applySearchFilter() {
    // Quick-select mode: do not filter; highlight matches and jump selection
    const query = (this.searchInputEl.value || "").trim();
    const currentPath = this.entries[this.selectedIndex]?.path;
    if (this.searchMode === "search") {
      this.searchQuery = query;
      if (this.searchQuery) this.lastSearchQuery = this.searchQuery;
    } else if (this.searchMode === "filter") {
      this.filterQuery = query;
    }
    if (this.searchMode === "filter") this.filterActive = true;
    this.updateEntriesForFilter();
    if (currentPath) {
      const nextIndex = this.entries.findIndex(
        (entry) => entry.path === currentPath,
      );
      this.selectedIndex = nextIndex >= 0 ? nextIndex : 0;
    }

    if (this.searchMode === "search") {
      // If current selection doesn't match, move to next match from top
      const queryLower = this.searchQuery.toLowerCase();
      const cur = this.entries[this.selectedIndex];
      const curMatches =
        queryLower && cur
          ? this.getEntrySearchName(cur).toLowerCase().includes(queryLower)
          : false;
      if (queryLower && !curMatches) {
        const next = this.entries.findIndex((e) =>
          this.getEntrySearchName(e).toLowerCase().includes(queryLower),
        );
        if (next >= 0) this.selectedIndex = next;
      }
    }

    this.renderList();
    this.scrollToSelected();
  }

  filterEntries(query: string) {
    const q = query.toLowerCase();
    return this.allEntries.filter((e) =>
      this.getEntrySearchName(e).toLowerCase().includes(q),
    );
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
    if (this.searchMode === "filter") return this.filterQuery;
    if (this.searchMode === "search") return this.searchQuery;
    return this.searchQuery || (this.filterActive ? this.filterQuery : "");
  }

  renderList() {
    this.listEl.empty();
    if (this.entries.length === 0) {
      this.listEl.createEl("div", { cls: "fm-empty", text: "(empty)" });
      this.previewEl.empty();
      this.detailsEl.empty();
      this.updateWindowTitle();
      return;
    }
    const highlightQuery = this.getActiveHighlightQuery();
    this.entries.forEach((entry, idx) => {
      const item = this.listEl.createEl("div", { cls: "fm-item" });
      if (idx === this.selectedIndex) item.addClass("is-selected");
      if (this.selectedFiles.has(entry.path)) item.addClass("is-multi-selected");

      // Add checkbox indicator for multi-selected items
      if (this.selectedFiles.has(entry.path)) {
        const checkbox = item.createEl("span", { cls: "fm-checkbox" });
        checkbox.textContent = "✓";
        checkbox.setAttr("aria-hidden", "true");
      }

      const icon = item.createEl("span", { cls: "fm-icon" });
      setEntryIcon(icon, entry);
      icon.setAttr("aria-hidden", "true");
      const nameEl = item.createEl("span", { cls: "fm-name" });
      nameEl.innerHTML = this.renderNameWithHighlight(
        this.getEntryLabel(entry),
        highlightQuery,
      );

      // Mouse support - click to select
      item.addEventListener("click", () => {
        if (this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          this.renderSelectionOnly();
          this.renderPreview();
        }
      });
      item.addEventListener("dblclick", () => {
        this.selectedIndex = idx;
        this.activate();
      });

      // Context menu
      item.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        this.openContextMenu(evt, entry);
      });
    });

    this.renderPreview();
    this.updateWindowTitle();
  }

  clearSearchInput() {
    if (this.searchMode === "filter") {
      this.filterQuery = "";
    } else {
      this.searchQuery = "";
    }
    this.searchInputEl.value = "";
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
  renderNameWithHighlight(name: string, query: string) {
    if (!query) return this.escapeHtml(name);
    const q = query.toLowerCase();
    const n = name;
    const lower = n.toLowerCase();
    let i = 0;
    let html = "";
    while (true) {
      const idx = lower.indexOf(q, i);
      if (idx === -1) {
        html += this.escapeHtml(n.slice(i));
        break;
      }
      if (idx > i) html += this.escapeHtml(n.slice(i, idx));
      html +=
        '<span class="ranger-match">' +
        this.escapeHtml(n.slice(idx, idx + q.length)) +
        "</span>";
      i = idx + q.length;
    }
    return html;
  }

  escapeHtml(s: string) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Jump handlers
  handleG() {
    if (this._gTimer) {
      // second 'g' - jump to top
      window.clearTimeout(this._gTimer);
      this._gTimer = null;
      this.hideChordOverlay();
      this.jumpTop();
      return;
    }
    
    this._gTimer = window.setTimeout(() => {
      this._gTimer = null;
      this.hideChordOverlay();
    }, 400);
    this.showChordOverlay("g", G_CHORD_OPTIONS);
  }

  handleZ() {
    if (this._zTimer) {
      // second key in chord
      window.clearTimeout(this._zTimer);
      this._zTimer = null;
      this.hideChordOverlay();
      return;
    }
    this._zTimer = window.setTimeout(() => {
      this._zTimer = null;
      this.hideChordOverlay();
    }, 400);
    this.showChordOverlay("z", Z_CHORD_OPTIONS);
  }

  showChordOverlay(label: string, options: any[]) {
    if (!this.hostEl) return;
    if (!this.chordOverlayEl) {
      this.chordOverlayEl = this.hostEl.createDiv({
        cls: "fm-chord-overlay is-hidden",
        attr: { role: "status", "aria-live": "polite" },
      });
      const panel = this.chordOverlayEl.createDiv({
        cls: "fm-chord-overlay-panel",
        attr: { role: "dialog", "aria-label": "Key combinations" },
      });
      this.chordOverlayTitleEl = panel.createDiv({
        cls: "fm-chord-overlay-title",
      });
      this.chordOverlayListEl = panel.createDiv({
        cls: "fm-chord-overlay-list",
      });
    }
    this.chordOverlayTitleEl!.setText(`${label} key combinations`);
    this.chordOverlayListEl!.empty();
    options.forEach((option: any) => {
      const item = this.chordOverlayListEl!.createDiv({
        cls: "fm-chord-overlay-item",
      });
      const keysEl = item.createDiv({ cls: "fm-chord-overlay-keys" });
      option.keys.forEach((key: string) => {
        const ariaLabel =
          key === "/"
            ? "slash"
            : key === " "
              ? "space"
              : key.toUpperCase() === key && key.toLowerCase() !== key
                ? `shift+${key.toLowerCase()}`
                : key;
        keysEl.createEl("kbd", {
          cls: "fm-chord-overlay-key",
          text: key,
          attr: { "aria-label": ariaLabel },
        });
      });
      item.createSpan({ cls: "fm-chord-overlay-desc", text: option.desc });
    });
    this.chordOverlayEl.removeClass("is-hidden");
  }

  hideChordOverlay() {
    if (this.chordOverlayEl) {
      this.chordOverlayEl.addClass("is-hidden");
    }
  }

  focusNavigation() {
    if (this.listEl) {
      this.listEl.focus({ preventScroll: true });
      return;
    }
    if (this.hostEl) {
      this.hostEl.focus({ preventScroll: true });
    }
  }

  handleP() {
    // p: paste
    this.pasteEntry();
  }

  toggleSelection() {
    if (!this.entries.length) return;
    const entry = this.entries[this.selectedIndex];
    if (this.selectedFiles.has(entry.path)) {
      this.selectedFiles.delete(entry.path);
    } else {
      this.selectedFiles.add(entry.path);
    }
    this.renderSelectionOnly();
    this.renderStatusBar();
  }

  selectAll() {
    if (!this.entries.length) return;
    // Toggle: if all selected, clear; otherwise select all
    const allSelected = this.entries.every(e => this.selectedFiles.has(e.path));
    if (allSelected) {
      this.selectedFiles.clear();
    } else {
      this.entries.forEach(e => this.selectedFiles.add(e.path));
    }
    this.render();
  }

  clearSelection() {
    this.selectedFiles.clear();
    this.renderSelectionOnly();
    this.renderStatusBar();
  }

  getSelectedEntries() {
    // Return selected files if any, otherwise current entry
    if (this.selectedFiles.size > 0) {
      return this.entries.filter(e => this.selectedFiles.has(e.path));
    }
    if (this.entries.length > 0) {
      return [this.entries[this.selectedIndex]];
    }
    return [];
  }

  copyEntry() {
    const entries = this.getSelectedEntries();
    if (entries.length === 0) return;
    
    this.clipboard = entries;
    this.clipboardOperation = "copy";
    
    if (entries.length === 1) {
      new Notice(`Copied: ${entries[0].name}`);
    } else {
      new Notice(`Copied ${entries.length} items`);
    }
  }

  cutEntry() {
    const entries = this.getSelectedEntries();
    if (entries.length === 0) return;
    
    this.clipboard = entries;
    this.clipboardOperation = "cut";
    
    if (entries.length === 1) {
      new Notice(`Cut: ${entries[0].name} (ready to move)`);
    } else {
      new Notice(`Cut ${entries.length} items (ready to move)`);
    }
  }

  async deleteEntry() {
    const entries = this.getSelectedEntries();
    if (entries.length === 0) return;

    const canTrash = typeof this.app.fileManager?.trashFile === "function";
    const actionLabel = canTrash ? "Move to trash" : "Delete";
    
    // Show custom confirmation modal with details
    const confirmed = await this.showDeleteConfirmation(entries, actionLabel);
    if (!confirmed) return;

    // Delete all selected entries
    for (const entry of entries) {
      const isFolder = entry instanceof TFolder;
      await this.trashOrDeleteEntry(entry, isFolder);
    }
    
    // Clear selection after delete
    this.clearSelection();
    this.render();
    
    if (entries.length === 1) {
      new Notice(`${actionLabel}d: ${entries[0].name}`);
    } else {
      new Notice(`${actionLabel}d ${entries.length} items`);
    }
  }

  async showDeleteConfirmation(entries: any[], actionLabel: string) {
    return new Promise((resolve) => {
      let resolved = false;
      const modal = new Modal(this.app);
      modal.titleEl.setText(`${actionLabel} ${entries.length} item${entries.length === 1 ? '' : 's'}?`);
      
      const contentEl = modal.contentEl;
      contentEl.empty();
      
      const desc = contentEl.createEl("p", {
        text: `Are you sure you want to ${actionLabel.toLowerCase()} the following ${entries.length === 1 ? 'item' : 'items'}?`,
      });
      desc.style.marginBottom = "10px";
      
      // Show list of items to be deleted
      const list = contentEl.createEl("ul", { cls: "fm-delete-list" });
      list.style.maxHeight = "200px";
      list.style.overflow = "auto";
      list.style.marginBottom = "15px";
      list.style.paddingLeft = "20px";
      
      entries.forEach((entry: any) => {
        const isFolder = entry instanceof TFolder;
        const icon = isFolder ? "📁" : "📄";
        list.createEl("li", { 
          text: `${icon} ${entry.path}${isFolder ? ' (and all contents)' : ''}` 
        });
      });
      
      const warning = contentEl.createEl("p", {
        text: "This action cannot be easily undone.",
        cls: "mod-warning"
      });
      warning.style.color = "var(--text-error)";
      warning.style.fontWeight = "bold";
      warning.style.marginBottom = "15px";
      
      const buttonContainer = contentEl.createEl("div", { cls: "fm-modal-buttons" });
      
      const cancelBtn = new ButtonComponent(buttonContainer)
        .setButtonText("Cancel")
        .onClick(() => {
          resolved = true;
          modal.close();
          resolve(false);
        });
      
      const deleteBtn = new ButtonComponent(buttonContainer)
        .setButtonText(actionLabel)
        .setWarning()
        .onClick(() => {
          resolved = true;
          modal.close();
          resolve(true);
        });
      
      modal.onClose = () => {
        if (!resolved) {
          resolve(false);
        }
      };
      
      modal.open();
    });
  }

  async trashOrDeleteEntry(entry: any, isFolder: boolean) {
    if (typeof this.app.fileManager?.trashFile === "function") {
      try {
        await this.app.fileManager.trashFile(entry);
        return;
      } catch {}
    }
    await this.app.vault.delete(entry, isFolder ? true : undefined);
  }

  async pasteEntry() {
    if (!this.clipboard) {
      new Notice("Nothing to paste");
      return;
    }

    const sources = Array.isArray(this.clipboard) ? this.clipboard : [this.clipboard];
    const destFolder = this.currentFolder;
    const operation = this.clipboardOperation;
    
    // Check if confirmation is needed based on settings
    const needsConfirmation = this.shouldConfirmPaste(sources, operation!);
    
    if (needsConfirmation) {
      const confirmed = await this.showPasteConfirmation(sources, operation!, destFolder);
      if (!confirmed) return;
    }

    let successCount = 0;
    let failCount = 0;
    
    for (const source of sources) {
      let success = false;
      try {
        // Use helper to check if we're pasting in the same location
        if (this.isSameFolderCopy(source, destFolder)) {
          // Need to create a copy with a different name
          success = await this.copyFileWithNewName(source, destFolder);
        } else if (source instanceof TFolder && source.path === destFolder.path) {
          new Notice(`Cannot paste folder ${source.name} into itself`);
          failCount++;
          continue;
        } else if (operation === "copy") {
          success = await this.copyToFolder(source, destFolder);
        } else if (operation === "cut") {
          success = await this.moveToFolder(source, destFolder);
        }
        
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        new Notice(`Failed to paste ${source.name}: ${(err as Error).message}`);
        failCount++;
      }
    }
    
    // Clear clipboard after cut operation
    if (operation === "cut") {
      this.clipboard = null;
      this.clipboardOperation = null;
    }
    
    // Clear selection after paste
    this.clearSelection();
    this.render();
    
    // Show summary
    if (sources.length === 1) {
      if (successCount > 0) {
        const verb = operation === "copy" ? "Copied" : "Moved";
        new Notice(`${verb}: ${sources[0].name}`);
      }
    } else {
      if (successCount > 0 && failCount === 0) {
        const verb = operation === "copy" ? "Copied" : "Moved";
        new Notice(`${verb} ${successCount} items`);
      } else if (successCount > 0) {
        const verb = operation === "copy" ? "Copied" : "Moved";
        new Notice(`${verb} ${successCount} items, ${failCount} failed`);
      }
    }
  }

  shouldConfirmPaste(sources: any[], operation: string) {
    // Check settings for copy/move confirmation
    const settings = this.plugin?.settings;
    if (!settings) return false;
    
    if (operation === "copy" && settings.confirmCopy) return true;
    if (operation === "cut" && settings.confirmMove) return true;
    
    return false;
  }

  async showPasteConfirmation(sources: any[], operation: string, destFolder: any) {
    return new Promise((resolve) => {
      let resolved = false;
      const modal = new Modal(this.app);
      const verb = operation === "copy" ? "Copy" : "Move";
      modal.titleEl.setText(`${verb} ${sources.length} item${sources.length === 1 ? '' : 's'}?`);
      
      const contentEl = modal.contentEl;
      contentEl.empty();
      
      const desc = contentEl.createEl("p", {
        text: `${verb} the following ${sources.length === 1 ? 'item' : 'items'} to ${destFolder.path || '/'}?`,
      });
      desc.style.marginBottom = "10px";
      
      // Show list of items
      const list = contentEl.createEl("ul", { cls: "fm-paste-list" });
      list.style.maxHeight = "200px";
      list.style.overflow = "auto";
      list.style.marginBottom = "15px";
      list.style.paddingLeft = "20px";
      
      sources.forEach((source: any) => {
        const isFolder = source instanceof TFolder;
        const icon = isFolder ? "📁" : "📄";
        list.createEl("li", { text: `${icon} ${source.path}` });
      });
      
      const buttonContainer = contentEl.createEl("div", { cls: "fm-modal-buttons" });
      
      const cancelBtn = new ButtonComponent(buttonContainer)
        .setButtonText("Cancel")
        .onClick(() => {
          resolved = true;
          modal.close();
          resolve(false);
        });
      
      const confirmBtn = new ButtonComponent(buttonContainer)
        .setButtonText(verb)
        .setCta()
        .onClick(() => {
          resolved = true;
          modal.close();
          resolve(true);
        });
      
      modal.onClose = () => {
        if (!resolved) {
          resolve(false);
        }
      };
      
      modal.open();
    });
  }

  isSameFolderCopy(source: any, destFolder: any) {
    return (
      source instanceof TFile &&
      source.parent?.path === destFolder.path &&
      this.clipboardOperation === "copy"
    );
  }

  async copyFileWithNewName(file: any, destFolder: any) {
    const ext = file.extension;
    const baseName = file.basename;
    let counter = 1;
    const extSuffix = ext ? `.${ext}` : "";
    let newName = `${baseName} copy${extSuffix}`;
    let newPath =
      destFolder.path === "/" ? newName : `${destFolder.path}/${newName}`;

    // Find available name (with safety limit)
    const MAX_ATTEMPTS = 1000;
    while (
      this.app.vault.getAbstractFileByPath(newPath) &&
      counter < MAX_ATTEMPTS
    ) {
      counter++;
      newName = `${baseName} copy ${counter}${extSuffix}`;
      newPath =
        destFolder.path === "/" ? newName : `${destFolder.path}/${newName}`;
    }

    if (counter >= MAX_ATTEMPTS) {
      new Notice("Failed to find available filename");
      return false;
    }

    try {
      const content = await this.app.vault.read(file);
      await this.app.vault.create(newPath, content);
      new Notice(`Copied to: ${newName}`);
      return true;
    } catch (err) {
      new Notice(`Failed to copy: ${(err as Error).message}`);
      return false;
    }
  }

  async copyToFolder(source: any, destFolder: any) {
    const newPath =
      destFolder.path === "/"
        ? source.name
        : `${destFolder.path}/${source.name}`;

    // Check if destination already exists
    if (this.app.vault.getAbstractFileByPath(newPath)) {
      new Notice(`Already exists: ${source.name}`);
      return false;
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
      return true;
    } catch (err) {
      new Notice(`Failed to copy: ${(err as Error).message}`);
      return false;
    }
  }

  async copyFolderRecursive(sourceFolder: any, destPath: string) {
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

  async moveToFolder(source: any, destFolder: any) {
    const newPath =
      destFolder.path === "/"
        ? source.name
        : `${destFolder.path}/${source.name}`;

    // Check if destination already exists
    if (this.app.vault.getAbstractFileByPath(newPath)) {
      new Notice(`Already exists: ${source.name}`);
      return false;
    }

    try {
      await this.app.vault.rename(source, newPath);
      new Notice(`Moved: ${source.name}`);
      return true;
    } catch (err) {
      new Notice(`Failed to move: ${(err as Error).message}`);
      return false;
    }
  }

  buildChildPath(parentPath: string, name: string) {
    return parentPath === "/" ? name : `${parentPath}/${name}`;
  }

  normalizeNoteName(name: string) {
    const trimmed = name.trim().replace(/^\/+/, "");
    if (!trimmed) return "";
    if (!/\.[^/.]+$/.test(trimmed)) return `${trimmed}.md`;
    return trimmed;
  }

  promptForName(title: string, placeholder: string, value: string) {
    return new Promise((resolve) => {
      let resolved = false;
      const modal = new Modal(this.app);
      modal.onClose = () => {
        if (!resolved) resolve(null);
      };
      modal.onOpen = () => {
        const { contentEl } = modal;
        contentEl.empty();
        contentEl.createEl("h3", { text: title });
        const input = new TextComponent(contentEl);
        if (placeholder) input.setPlaceholder(placeholder);
        if (value) input.setValue(value);
        input.inputEl.addClass("fm-input");
        input.inputEl.addEventListener("keydown", (evt) => {
          if (evt.key === "Enter") {
            evt.preventDefault();
            evt.stopPropagation();
            const name = input.getValue().trim();
            resolved = true;
            modal.close();
            resolve(name || null);
          } else if (evt.key === "Escape") {
            evt.preventDefault();
            evt.stopPropagation();
            resolved = true;
            modal.close();
            resolve(null);
          }
        });
        const buttons = contentEl.createDiv({ cls: "fm-modal-buttons" });
        const okBtn = new ButtonComponent(buttons)
          .setButtonText("OK")
          .setCta();
        okBtn.onClick(() => {
          const name = input.getValue().trim();
          resolved = true;
          modal.close();
          resolve(name || null);
        });
        const cancelBtn = new ButtonComponent(buttons).setButtonText("Cancel");
        cancelBtn.onClick(() => {
          resolved = true;
          modal.close();
          resolve(null);
        });
        window.setTimeout(() => input.inputEl.focus(), 0);
      };
      modal.open();
    });
  }

  async createNewNote() {
    const rawName = await this.promptForName(
      "New note",
      "Note name",
      "",
    );
    const noteName = this.normalizeNoteName((rawName as string) || "");
    if (!noteName) return;
    const path = this.buildChildPath(this.currentFolder.path, noteName);
    if (this.app.vault.getAbstractFileByPath(path)) {
      new Notice(`Already exists: ${noteName}`);
      return;
    }
    try {
      const file = await this.app.vault.create(path, "");
      this.preselectPath = file.path;
      this.render();
      new Notice(`Created note: ${file.name}`);
    } catch (err) {
      new Notice(`Failed to create note: ${(err as Error).message}`);
    }
  }

  async createNewFolder() {
    const rawName = await this.promptForName(
      "New folder",
      "Folder name",
      "",
    );
    const folderName = ((rawName || "") as string).trim().replace(/^\/+/, "");
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
      new Notice(`Failed to create folder: ${(err as Error).message}`);
    }
  }

  async renameEntry() {
    if (!this.entries.length) return;
    const entry = this.entries[this.selectedIndex];
    const rawName = prompt("Rename to", entry.name);
    const newName = (rawName || "").trim();
    if (!newName || newName === entry.name) return;
    const parentPath = entry.parent?.path || "/";
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
      new Notice(`Failed to rename: ${(err as Error).message}`);
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

  async copyFolderWithNewName(folder: any) {
    const parentPath = folder.parent?.path || "/";
    let counter = 1;
    let newName = `${folder.name} copy`;
    let newPath = this.buildChildPath(parentPath, newName);
    const MAX_ATTEMPTS = 1000;
    while (
      this.app.vault.getAbstractFileByPath(newPath) &&
      counter < MAX_ATTEMPTS
    ) {
      counter++;
      newName = `${folder.name} copy ${counter}`;
      newPath = this.buildChildPath(parentPath, newName);
    }
    if (counter >= MAX_ATTEMPTS) {
      new Notice("Failed to find available folder name");
      return;
    }
    try {
      await this.copyFolderRecursive(folder, newPath);
      this.preselectPath = newPath;
      new Notice(`Duplicated folder: ${newName}`);
    } catch (err) {
      new Notice(`Failed to duplicate: ${(err as Error).message}`);
    }
  }

  togglePreviewPane() {
    this.showPreview = !this.showPreview;
    if (this.previewEl) {
      if (this.showPreview) this.previewEl.removeClass("is-hidden");
      else this.previewEl.addClass("is-hidden");
    }
    if (this.hostEl) {
      if (this.showPreview) this.hostEl.removeClass("single");
      else this.hostEl.addClass("single");
    }
    this.renderPreview();
  }

  togglePreviewMode() {
    this.previewMode = this.previewMode === "rendered" ? "text" : "rendered";
    this.renderPreview();
  }

  openContextMenu(evt: MouseEvent, entry: any) {
    const menu = new Menu();
    if (entry instanceof TFile) {
      menu.addItem((i) =>
        i
          .setTitle("Open")
          .setIcon("file")
          .onClick(() => {
            this.leaf.openFile(entry);
          }),
      );
      menu.addItem((i) =>
        i
          .setTitle("Open in new pane")
          .setIcon("split")
          .onClick(async () => {
            const leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(entry);
            this.app.workspace.revealLeaf(leaf);
          }),
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i
          .setTitle("Rename (r)")
          .setIcon("pencil")
          .onClick(() => {
            this.selectedIndex = this.entries.findIndex(
              (e) => e.path === entry.path,
            );
            this.renameEntry();
          }),
      );
      menu.addItem((i) =>
        i
          .setTitle("Duplicate (D)")
          .setIcon("files")
          .onClick(() => {
            this.selectedIndex = this.entries.findIndex(
              (e) => e.path === entry.path,
            );
            this.duplicateEntry();
          }),
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i
          .setTitle("Copy file (y)")
          .setIcon("copy")
          .onClick(() => {
            this.selectedIndex = this.entries.findIndex(
              (e) => e.path === entry.path,
            );
            this.copyEntry();
          }),
      );
      menu.addItem((i) =>
        i
          .setTitle("Cut file (x)")
          .setIcon("scissors")
          .onClick(() => {
            this.selectedIndex = this.entries.findIndex(
              (e) => e.path === entry.path,
            );
            this.cutEntry();
          }),
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i
          .setTitle("Copy path")
          .setIcon("clipboard")
          .onClick(async () => {
            try {
              await navigator.clipboard.writeText(entry.path);
            } catch {}
          }),
      );
      menu.addItem((i) =>
        i
          .setTitle("Delete (d)")
          .setIcon("trash")
          .onClick(async () => {
            this.selectedIndex = this.entries.findIndex(
              (e) => e.path === entry.path,
            );
            await this.deleteEntry();
          }),
      );
    } else if (entry instanceof TFolder) {
      menu.addItem((i) =>
        i
          .setTitle("Enter folder")
          .setIcon("folder")
          .onClick(() => {
            const idx = this.entries.findIndex((e) => e.path === entry.path);
            if (idx >= 0) {
              this.selectedIndex = idx;
              this.activate();
            }
          }),
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i
          .setTitle("Rename (r)")
          .setIcon("pencil")
          .onClick(() => {
            this.selectedIndex = this.entries.findIndex(
              (e) => e.path === entry.path,
            );
            this.renameEntry();
          }),
      );
      menu.addItem((i) =>
        i
          .setTitle("Duplicate (D)")
          .setIcon("files")
          .onClick(() => {
            this.selectedIndex = this.entries.findIndex(
              (e) => e.path === entry.path,
            );
            this.duplicateEntry();
          }),
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i
          .setTitle("Copy folder (y)")
          .setIcon("copy")
          .onClick(() => {
            this.selectedIndex = this.entries.findIndex(
              (e) => e.path === entry.path,
            );
            this.copyEntry();
          }),
      );
      menu.addItem((i) =>
        i
          .setTitle("Cut folder (x)")
          .setIcon("scissors")
          .onClick(() => {
            this.selectedIndex = this.entries.findIndex(
              (e) => e.path === entry.path,
            );
            this.cutEntry();
          }),
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i
          .setTitle("Copy path")
          .setIcon("clipboard")
          .onClick(async () => {
            try {
              await navigator.clipboard.writeText(entry.path);
            } catch {}
          }),
      );
    }
    menu.showAtMouseEvent(evt);
  }

  jumpTop() {
    if (!this.entries.length) return;
    this.selectedIndex = 0;
    this.renderSelectionOnly();
    const node = this.listEl.querySelectorAll(".fm-item")[this.selectedIndex];
    if (node) node.scrollIntoView({ block: "nearest" });
    this.renderPreview();
  }

  jumpBottom() {
    if (!this.entries.length) return;
    this.selectedIndex = this.entries.length - 1;
    this.renderSelectionOnly();
    const node = this.listEl.querySelectorAll(".fm-item")[this.selectedIndex];
    if (node) node.scrollIntoView({ block: "nearest" });
    this.renderPreview();
  }

  // Navigate to vault root (gh or g/)
  gotoVaultRoot() {
    const root = this.app.vault.getRoot();
    if (root) {
      this.currentFolder = root;
      this.selectedIndex = 0;
      if (this.searchActive) this.exitSearchMode(false);
      this.render();
      new Notice("Switched to vault root");
    }
  }

  // Navigate to next/previous tab with File Nav view
  gotoTab(direction: number) {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
    if (leaves.length <= 1) {
      new Notice("No other File Nav tabs open");
      return;
    }
    
    const currentIndex = leaves.findIndex((leaf: any) => leaf === this.leaf);
    if (currentIndex === -1) {
      new Notice("Could not find current tab");
      return;
    }
    
    const targetIndex = direction > 0
      ? (currentIndex + 1) % leaves.length
      : (currentIndex - 1 + leaves.length) % leaves.length;
    const targetLeaf = leaves[targetIndex];
    
    if (targetLeaf) {
      this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
      const targetView = targetLeaf.view;
      if (targetView instanceof FmView) {
        window.requestAnimationFrame(() => targetView.focusNavigation());
      }
      new Notice(`Switched to File Nav tab ${targetIndex + 1}/${leaves.length}`);
    }
  }

  // Navigate to next tab with File Nav view
  gotoNextTab() {
    this.gotoTab(1);
  }

  // Navigate to previous tab with File Nav view
  gotoPrevTab() {
    this.gotoTab(-1);
  }

  // Open a new File Nav tab
  async openNewTab() {
    const startFolder = this.currentFolder || this.app.vault.getRoot();
    const leaf = this.app.workspace.getLeaf(true); // true = split/new tab
    await leaf.setViewState({
      type: VIEW_TYPE_FM,
      active: true,
      state: {
        startFolder: startFolder.path,
        selectFile: null,
        prevFile: null,
      },
    });
    this.app.workspace.revealLeaf(leaf);
    new Notice("Opened File Nav in new tab");
  }

  cycleSearch(step: number) {
    const activeSearchValue =
      this.searchMode === "search"
        ? this.searchInputEl.value
        : this.searchQuery;
    const query =
      (activeSearchValue || "").trim() ||
      this.searchQuery ||
      this.lastSearchQuery ||
      "";
    if (!query) return;
    // Cycle among matches in the full list
    const matches = this.allEntries
      .map((e, i) => ({ e, i }))
      .filter((x) => x.e.name.toLowerCase().includes(query.toLowerCase()));
    if (!matches.length) return;
    const curEntry = this.entries[this.selectedIndex];
    const curIndexInAll = curEntry
      ? this.allEntries.findIndex((e) => e.path === curEntry.path)
      : -1;
    let pos = matches.findIndex((x) => x.i === curIndexInAll);
    if (pos === -1) pos = step > 0 ? -1 : 0;
    pos = (pos + step + matches.length) % matches.length;
    const targetAllIndex = matches[pos]?.i ?? 0;
    const idxInEntries = this.entries.findIndex(
      (e) => e.path === this.allEntries[targetAllIndex].path,
    );
    if (idxInEntries >= 0) {
      this.selectedIndex = idxInEntries;
      this.renderSelectionOnly();
      const node = this.listEl.querySelectorAll(".fm-item")[this.selectedIndex];
      if (node) node.scrollIntoView({ block: "nearest" });
      this.renderPreview();
    }
  }

  renderStatusBar() {
    if (!this.statusEl) return;
    this.statusEl.empty();
    
    // Show selection count if any files are selected
    if (this.selectedFiles.size > 0) {
      const selectionInfo = this.statusEl.createSpan({ 
        cls: "fm-selection-info",
        text: `${this.selectedFiles.size} selected` 
      });
      this.statusEl.createSpan({ cls: "fm-status-sep", text: "•" });
    }
    
    const hints = [
      { keys: ["j", "k"], desc: "navigate" },
      { keys: ["h", "l"], desc: "parent/open" },
      { keys: ["/"], desc: "search" },
      { keys: ["f"], desc: "filter" },
      { keys: ["v", "Space"], desc: "select" },
      { keys: ["Ctrl+a"], desc: "select all" },
      { keys: ["a", "A"], desc: "new note/folder" },
      { keys: ["r"], desc: "rename" },
      { keys: ["D"], desc: "duplicate" },
      { keys: ["y"], desc: "copy" },
      { keys: ["x"], desc: "cut" },
      { keys: ["d"], desc: "delete" },
      { keys: ["p"], desc: "paste" },
      { keys: ["zd"], desc: "toggle panes" },
      { keys: ["zp"], desc: "preview mode" },
      { keys: ["q"], desc: "close" },
    ];
    hints.forEach((hint, idx) => {
      if (idx > 0) {
        this.statusEl.createSpan({ cls: "fm-status-sep", text: "•" });
      }
      const hintEl = this.statusEl.createSpan({ cls: "fm-status-hint" });
      hint.keys.forEach((key, kidx) => {
        if (kidx > 0) hintEl.createSpan({ text: "/" });
        hintEl.createSpan({ cls: "fm-status-key", text: key });
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
      const title = this.detailsEl.createEl("div", {
        cls: "fm-details-title",
        text: entry.name,
      });
      title.setAttr("title", entry.path);
    }
    const meta = this.showDetails
      ? this.detailsEl.createEl("div", { cls: "fm-details-meta" })
      : null;
    if (isFolder) {
      const kids = this.getFolderEntries(entry);
      const dcount = kids.filter((k) => k instanceof TFolder).length;
      const fcount = kids.length - dcount;
      if (meta)
        meta.setText(`${entry.path} • ${dcount} folders, ${fcount} files`);
      return; // nothing to render as markdown
    }

    // File details
    const size = entry.stat?.size ?? 0;
    const mtime = entry.stat?.mtime ? new Date(entry.stat.mtime) : null;
    if (meta) {
      const parts = [
        entry.path,
        size ? `${size} bytes` : null,
        mtime ? `modified ${mtime.toLocaleString()}` : null,
      ].filter(Boolean);
      meta.setText(parts.join(" • "));
    }

    // Check if it's an image file
    const ext = entry.extension.toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) {
      if (!this.showPreview) return;
      if (this.previewMode === "text") {
        this.previewEl.createEl("div", {
          cls: "fm-preview-text",
          text: "Image preview disabled in text mode.",
        });
        return;
      }
      try {
        const img = this.previewEl.createEl("img");
        img.src = this.app.vault.getResourcePath(entry);
        img.alt = entry.name;
      } catch (e) {
        this.previewEl.createEl("div", {
          cls: "fm-preview-error",
          text: "Unable to load image.",
        });
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
      this.previewEl.removeClass("markdown-preview-view");
      if (this.previewMode === "text") {
        this.previewEl.createEl("pre", { cls: "fm-preview-text", text });
      } else {
        await MarkdownRenderer.renderMarkdown(
          text,
          this.previewEl,
          entry.path,
          this,
        );
        this.previewEl.addClass("markdown-preview-view");
      }
    } catch (e) {
      if (token !== this.previewToken) return;
      this.previewEl.createEl("div", {
        cls: "fm-preview-error",
        text: "Unable to render preview.",
      });
    }
  }
}

interface FmPluginSettings {
  showPreview: boolean;
  showDetails: boolean;
  showHiddenFiles: boolean;
  showHiddenFolders: boolean;
  showFileExtensions: boolean;
  sortFoldersFirst: boolean;
  confirmCopy: boolean;
  confirmMove: boolean;
}

const DEFAULT_SETTINGS: FmPluginSettings = {
  showPreview: true,
  showDetails: true,
  showHiddenFiles: true,
  showHiddenFolders: true,
  showFileExtensions: true,
  sortFoldersFirst: true,
  confirmCopy: false,
  confirmMove: false,
};

class FmPlugin extends Plugin {
  settings: FmPluginSettings;
  async onload() {
    await this.loadSettings();

    if ((this.app as any).viewRegistry?.viewByType?.[VIEW_TYPE_FM]) {
      (this.app as any).viewRegistry.unregisterView(VIEW_TYPE_FM);
    }
    this.registerView(VIEW_TYPE_FM, (leaf) => new FmView(leaf, this.app, this));

    this.addSettingTab(new FmSettingTab(this.app, this));

    this.addCommand({
      id: "open-fm-file-manager",
      name: "Open File Nav",
      callback: () => this.openFileNav(),
    });

    this.addCommand({
      id: "open-fm-file-manager-new-tab",
      name: "Open File Nav in new tab",
      callback: () => this.openFileNavInNewTab(),
    });
  }

  onunload() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
    for (const leaf of leaves) {
      leaf.setViewState({ type: "empty" });
    }
    if ((this.app as any).viewRegistry?.viewByType?.[VIEW_TYPE_FM]) {
      (this.app as any).viewRegistry.unregisterView(VIEW_TYPE_FM);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }

  async openFileNav() {
    const activeFile = this.app.workspace.getActiveFile();
    const leaf = this.app.workspace.getLeaf(false);
    const startFolder = activeFile?.parent || this.app.vault.getRoot();
    await leaf.setViewState({
      type: VIEW_TYPE_FM,
      active: true,
      state: {
        startFolder: startFolder.path,
        selectFile: activeFile?.path || null,
        prevFile: activeFile?.path || null,
      },
    });
    this.app.workspace.revealLeaf(leaf);
  }

  async openFileNavInNewTab() {
    const activeFile = this.app.workspace.getActiveFile();
    const leaf = this.app.workspace.getLeaf(true); // true = split/new tab
    const startFolder = activeFile?.parent || this.app.vault.getRoot();
    await leaf.setViewState({
      type: VIEW_TYPE_FM,
      active: true,
      state: {
        startFolder: startFolder.path,
        selectFile: activeFile?.path || null,
        prevFile: activeFile?.path || null,
      },
    });
    this.app.workspace.revealLeaf(leaf);
  }
}

class FmSettingTab extends PluginSettingTab {
  plugin: FmPlugin;
  
  constructor(app: any, plugin: FmPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h3", {
      text: "File Nav - Ranger for Obsidian Settings",
    });

    new Setting(containerEl)
      .setName("Vim users")
      .setDesc(
        'In `.obsidian.vimrc`, map a key to the command id, for example: `exmap ranger obcommand file-nav-ranger:open-fm-file-manager` then `nmap - :ranger<CR>`',
      );

    new Setting(containerEl)
      .setName("Show preview by default")
      .setDesc("Show the markdown preview panel on the right")
      .addToggle((t) =>
        t.setValue(!!this.plugin.settings.showPreview).onChange(async (v) => {
          this.plugin.settings.showPreview = v;
          await this.plugin.saveSettings();
          const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
          for (const leaf of leaves) {
            const view = leaf.view as FmView;
            view.showPreview = v;
            if (view.previewEl) {
              if (v) view.previewEl.removeClass("is-hidden");
              else view.previewEl.addClass("is-hidden");
              view.renderPreview();
            }
            if (view.hostEl) {
              if (v) view.hostEl.removeClass("single");
              else view.hostEl.addClass("single");
            }
          }
        }),
      );

    new Setting(containerEl)
      .setName("Show details by default")
      .setDesc("Show the file/folder details panel above the preview")
      .addToggle((t) =>
        t.setValue(!!this.plugin.settings.showDetails).onChange(async (v) => {
          this.plugin.settings.showDetails = v;
          await this.plugin.saveSettings();
          const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
          for (const leaf of leaves) {
            const view = leaf.view as FmView;
            view.showDetails = v;
            if (view.detailsEl) {
              if (v) view.detailsEl.removeClass("is-hidden");
              else view.detailsEl.addClass("is-hidden");
              view.renderPreview();
            }
          }
        }),
      );

    containerEl.createEl("h4", { text: "File options" });

    new Setting(containerEl)
      .setName("Show file extensions")
      .setDesc("Display file extensions in the file list")
      .addToggle((t) =>
        t
          .setValue(!!this.plugin.settings.showFileExtensions)
          .onChange(async (v) => {
            this.plugin.settings.showFileExtensions = v;
            await this.plugin.saveSettings();
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
            for (const leaf of leaves) {
              const view = leaf.view as FmView;
              view.showFileExtensions = v;
              view.render();
            }
          }),
      );

    new Setting(containerEl)
      .setName("Show hidden files")
      .setDesc('Include dotfiles (files starting with ".")')
      .addToggle((t) =>
        t
          .setValue(!!this.plugin.settings.showHiddenFiles)
          .onChange(async (v) => {
            this.plugin.settings.showHiddenFiles = v;
            await this.plugin.saveSettings();
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
            for (const leaf of leaves) {
              const view = leaf.view as FmView;
              view.showHiddenFiles = v;
              view.render();
            }
          }),
      );

    containerEl.createEl("h4", { text: "Folder options" });

    new Setting(containerEl)
      .setName("Show hidden folders")
      .setDesc('Include folders starting with "."')
      .addToggle((t) =>
        t
          .setValue(!!this.plugin.settings.showHiddenFolders)
          .onChange(async (v) => {
            this.plugin.settings.showHiddenFolders = v;
            await this.plugin.saveSettings();
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
            for (const leaf of leaves) {
              const view = leaf.view as FmView;
              view.showHiddenFolders = v;
              view.render();
            }
          }),
      );

    new Setting(containerEl)
      .setName("Group folders first")
      .setDesc("List folders before files when sorting")
      .addToggle((t) =>
        t
          .setValue(!!this.plugin.settings.sortFoldersFirst)
          .onChange(async (v) => {
            this.plugin.settings.sortFoldersFirst = v;
            await this.plugin.saveSettings();
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
            for (const leaf of leaves) {
              const view = leaf.view as FmView;
              view.sortFoldersFirst = v;
              view.render();
            }
          }),
      );

    containerEl.createEl("h4", { text: "Multi-file operations" });

    new Setting(containerEl)
      .setName("Confirm before copying")
      .setDesc("Show confirmation dialog when copying files (delete always requires confirmation)")
      .addToggle((t) =>
        t
          .setValue(!!this.plugin.settings.confirmCopy)
          .onChange(async (v) => {
            this.plugin.settings.confirmCopy = v;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Confirm before moving")
      .setDesc("Show confirmation dialog when moving files (delete always requires confirmation)")
      .addToggle((t) =>
        t
          .setValue(!!this.plugin.settings.confirmMove)
          .onChange(async (v) => {
            this.plugin.settings.confirmMove = v;
            await this.plugin.saveSettings();
          }),
      );
  }
}

export default FmPlugin;
