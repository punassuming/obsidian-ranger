/*
  Ranger FM - a minimal ranger-style file navigator for Obsidian
  Keys inside the modal:
    j/k: move selection
    l / Enter: open file or enter folder
    h: go up to parent folder
    q / Escape: close
  Command: Open Ranger FM (default hotkey '-')
*/

const { Plugin, Modal, TFile, TFolder } = require('obsidian');

class RangerModal extends Modal {
  constructor(app, startFolder) {
    super(app);
    this.currentFolder = startFolder || this.app.vault.getRoot();
    this.pathStack = [];
    this.entries = [];
    this.selectedIndex = 0;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('ranger-fm');

    // Title / Path bar
    this.pathEl = contentEl.createDiv({ cls: 'ranger-path' });
    // List container
    this.listEl = contentEl.createDiv({ cls: 'ranger-list', attr: { tabindex: '0' } });

    this.render();
    // Focus to receive key events
    this.listEl.focus({ preventScroll: true });

    // Use modal key scope for reliable single-key handling
    this.scope.register([], 'j', () => this.move(1));
    this.scope.register([], 'k', () => this.move(-1));
    this.scope.register([], 'l', () => this.activate());
    this.scope.register([], 'Enter', () => this.activate());
    this.scope.register([], 'h', () => this.up());
    this.scope.register([], 'q', () => this.close());
    this.scope.register([], 'Escape', () => this.close());
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  // Key handling is registered via this.scope in onOpen()

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
    this.entries = this.getFolderEntries(this.currentFolder);
    if (this.selectedIndex >= this.entries.length) this.selectedIndex = Math.max(0, this.entries.length - 1);
    if (this.selectedIndex < 0) this.selectedIndex = 0;

    // Render path
    const path = this.currentFolder.path === '/' ? '/' : this.currentFolder.path;
    this.pathEl.setText(path);

    // Render list
    this.listEl.empty();
    if (this.entries.length === 0) {
      this.listEl.createEl('div', { cls: 'ranger-empty', text: '(empty)' });
      return;
    }

    this.entries.forEach((entry, idx) => {
      const isFolder = entry instanceof TFolder;
      const item = this.listEl.createEl('div', { cls: 'ranger-item' });
      if (idx === this.selectedIndex) item.addClass('is-selected');

      const icon = item.createEl('span', { cls: 'ranger-icon', text: isFolder ? '📁' : '📄' });
      icon.setAttr('aria-hidden', 'true');
      item.createEl('span', { cls: 'ranger-name', text: entry.name });

      // Mouse support (optional)
      item.addEventListener('mousemove', () => {
        if (this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          this.renderSelectionOnly();
        }
      });
      item.addEventListener('dblclick', () => {
        this.selectedIndex = idx;
        this.activate();
      });
    });
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
      this.render();
    } else if (entry instanceof TFile) {
      // Open file in current leaf
      this.app.workspace.getLeaf(false).openFile(entry);
      this.close();
    }
  }
}

class RangerFmPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'open-ranger-fm',
      name: 'Open Ranger FM',
      hotkeys: [
        { modifiers: [], key: '-' },
      ],
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        const startFolder = activeFile?.parent || this.app.vault.getRoot();
        const modal = new RangerModal(this.app, startFolder);
        modal.open();
      },
    });
  }
}

module.exports = RangerFmPlugin;
