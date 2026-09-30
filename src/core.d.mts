export type CoreSortOptions<T extends { name: string }> = {
  foldersFirst: boolean;
  mode: "name" | "modified" | "size";
  isFolder: (entry: T) => boolean;
  getModifiedTime: (entry: T) => number;
  getSize: (entry: T) => number;
  compareNames: (a: string, b: string) => number;
};

export function sortEntries<T extends { name: string }>(
  entries: readonly T[],
  options: CoreSortOptions<T>,
): T[];

export function isFolderDestinationInsideSource(
  sourcePath: string,
  destinationPath: string,
): boolean;

export function normalizeSettings<T extends object>(
  value: unknown,
  defaults: T,
  booleanKeys: readonly (keyof T)[],
): T;

export function runSequentialBatch<T>(
  items: readonly T[],
  action: (item: T) => Promise<void | boolean> | void | boolean,
): Promise<{ succeeded: T[]; failed: { item: T; error?: unknown }[] }>;

export function copyFolderTree<TFolder, TEntry extends { name: string }>(
  source: TFolder,
  destination: string,
  operations: {
    createFolder: (path: string) => Promise<unknown>;
    childrenOf: (folder: TFolder) => readonly TEntry[];
    nameOf: (entry: TEntry) => string;
    isFolder: (entry: TEntry) => entry is TFolder;
    copyFile: (entry: TEntry, path: string) => Promise<unknown>;
    deleteFolder: (path: string) => Promise<unknown>;
  },
): Promise<void>;
