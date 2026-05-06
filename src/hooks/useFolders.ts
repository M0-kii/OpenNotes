import { useCallback, useEffect, useRef, useState } from "react";
import type { Folder } from "../types";
import * as db from "../lib/db";

// selectedFolderId === null means the "All Notes" smart folder.
export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

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
    async (name: string): Promise<Folder | null> => {
      try {
        const folder = await db.createFolder(name);
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

  // Reassigns the folder's notes to defaultFolderId then deletes it.
  // Refuses to delete the default folder.
  const deleteFolder = useCallback(
    async (id: string) => {
      if (!defaultFolderId || id === defaultFolderId) return;
      try {
        await db.deleteFolder(id, defaultFolderId);
      } catch (e) {
        console.error("Failed to delete folder:", e);
        return;
      }
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setSelectedFolderId((prev) => (prev === id ? null : prev));
    },
    [defaultFolderId]
  );

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

  return {
    folders,
    selectedFolderId,
    defaultFolderId,
    isLoading,
    error,
    createFolder,
    renameFolder,
    deleteFolder,
    selectFolder,
    reorderFolders,
    refreshFolders,
  };
}
