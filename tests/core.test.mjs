import assert from "node:assert/strict";
import test from "node:test";
import {
  copyFolderTree,
  normalizeSettings,
  runSequentialBatch,
  sortEntries,
} from "../src/core.mjs";

const defaults = {
  showPreview: true,
  showDetails: true,
  showHiddenFiles: true,
  showHiddenFolders: true,
  showFileExtensions: true,
  sortFoldersFirst: true,
  sortMode: "name",
  confirmCopy: false,
  confirmMove: false,
  showInlineMetadata: false,
  deerMode: false,
  defaultSplitRatio: 35,
};
const booleanKeys = Object.keys(defaults).filter((key) => typeof defaults[key] === "boolean");

test("sorting supports natural names, newest/largest first, and folder grouping", () => {
  const entries = [
    { name: "file10.md", modified: 30, size: 5 },
    { name: "folder2", folder: true, modified: 0, size: 0 },
    { name: "file2.md", modified: 10, size: 20 },
    { name: "file1.md", modified: 10, size: 20 },
  ];
  const options = (mode, foldersFirst = false) => ({
    mode,
    foldersFirst,
    isFolder: (entry) => entry.folder === true,
    getModifiedTime: (entry) => entry.modified,
    getSize: (entry) => entry.size,
    compareNames: (a, b) => a.localeCompare(b, undefined, { numeric: true }),
  });

  assert.deepEqual(sortEntries(entries, options("name")).map(({ name }) => name), [
    "file1.md", "file2.md", "file10.md", "folder2",
  ]);
  assert.deepEqual(sortEntries(entries, options("modified")).map(({ name }) => name), [
    "file10.md", "file1.md", "file2.md", "folder2",
  ]);
  assert.deepEqual(sortEntries(entries, options("size")).map(({ name }) => name), [
    "file1.md", "file2.md", "file10.md", "folder2",
  ]);
  assert.deepEqual(sortEntries(entries, options("modified", true)).map(({ name }) => name), [
    "folder2", "file10.md", "file1.md", "file2.md",
  ]);
});

test("settings normalization keeps valid values and defaults only invalid fields", () => {
  const settings = normalizeSettings({
    showPreview: false,
    showDetails: "invalid",
    sortMode: "size",
    defaultSplitRatio: 95,
    extraFutureSetting: "ignored",
  }, defaults, booleanKeys);

  assert.equal(settings.showPreview, false);
  assert.equal(settings.showDetails, defaults.showDetails);
  assert.equal(settings.sortMode, "size");
  assert.equal(settings.defaultSplitRatio, 80);
  assert.equal(settings.showHiddenFiles, defaults.showHiddenFiles);
});

test("settings normalization uses the default ratio for non-finite values", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, "60"]) {
    assert.equal(
      normalizeSettings({ defaultSplitRatio: value }, defaults, booleanKeys).defaultSplitRatio,
      defaults.defaultSplitRatio,
    );
  }
  assert.equal(
    normalizeSettings({ defaultSplitRatio: 5 }, defaults, booleanKeys).defaultSplitRatio,
    10,
  );
});

test("batch deletion continues after an item fails and returns per-item outcomes", async () => {
  const attempted = [];
  const result = await runSequentialBatch(["first.md", "locked.md", "last.md"], async (path) => {
    attempted.push(path);
    if (path === "locked.md") throw new Error("permission denied");
  });

  assert.deepEqual(attempted, ["first.md", "locked.md", "last.md"]);
  assert.deepEqual(result.succeeded, ["first.md", "last.md"]);
  assert.equal(result.failed[0].item, "locked.md");
  assert.equal(result.failed[0].error.message, "permission denied");
});

test("batch moves retain failed items while continuing later moves", async () => {
  const attempted = [];
  const result = await runSequentialBatch(["one.md", "blocked.md", "three.md"], async (path) => {
    attempted.push(path);
    return path !== "blocked.md";
  });

  assert.deepEqual(attempted, ["one.md", "blocked.md", "three.md"]);
  assert.deepEqual(result.succeeded, ["one.md", "three.md"]);
  assert.deepEqual(result.failed, [{ item: "blocked.md" }]);
});

test("recursive folder copy removes the partial destination after a nested copy fails", async () => {
  const source = {
    name: "source",
    children: [
      { name: "good.md", file: true },
      { name: "nested", children: [{ name: "bad.md", file: true }] },
    ],
  };
  const createdFolders = [];
  const copiedFiles = [];
  const removedFolders = [];

  await assert.rejects(copyFolderTree(source, "source copy", {
    createFolder: async (path) => createdFolders.push(path),
    childrenOf: (folder) => folder.children ?? [],
    nameOf: (entry) => entry.name,
    isFolder: (entry) => !entry.file,
    copyFile: async (entry, path) => {
      if (entry.name === "bad.md") throw new Error("write failed");
      copiedFiles.push(path);
    },
    deleteFolder: async (path) => removedFolders.push(path),
  }), /write failed/);

  assert.deepEqual(createdFolders, ["source copy", "source copy/nested"]);
  assert.deepEqual(copiedFiles, ["source copy/good.md"]);
  assert.deepEqual(removedFolders, ["source copy"]);
});

test("recursive folder copy does not remove a destination when creation fails", async () => {
  const removedFolders = [];
  await assert.rejects(copyFolderTree({ name: "source", children: [] }, "existing", {
    createFolder: async () => { throw new Error("already exists"); },
    childrenOf: (folder) => folder.children,
    nameOf: (entry) => entry.name,
    isFolder: () => true,
    copyFile: async () => {},
    deleteFolder: async (path) => removedFolders.push(path),
  }), /already exists/);

  assert.deepEqual(removedFolders, []);
});
