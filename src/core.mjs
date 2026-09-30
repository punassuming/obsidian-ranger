export function sortEntries(entries, options) {
  const compare = (a, b) => {
    if (options.mode === "modified") {
      const byTime = options.getModifiedTime(b) - options.getModifiedTime(a);
      if (byTime !== 0) return byTime;
    } else if (options.mode === "size") {
      const bySize = options.getSize(b) - options.getSize(a);
      if (bySize !== 0) return bySize;
    }
    return options.compareNames(a.name, b.name);
  };

  if (options.foldersFirst) {
    const folders = entries.filter(options.isFolder).sort(compare);
    const files = entries.filter((entry) => !options.isFolder(entry)).sort(compare);
    return [...folders, ...files];
  }
  return [...entries].sort(compare);
}

export function isFolderDestinationInsideSource(sourcePath, destinationPath) {
  const normalize = (path) => !path || path === "/" ? "/" : path.replace(/\/+$/, "");
  const source = normalize(sourcePath);
  const destination = normalize(destinationPath);
  if (source === destination) return true;
  if (source === "/") return destination !== "/";
  return destination.startsWith(`${source}/`);
}

export function normalizeSettings(value, defaults, booleanKeys) {
  const settings = { ...defaults };
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return settings;
  }

  for (const key of booleanKeys) {
    if (typeof value[key] === "boolean") settings[key] = value[key];
  }
  if (["name", "modified", "size"].includes(value.sortMode)) {
    settings.sortMode = value.sortMode;
  }
  if (typeof value.defaultSplitRatio === "number" && Number.isFinite(value.defaultSplitRatio)) {
    settings.defaultSplitRatio = Math.min(80, Math.max(10, value.defaultSplitRatio));
  }
  return settings;
}

export async function runSequentialBatch(items, action) {
  const succeeded = [];
  const failed = [];
  for (const item of items) {
    try {
      const result = await action(item);
      if (result === false) failed.push({ item });
      else succeeded.push(item);
    } catch (error) {
      failed.push({ item, error });
    }
  }
  return { succeeded, failed };
}

export async function copyFolderTree(source, destination, operations) {
  let destinationCreated = false;
  const copyContents = async (folder, folderPath) => {
    await operations.createFolder(folderPath);
    if (folderPath === destination) destinationCreated = true;
    for (const child of operations.childrenOf(folder)) {
      const childPath = `${folderPath}/${operations.nameOf(child)}`;
      if (operations.isFolder(child)) {
        await copyContents(child, childPath);
      } else {
        await operations.copyFile(child, childPath);
      }
    }
  };

  try {
    await copyContents(source, destination);
  } catch (error) {
    if (!destinationCreated) throw error;
    try {
      await operations.deleteFolder(destination);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Folder copy failed and cleanup was incomplete");
    }
    throw error;
  }
}
