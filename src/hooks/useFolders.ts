import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Folder, FolderNode } from "../types";
import * as db from "../lib/db";

// Builds a tree structure from a flat folder list, sorted by position at each level.
function buildFolderTree(folders: Folder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  // Create nodes
  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  // Build tree
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by position
  const sortChildren = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const n of nodes) {
      sortChildren(n.children);
    }
  };
  sortChildren(roots);

  return roots;
}

// selectedFolderId === null means the "All Notes" smart folder.
export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  useEffect(() => {
    const load = async () => {
      try {
        await db.initDb();
        const all = await db.getAllFolders();
        setFolders(all);
        const def = all.find((f) => f.is_default === 1);
        setDefaultFolderId(def?.id ?? null);
        initialLoadDone.current = true;
      } catch (e) {
        console.error("Failed to load folders:", e);
        setError(String(e));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const refreshFolders = useCallback(async () => {
    try {
      const all = await db.getAllFolders();
      setFolders(all);
    } catch (e) {
      console.error("Failed to refresh folders:", e);
    }
  }, []);

  const createFolder = useCallback(
    async (name: string, parentId?: string | null): Promise<Folder | null> => {
      try {
        const folder = await db.createFolder(name, parentId ?? null);
        setFolders((prev) => [...prev, folder]);
        return folder;
      } catch (e) {
        console.error("Failed to create folder:", e);
        return null;
      }
    },
    []
  );

  const renameFolder = useCallback(async (id: string, name: string) => {
    try {
      await db.renameFolder(id, name);
    } catch (e) {
      console.error("Failed to rename folder:", e);
    }
    setFolders((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, name, updated_at: new Date().toISOString() }
          : f
      )
    );
  }, []);

  // Trashed folders state.
  const [trashedFolders, setTrashedFolders] = useState<Folder[]>([]);

  const refreshTrashedFolders = useCallback(async () => {
    try {
      const trashed = await db.getTrashedFolders();
      setTrashedFolders(trashed);
    } catch (e) {
      console.error("Failed to load trashed folders:", e);
    }
  }, []);

  // Load trashed folders on mount.
  useEffect(() => {
    refreshTrashedFolders();
  }, [refreshTrashedFolders]);

  // Soft-deletes the folder and all its descendants.
  // Refuses to delete the default folder.
  const deleteFolder = useCallback(
    async (id: string) => {
      if (defaultFolderId && id === defaultFolderId) return;
      try {
        await db.softDeleteFolder(id, defaultFolderId ?? id);
      } catch (e) {
        console.error("Failed to delete folder:", e);
        return;
      }
      setSelectedFolderId((prev) => (prev === id ? null : prev));
      // Refresh both active and trashed folders — softDeleteFolder cascades to children.
      await refreshFolders();
      await refreshTrashedFolders();
    },
    [defaultFolderId, refreshFolders, refreshTrashedFolders]
  );

  const restoreFolder = useCallback(async (id: string) => {
    try {
      await db.restoreFolder(id);
      setTrashedFolders((prev) => prev.filter((f) => f.id !== id));
      await refreshFolders();
    } catch (e) {
      console.error("Failed to restore folder:", e);
    }
  }, [refreshFolders]);

  const permanentlyDeleteFolder = useCallback(async (id: string) => {
    try {
      await db.permanentlyDeleteFolder(id);
      setTrashedFolders((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      console.error("Failed to permanently delete folder:", e);
    }
  }, []);

  const selectFolder = useCallback((id: string | null) => {
    setSelectedFolderId(id);
  }, []);

  const reorderFolders = useCallback(async (orderedIds: string[]) => {
    setFolders((prev) => {
      const byId = new Map(prev.map((f) => [f.id, f]));
      return orderedIds
        .map((id, i) => {
          const f = byId.get(id);
          return f ? { ...f, position: i } : null;
        })
        .filter(Boolean) as Folder[];
    });
    try {
      await db.reorderFolders(orderedIds);
    } catch (e) {
      console.error("Failed to reorder folders:", e);
    }
  }, []);

  const moveFolderToParent = useCallback(
    async (folderId: string, newParentId: string | null) => {
      try {
        await db.moveFolderToParent(folderId, newParentId);
        setFolders((prev) =>
          prev.map((f) =>
            f.id === folderId ? { ...f, parent_id: newParentId } : f
          )
        );
      } catch (e) {
        console.error("Failed to move folder:", e);
      }
    },
    []
  );

  return {
    folders,
    folderTree,
    selectedFolderId,
    defaultFolderId,
    isLoading,
    error,
    createFolder,
    renameFolder,
    deleteFolder,
    selectFolder,
    reorderFolders,
    moveFolderToParent,
    refreshFolders,
    trashedFolders,
    refreshTrashedFolders,
    restoreFolder,
    permanentlyDeleteFolder,
  };
}
