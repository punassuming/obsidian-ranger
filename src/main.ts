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
  App,
  Plugin,
  ItemView,
  TFile,
  TFolder,
  TAbstractFile,
  WorkspaceLeaf,
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

type Entry = TFile | TFolder;
type ClipboardOperation = "copy" | "cut";
type FavoriteTarget = {
  path: string;
  isFolder: boolean;
};
type ChordOption = {
  keys: string[];
  desc: string;
  action: (view: FmView) => void;
};
type FmViewState = {
  startFolder?: string | null;
  selectFile?: string | null;
  prevFile?: string | null;
};
type AppWithViewRegistry = App & {
  viewRegistry?: {
    viewByType?: Record<string, unknown>;
    unregisterView?: (type: string) => void;
  };
};
type LeafWithTitle = WorkspaceLeaf & {
  setTitle?: (title: string) => void;
  tabHeaderInnerTitleEl?: HTMLElement;
};
type FmPluginSettingsData = Partial<FmPluginSettings>;

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

function setEntryIcon(el: HTMLElement, entry: TAbstractFile) {
  if (entry instanceof TFolder) {
    setIcon(el, "folder");
  } else if (entry instanceof TFile) {
    setIcon(el, iconForFileName(entry.name));
  } else {
    setIcon(el, "file");
  }
}

const VIEW_TYPE_FM = "file-nav-ranger-view";
const TAB_SWITCH_NOTICE_THROTTLE_MS = 500;
const CHORD_PENDING_TIMEOUT_MS = 2500;
const VAULT_REFRESH_DEBOUNCE_MS = 150;
const ENTRY_NAME_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

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

const SHORT_MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
  {
    keys: ["g", "f"],
    desc: "next favorite",
    action: (view: FmView) => view.gotoNextFavorite(),
  },
  {
    keys: ["g", "F"],
    desc: "previous favorite",
    action: (view: FmView) => view.gotoPrevFavorite(),
  },
];
const Z_CHORD_OPTIONS: ChordOption[] = [
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
  {
    keys: ["z", "m"],
    desc: "deer mode (structure-only)",
    action: (view: FmView) => { void view.toggleDeerMode(); },
  },
];
function normalizePathForPrefixCheck(path: string): string {
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "");
}

function isDescendantPath(parentPath: string, maybeChildPath: string): boolean {
  const parent = normalizePathForPrefixCheck(parentPath);
  const child = normalizePathForPrefixCheck(maybeChildPath);
  if (parent === "/") return child !== "/";
  return child.startsWith(parent + "/");
}

function isFolderIntoDescendant(source: Entry, destFolder: TFolder): boolean {
  if (!(source instanceof TFolder)) return false;
  const srcPath = normalizePathForPrefixCheck(source.path);
  const destPath = normalizePathForPrefixCheck(destFolder.path);
  return srcPath === destPath || isDescendantPath(srcPath, destPath);
}

class FmView extends ItemView {
  app: App;
  plugin: FmPlugin;
  currentFolder: TFolder;
  entries: Entry[];
  allEntries: Entry[];
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
  showInlineMetadata: boolean;
  splitRatio: number;
  previewMode: string;
  clipboard: Entry[] | null;
  clipboardOperation: ClipboardOperation | null;
  selectedFiles: Set<string>;
  folderHistory: Map<string, string>;
  lastTabSwitchNoticeAt: number;
  searchMode: string | null;
  filterActive: boolean;
  chordOverlayEl: HTMLElement | null;
  chordOverlayTitleEl: HTMLElement | null;
  chordOverlayListEl: HTMLElement | null;
  _gChordPending: boolean;
  _zChordPending: boolean;
  _vaultRefreshTimer: number | null;
  _vaultRefreshRequested: boolean;
  chordTimeoutId: number | null;
  chordPendingUntil: number | null;
  hostEl: HTMLElement;
  pathEl: HTMLElement;
  resizerEl: HTMLElement;
  searchWrapEl: HTMLElement;
  searchInputEl: HTMLInputElement;
  layoutEl: HTMLElement;
  leftEl: HTMLElement;
  listEl: HTMLElement;
  rightEl: HTMLElement;
  detailsEl: HTMLElement;
  previewEl: HTMLElement;
  statusEl: HTMLElement;
  
  constructor(leaf: WorkspaceLeaf, app: App, plugin: FmPlugin) {
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
    this.showInlineMetadata = false;
    this.splitRatio = 35;
    this.previewMode = "rendered";
    // Clipboard for copy/move operations
    this.clipboard = null;
    this.clipboardOperation = null; // 'copy' or 'cut'
    // Multiple selection support
    this.selectedFiles = new Set(); // Set of file/folder paths for multi-selection
    // History: remember last selected file in each folder
    this.folderHistory = new Map(); // folderPath -> entryPath
    this.lastTabSwitchNoticeAt = 0;
    // Search/filter mode tracking
    this.searchMode = null; // 'search' or 'filter'
    this.filterActive = false;
    this.chordOverlayEl = null;
    this.chordOverlayTitleEl = null;
    this.chordOverlayListEl = null;
    this._gChordPending = false;
    this._zChordPending = false;
    this._vaultRefreshTimer = null;
    this._vaultRefreshRequested = false;
    this.chordTimeoutId = null;
    this.chordPendingUntil = null;
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
    const leaf = this.leaf as LeafWithTitle;
    const viewWithTitle = this as { setTitle?: (title: string) => void };
    if (leaf.setTitle) {
      leaf.setTitle(title);
    } else if (viewWithTitle.setTitle) {
      viewWithTitle.setTitle(title);
    } else if (leaf.tabHeaderInnerTitleEl) {
      leaf.tabHeaderInnerTitleEl.textContent = title;
    }
  }

  async setState(state: FmViewState) {
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

    // Keep view in sync with external changes (other panes/plugins/sync).
    const scheduleRefresh = this.scheduleVaultRefresh.bind(this);
    this.registerEvent(this.app.vault.on("create", scheduleRefresh));
    this.registerEvent(this.app.vault.on("delete", scheduleRefresh));
    this.registerEvent(this.app.vault.on("rename", scheduleRefresh));
    this.registerEvent(this.app.vault.on("modify", scheduleRefresh));

    // adopt defaults from plugin settings if available
    const s = this.plugin?.settings;
    if (s) {
      // Deer mode overrides preview and details settings
      if (s.deerMode) {
        this.showPreview = false;
        this.showDetails = false;
      } else {
        this.showPreview = !!s.showPreview;
        this.showDetails = !!s.showDetails;
      }
      this.showHiddenFiles = !!s.showHiddenFiles;
      this.showHiddenFolders = !!s.showHiddenFolders;
      this.showFileExtensions = !!s.showFileExtensions;
      this.sortFoldersFirst = !!s.sortFoldersFirst;
      this.showInlineMetadata = !!s.showInlineMetadata;
      this.splitRatio = typeof s.defaultSplitRatio === "number" ? s.defaultSplitRatio : 35;
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

    // Path bar (breadcrumb)
    this.pathEl = host.createDiv({ cls: "fm-breadcrumb" });
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
    this.layoutEl.style.gridTemplateColumns = `${this.splitRatio}% 4px 1fr`;
    this.leftEl = this.layoutEl.createDiv({ cls: "fm-left" });
    this.listEl = this.leftEl.createDiv({
      cls: "fm-list",
      attr: { tabindex: "0" },
    });
    // Resizer divider
    this.resizerEl = this.layoutEl.createDiv({ cls: "fm-resizer" });
    this.registerDomEvent(this.resizerEl, "mousedown", (evt: MouseEvent) => {
      evt.preventDefault();
      this.resizerEl.addClass("is-dragging");
      const startX = evt.clientX;
      const containerWidth = this.layoutEl.offsetWidth;
      const startRatio = this.splitRatio;
      const onMouseMove = (moveEvt: MouseEvent) => {
        const delta = moveEvt.clientX - startX;
        const newRatio = Math.min(80, Math.max(10, startRatio + (delta / containerWidth) * 100));
        this.splitRatio = newRatio;
        this.layoutEl.style.gridTemplateColumns = `${newRatio}% 4px 1fr`;
      };
      const onMouseUp = () => {
        this.resizerEl.removeClass("is-dragging");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        this.plugin.settings.defaultSplitRatio = Math.round(this.splitRatio);
        void this.plugin.saveSettings();
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
    this.rightEl = this.layoutEl.createDiv({ cls: "fm-right" });
    this.detailsEl = this.rightEl.createDiv({ cls: "fm-details" });
    this.previewEl = this.rightEl.createDiv({ cls: "fm-preview" });
    if (!this.showDetails) this.detailsEl.addClass("is-hidden");
    if (!this.showPreview) {
      this.previewEl.addClass("is-hidden");
      this.hostEl.addClass("single");
      this.layoutEl.style.gridTemplateColumns = "";
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
      if (k === "Escape" && this.isChordPending()) {
        evt.preventDefault();
        evt.stopPropagation();
        this.cancelChordOverlay();
        return;
      }
      if (this.hasOpenModal()) {
        return;
      }
      if (this.isChordPending()) {
        evt.preventDefault();
        evt.stopPropagation();
        if (this.tryHandleChordFollowup(k)) {
          return;
        }
        if (this.isModifierKey(k)) {
          return;
        }
        // Any other key cancels the pending chord so the overlay cannot get stuck.
        this.cancelChordOverlay();
        return;
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
    if (this._vaultRefreshTimer !== null) {
      window.clearTimeout(this._vaultRefreshTimer);
      this._vaultRefreshTimer = null;
    }
    this.cancelChordOverlay();
  }

  scheduleVaultRefresh() {
    if (!this.initialized) return;
    this._vaultRefreshRequested = true;
    if (this._vaultRefreshTimer !== null) return;
    this._vaultRefreshTimer = window.setTimeout(() => {
      this._vaultRefreshTimer = null;
      if (!this._vaultRefreshRequested) return;
      this._vaultRefreshRequested = false;
      const selectedPath = this.entries?.[this.selectedIndex]?.path ?? null;
      this.allEntries = this.getFolderEntries(this.currentFolder);
      this.updateEntriesForFilter();
      if (selectedPath) {
        const idx = this.entries.findIndex((e) => e.path === selectedPath);
        if (idx >= 0) this.selectedIndex = idx;
      }
      if (this.selectedIndex >= this.entries.length) {
        this.selectedIndex = Math.max(0, this.entries.length - 1);
      }
      this.render();
    }, VAULT_REFRESH_DEBOUNCE_MS);
  }

  setStartFolder(path: string | null) {
    const abs = path ? this.app.vault.getAbstractFileByPath(path) : null;
    let folder = this.app.vault.getRoot();
    if (abs instanceof TFolder) folder = abs;
    else if (abs instanceof TFile) folder = abs.parent || folder;
    this.currentFolder = folder;
    this.selectedIndex = 0;
    if (this.searchActive) this.exitSearchMode(false);
    this.render();
  }

  setStartLocation(filePath: string | null) {
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

  getFolderEntries(folder: TFolder) {
    if (!(folder instanceof TFolder)) return [];
    const children = folder.children || [];
    const dirs: TFolder[] = [];
    const files: TFile[] = [];
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
      dirs.sort((a, b) => ENTRY_NAME_COLLATOR.compare(a.name, b.name));
      files.sort((a, b) => ENTRY_NAME_COLLATOR.compare(a.name, b.name));
      return [...dirs, ...files];
    }
    return [...dirs, ...files].sort((a, b) =>
      ENTRY_NAME_COLLATOR.compare(a.name, b.name),
    );
  }

  getEntryLabel(entry: Entry) {
    if (entry instanceof TFile && !this.showFileExtensions) {
      return entry.basename;
    }
    return entry.name;
  }

  getEntrySearchName(entry: Entry) {
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

    // Render breadcrumb path
    this.pathEl.empty();
    const folderPath = this.currentFolder.path;
    if (folderPath === "/") {
      const seg = this.pathEl.createEl("span", { cls: "fm-breadcrumb-segment is-current", text: "/" });
      seg.setAttr("title", "/");
    } else {
      // Root segment
      const rootSeg = this.pathEl.createEl("span", { cls: "fm-breadcrumb-segment", text: "/" });
      rootSeg.addEventListener("click", () => this.setStartFolder("/"));
      const segments = folderPath.split("/");
      for (let i = 0; i < segments.length; i++) {
        this.pathEl.createEl("span", { cls: "fm-breadcrumb-sep", text: " > " });
        const segPath = segments.slice(0, i + 1).join("/");
        const isCurrent = i === segments.length - 1;
        const seg = this.pathEl.createEl("span", {
          cls: "fm-breadcrumb-segment" + (isCurrent ? " is-current" : ""),
          text: segments[i],
        });
        seg.setAttr("title", segPath);
        if (!isCurrent) {
          seg.addEventListener("click", () => this.setStartFolder(segPath));
        }
      }
    }

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
      if (selectedEntry) {
        this.folderHistory.set(folderPath, selectedEntry.path);
      }
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
    this.cancelChordOverlay();
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

      // Inline metadata badge
      if (this.showInlineMetadata) {
        const metaEl = item.createEl("span", { cls: "fm-item-meta" });
        if (entry instanceof TFile) {
          const date = new Date(entry.stat.mtime);
          metaEl.textContent = `${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
        } else if (entry instanceof TFolder) {
          const count = (entry.children || []).length;
          metaEl.textContent = `${count} item${count !== 1 ? "s" : ""}`;
        }
      }

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
        '<span class="fm-match">' +
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
    this.cancelChordOverlay();
    this._gChordPending = true;
    this.showChordOverlay("g", G_CHORD_OPTIONS);
  }

  handleZ() {
    this.cancelChordOverlay();
    this._zChordPending = true;
    this.showChordOverlay("z", Z_CHORD_OPTIONS);
  }

  showChordOverlay(label: string, options: ChordOption[]) {
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
    options.forEach((option) => {
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
    this.startChordTimeout();
  }

  hideChordOverlay() {
    this.clearChordTimeout();
    if (this.chordOverlayEl) {
      this.chordOverlayEl.addClass("is-hidden");
    }
  }

  cancelChordOverlay() {
    if (this._gChordPending) {
      this._gChordPending = false;
    }
    if (this._zChordPending) {
      this._zChordPending = false;
    }
    this.hideChordOverlay();
  }

  isChordPending() {
    if (!this._gChordPending && !this._zChordPending) return false;
    if (this.chordPendingUntil !== null && Date.now() >= this.chordPendingUntil) {
      this.cancelChordOverlay();
      return false;
    }
    return true;
  }

  clearChordTimeout() {
    if (this.chordTimeoutId !== null) {
      window.clearTimeout(this.chordTimeoutId);
      this.chordTimeoutId = null;
    }
    this.chordPendingUntil = null;
  }

  startChordTimeout() {
    this.clearChordTimeout();
    this.chordPendingUntil = Date.now() + CHORD_PENDING_TIMEOUT_MS;
    this.chordTimeoutId = window.setTimeout(() => {
      this.cancelChordOverlay();
    }, CHORD_PENDING_TIMEOUT_MS);
  }

  tryHandleChordFollowup(key: string) {
    if (this._gChordPending) {
      // Preserve case to distinguish gt and gT.
      const option = G_CHORD_OPTIONS.find((entry) => entry.keys[1] === key);
      if (!option) return false;
      this.cancelChordOverlay();
      option.action(this);
      return true;
    }
    if (this._zChordPending) {
      const normalizedKey = key.toLowerCase();
      const option = Z_CHORD_OPTIONS.find(
        (entry) => entry.keys[1] === normalizedKey,
      );
      if (!option) return false;
      this.cancelChordOverlay();
      option.action(this);
      return true;
    }
    return false;
  }

  isModifierKey(key: string) {
    return key === "Shift" || key === "Control" || key === "Alt" || key === "Meta";
  }

  hasOpenModal() {
    const stack = (this.app.workspace as { modalStack?: unknown[] }).modalStack;
    if (Array.isArray(stack) && stack.length > 0) return true;
    if (document.querySelector(".modal-container:not(.is-hidden)") !== null) return true;
    if (document.querySelector(".modal.mod-dim") !== null) return true;
    const activeEl = document.activeElement;
    return activeEl instanceof HTMLElement && activeEl.closest(".modal") !== null;
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
    if (!entry) return;
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

  getSelectedEntries(): Entry[] {
    // Return selected files if any, otherwise current entry
    if (this.selectedFiles.size > 0) {
      return this.entries.filter(e => this.selectedFiles.has(e.path));
    }
    if (this.entries.length > 0) {
      const entry = this.entries[this.selectedIndex];
      return entry ? [entry] : [];
    }
    return [];
  }

  copyEntry() {
    const entries = this.getSelectedEntries();
    if (entries.length === 0) return;
    
    this.clipboard = entries;
    this.clipboardOperation = "copy";
    
    if (entries.length === 1) {
      const entry = entries[0];
      if (entry) {
        new Notice(`Copied: ${entry.name}`);
      }
    } else {
      new Notice(`Copied ${entries.length} items`);
    }
    this.renderStatusBar();
  }

  cutEntry() {
    const entries = this.getSelectedEntries();
    if (entries.length === 0) return;
    
    this.clipboard = entries;
    this.clipboardOperation = "cut";
    
    if (entries.length === 1) {
      const entry = entries[0];
      if (entry) {
        new Notice(`Cut: ${entry.name} (ready to move)`);
      }
    } else {
      new Notice(`Cut ${entries.length} items (ready to move)`);
    }
    this.renderStatusBar();
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
      const entry = entries[0];
      if (entry) {
        new Notice(`${actionLabel}d: ${entry.name}`);
      }
    } else {
      new Notice(`${actionLabel}d ${entries.length} items`);
    }
  }

  async showDeleteConfirmation(entries: Entry[], actionLabel: string) {
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
      
      entries.forEach((entry) => {
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

  async trashOrDeleteEntry(entry: Entry, isFolder: boolean) {
    const fileManager = this.app.fileManager;
    if (!fileManager?.trashFile) {
      new Notice("Trash is unavailable; deleting permanently.");
      // eslint-disable-next-line obsidianmd/prefer-file-manager-trash-file
      await this.app.vault.delete(entry, isFolder ? true : undefined);
      return;
    }
    await fileManager.trashFile(entry);
  }

  async pasteEntry() {
    if (!this.clipboard) {
      new Notice("Nothing to paste");
      return;
    }

    const sources = Array.isArray(this.clipboard) ? this.clipboard : [this.clipboard];
    const destFolder = this.currentFolder;
    const operation = this.clipboardOperation;
    if (!operation) {
      new Notice("Nothing to paste");
      return;
    }
    
    // Check if confirmation is needed based on settings
    const needsConfirmation = this.shouldConfirmPaste(sources, operation);
    
    if (needsConfirmation) {
      const confirmed = await this.showPasteConfirmation(sources, operation, destFolder);
      if (!confirmed) return;
    }

    let successCount = 0;
    let failCount = 0;
    
    for (const source of sources) {
      let success = false;
      try {
        // Safety: prevent pasting/moving/copying a folder into itself or any descendant.
        if (isFolderIntoDescendant(source, destFolder)) {
          new Notice(`Cannot paste folder into itself or a descendant: ${source.name}`);
          failCount++;
          continue;
        }
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
    // Re-render status bar to reflect updated clipboard state
    this.renderStatusBar();
    this.render();
    
    // Show summary
    if (sources.length === 1) {
      if (successCount > 0) {
        const verb = operation === "copy" ? "Copied" : "Moved";
        const source = sources[0];
        if (source) {
          new Notice(`${verb}: ${source.name}`);
        }
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

  shouldConfirmPaste(sources: Entry[], operation: ClipboardOperation) {
    // Check settings for copy/move confirmation
    const settings = this.plugin?.settings;
    if (!settings) return false;
    
    if (operation === "copy" && settings.confirmCopy) return true;
    if (operation === "cut" && settings.confirmMove) return true;
    
    return false;
  }

  async showPasteConfirmation(
    sources: Entry[],
    operation: ClipboardOperation,
    destFolder: TFolder,
  ) {
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
      
      sources.forEach((source) => {
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

  isSameFolderCopy(
    source: Entry,
    destFolder: TFolder,
  ): source is TFile {
    return (
      source instanceof TFile &&
      source.parent?.path === destFolder.path &&
      this.clipboardOperation === "copy"
    );
  }

  async copyFileWithNewName(file: TFile, destFolder: TFolder) {
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

  async copyToFolder(source: Entry, destFolder: TFolder) {
    if (isFolderIntoDescendant(source, destFolder)) {
      new Notice(`Cannot copy folder into itself or a descendant: ${source.name}`);
      return false;
    }
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

  async copyFolderRecursive(sourceFolder: TFolder, destPath: string) {
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

  async moveToFolder(source: Entry, destFolder: TFolder) {
    if (isFolderIntoDescendant(source, destFolder)) {
      new Notice(`Cannot move folder into itself or a descendant: ${source.name}`);
      return false;
    }
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

  promptForName(title: string, placeholder: string, value: string): Promise<string | null> {
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
    const folderName = (rawName || "").trim().replace(/^\/+/, "");
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
    if (!entry) return;
    const rawName = await this.promptForName("Rename", "Enter new name", entry.name);
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
    if (!entry) return;
    if (entry instanceof TFile) {
      await this.copyFileWithNewName(entry, entry.parent || this.currentFolder);
    } else if (entry instanceof TFolder) {
      await this.copyFolderWithNewName(entry);
    }
    this.render();
  }

  async copyFolderWithNewName(folder: TFolder) {
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
    if (this.layoutEl) {
      this.layoutEl.style.gridTemplateColumns = this.showPreview
        ? `${this.splitRatio}% 4px 1fr`
        : "";
    }
    this.renderPreview();
  }

  togglePreviewMode() {
    this.previewMode = this.previewMode === "rendered" ? "text" : "rendered";
    this.renderPreview();
  }

  updateViewDeerModeState(view: FmView, deerModeEnabled: boolean) {
    if (deerModeEnabled) {
      // Deer mode ON: hide both preview and details
      view.showPreview = false;
      view.showDetails = false;
    } else {
      // Deer mode OFF: restore from settings
      view.showPreview = !!this.plugin.settings.showPreview;
      view.showDetails = !!this.plugin.settings.showDetails;
    }

    // Update DOM classes for preview
    if (view.previewEl) {
      if (view.showPreview) view.previewEl.removeClass("is-hidden");
      else view.previewEl.addClass("is-hidden");
    }

    // Update DOM classes for details
    if (view.detailsEl) {
      if (view.showDetails) view.detailsEl.removeClass("is-hidden");
      else view.detailsEl.addClass("is-hidden");
    }

    // Update hostEl class and layout columns for single/split mode
    if (view.hostEl) {
      if (view.showPreview) view.hostEl.removeClass("single");
      else view.hostEl.addClass("single");
    }
    if (view.layoutEl) {
      view.layoutEl.style.gridTemplateColumns = view.showPreview
        ? `${view.splitRatio}% 4px 1fr`
        : "";
    }

    view.renderPreview();
  }

  async toggleDeerMode() {
    // Toggle deer mode in plugin settings
    const newDeerMode = !this.plugin.settings.deerMode;
    this.plugin.settings.deerMode = newDeerMode;
    await this.plugin.saveSettings();

    // Update all open File Nav leaves to reflect the new deer mode state
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
    for (const leaf of leaves) {
      const view = leaf.view as FmView;
      this.updateViewDeerModeState(view, newDeerMode);
    }

    new Notice(newDeerMode ? "Deer mode enabled" : "Deer mode disabled");
  }

  openContextMenu(evt: MouseEvent, entry: Entry) {
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
    
    const currentIndex = leaves.findIndex((leaf) => leaf === this.leaf);
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
      const now = Date.now();
      if (now - this.lastTabSwitchNoticeAt > TAB_SWITCH_NOTICE_THROTTLE_MS) {
        new Notice(`Switched to File Nav tab ${targetIndex + 1}/${leaves.length}`);
        this.lastTabSwitchNoticeAt = now;
      }
    }
  }

  getFavoriteTargets(): FavoriteTarget[] {
    const favorites: FavoriteTarget[] = [];
    const seen = new Set<string>();
    const addPath = (path: unknown) => {
      if (typeof path !== "string" || path.length === 0) return;
      const fileOrFolder = this.app.vault.getAbstractFileByPath(path);
      if (!(fileOrFolder instanceof TFile) && !(fileOrFolder instanceof TFolder))
        return;
      if (seen.has(fileOrFolder.path)) return;
      seen.add(fileOrFolder.path);
      favorites.push({
        path: fileOrFolder.path,
        isFolder: fileOrFolder instanceof TFolder,
      });
    };
    const collectBookmarkItems = (items: unknown) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!isRecord(item)) continue;
        const type = item.type;
        if (
          (type === "file" || type === "folder") &&
          typeof item.path === "string"
        ) {
          addPath(item.path);
        }
        if (Array.isArray(item.items)) {
          collectBookmarkItems(item.items);
        }
      }
    };
    const internalPlugins = (
      this.app as App & {
        internalPlugins?: {
          getPluginById?: (id: string) => { instance?: unknown } | undefined;
        };
      }
    ).internalPlugins;
    const bookmarks = internalPlugins?.getPluginById?.("bookmarks");
    if (bookmarks && isRecord(bookmarks.instance)) {
      collectBookmarkItems(bookmarks.instance.items);
    }
    const starred = internalPlugins?.getPluginById?.("starred");
    if (starred && isRecord(starred.instance)) {
      const starredItems = starred.instance.items;
      if (Array.isArray(starredItems)) {
        for (const item of starredItems) {
          if (isRecord(item)) addPath(item.path);
        }
      }
    }
    return favorites;
  }

  gotoFavorite(direction: number) {
    const favorites = this.getFavoriteTargets();
    if (!favorites.length) {
      new Notice("No favorited files or folders found");
      return;
    }
    const currentPath =
      this.entries[this.selectedIndex]?.path || this.currentFolder.path;
    const currentIndex = favorites.findIndex((item) => item.path === currentPath);
    const targetIndex =
      currentIndex >= 0
        ? (currentIndex + direction + favorites.length) % favorites.length
        : direction < 0
          ? favorites.length - 1
          : 0;
    const target = favorites[targetIndex] ?? favorites[0];
    if (!target) return;
    if (target.isFolder) this.setStartFolder(target.path);
    else this.setStartLocation(target.path);
    new Notice(`Favorite ${targetIndex + 1}/${favorites.length}: ${target.path}`);
  }

  gotoNextFavorite() {
    this.gotoFavorite(1);
  }

  gotoPrevFavorite() {
    this.gotoFavorite(-1);
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
    const targetEntry = this.allEntries[targetAllIndex];
    if (!targetEntry) return;
    const idxInEntries = this.entries.findIndex(
      (e) => e.path === targetEntry.path,
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
      this.statusEl.createSpan({ 
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

    // Clipboard indicator
    if (this.clipboard && this.clipboard.length > 0 && this.clipboardOperation) {
      const isCut = this.clipboardOperation === "cut";
      const icon = isCut ? "✂" : "📋";
      let label: string;
      if (this.clipboard.length === 1) {
        label = `${icon} ${this.clipboard[0]?.name ?? ""}`;
      } else {
        label = `${icon} ${this.clipboard.length} files`;
      }
      const indicator = this.statusEl.createSpan({
        cls: "fm-clipboard-indicator" + (isCut ? " is-cut" : ""),
        text: label,
      });
      indicator.setAttr("title", isCut ? "Ready to move" : "Ready to paste");
    }
  }

  // --- Preview & details ---
  async renderPreview() {
    // Performance optimization: skip if both preview and details are hidden
    if (!this.showPreview && !this.showDetails) {
      return;
    }

    this.detailsEl.empty();
    this.previewEl.empty();
    if (!this.entries.length) return;

    const entry = this.entries[this.selectedIndex];
    if (!entry) return;
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
      // Show directory contents in the preview pane
      if (this.showPreview) {
        if (kids.length === 0) {
          this.previewEl.createEl("div", {
            cls: "fm-empty",
            text: "Empty folder",
          });
        } else {
          const list = this.previewEl.createEl("div", { cls: "fm-preview-dir" });
          for (const kid of kids) {
            const row = list.createEl("div", { cls: "fm-preview-dir-item" });
            const iconEl = row.createEl("span", { cls: "fm-icon" });
            setEntryIcon(iconEl, kid);
            iconEl.setAttr("aria-hidden", "true");
            row.createEl("span", {
              cls: "fm-preview-dir-name",
              text: this.getEntryLabel(kid),
            });
          }
        }
      }
      return;
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
  deerMode: boolean;
  showHiddenFiles: boolean;
  showHiddenFolders: boolean;
  showFileExtensions: boolean;
  sortFoldersFirst: boolean;
  confirmCopy: boolean;
  confirmMove: boolean;
  showInlineMetadata: boolean;
  defaultSplitRatio: number;
}

const DEFAULT_SETTINGS: FmPluginSettings = {
  showPreview: true,
  showDetails: true,
  deerMode: false,
  showHiddenFiles: true,
  showHiddenFolders: true,
  showFileExtensions: true,
  sortFoldersFirst: true,
  confirmCopy: false,
  confirmMove: false,
  showInlineMetadata: false,
  defaultSplitRatio: 35,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function isFmPluginSettingsData(value: unknown): value is FmPluginSettingsData {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  if (entries.length === 0) return true;
  const booleanKeys = new Set<keyof FmPluginSettings>([
    "showPreview",
    "showDetails",
    "showHiddenFiles",
    "showHiddenFolders",
    "showFileExtensions",
    "sortFoldersFirst",
    "confirmCopy",
    "confirmMove",
    "showInlineMetadata",
    "deerMode",
  ]);
  const numberKeys = new Set<keyof FmPluginSettings>([
    "defaultSplitRatio",
  ]);
  for (const [key, settingValue] of entries) {
    if (booleanKeys.has(key as keyof FmPluginSettings)) {
      if (!isBoolean(settingValue)) return false;
    } else if (numberKeys.has(key as keyof FmPluginSettings)) {
      if (!isNumber(settingValue)) return false;
    } else {
      return false;
    }
  }
  return true;
}

class FmPlugin extends Plugin {
  settings: FmPluginSettings;
  async onload() {
    await this.loadSettings();

    const appWithRegistry = this.app as AppWithViewRegistry;
    if (appWithRegistry.viewRegistry?.viewByType?.[VIEW_TYPE_FM]) {
      appWithRegistry.viewRegistry.unregisterView?.(VIEW_TYPE_FM);
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
    const appWithRegistry = this.app as AppWithViewRegistry;
    if (appWithRegistry.viewRegistry?.viewByType?.[VIEW_TYPE_FM]) {
      appWithRegistry.viewRegistry.unregisterView?.(VIEW_TYPE_FM);
    }
  }

  async loadSettings() {
    const loaded: unknown = await this.loadData();
    this.settings = isFmPluginSettingsData(loaded)
      ? { ...DEFAULT_SETTINGS, ...loaded }
      : { ...DEFAULT_SETTINGS };
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
  
  constructor(app: App, plugin: FmPlugin) {
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
      .setName("Deer mode (structure-only)")
      .setDesc(
        "Hide both preview and details panes by default. Shows only the file structure. Toggle with 'zm' keyboard shortcut.",
      )
      .addToggle((t) =>
        t.setValue(!!this.plugin.settings.deerMode).onChange(async (v) => {
          this.plugin.settings.deerMode = v;
          await this.plugin.saveSettings();
          const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
          for (const leaf of leaves) {
            const view = leaf.view as FmView;
            view.updateViewDeerModeState(view, v);
          }
        }),
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
            if (view.layoutEl) {
              view.layoutEl.style.gridTemplateColumns = v
                ? `${view.splitRatio}% 4px 1fr`
                : "";
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

    containerEl.createEl("h4", { text: "Layout" });

    new Setting(containerEl)
      .setName("Default split ratio (%)")
      .setDesc("Width of the file list pane as a percentage (10–80). Can also be adjusted by dragging the divider.")
      .addSlider((s) =>
        s
          .setLimits(10, 80, 1)
          .setValue(this.plugin.settings.defaultSplitRatio)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.defaultSplitRatio = v;
            await this.plugin.saveSettings();
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
            for (const leaf of leaves) {
              const view = leaf.view as FmView;
              view.splitRatio = v;
              if (view.layoutEl) {
                view.layoutEl.style.gridTemplateColumns = view.showPreview
                  ? `${v}% 4px 1fr`
                  : "1fr";
              }
            }
          }),
      );

    containerEl.createEl("h4", { text: "Inline metadata" });

    new Setting(containerEl)
      .setName("Show inline metadata")
      .setDesc("Display last-modified date on files and child count on folders in the file list")
      .addToggle((t) =>
        t
          .setValue(!!this.plugin.settings.showInlineMetadata)
          .onChange(async (v) => {
            this.plugin.settings.showInlineMetadata = v;
            await this.plugin.saveSettings();
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FM);
            for (const leaf of leaves) {
              const view = leaf.view as FmView;
              view.showInlineMetadata = v;
              view.renderList();
            }
          }),
      );
  }
}

export default FmPlugin;
