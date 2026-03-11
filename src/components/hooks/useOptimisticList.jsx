import { useState, useCallback } from "react";

/**
 * useOptimisticList — optimistic UI helper for list mutations.
 *
 * Usage:
 *   const { items, addOptimistic, updateOptimistic, removeOptimistic, setItems } =
 *     useOptimisticList(serverItems);
 *
 *   // On create:
 *   const tempId = addOptimistic({ title: "New item", _pending: true });
 *   const saved  = await base44.entities.MyEntity.create({ title: "New item" });
 *   updateOptimistic(tempId, saved);   // replace temp with real record
 *
 *   // On delete:
 *   removeOptimistic(item.id);
 *   await base44.entities.MyEntity.delete(item.id);
 *
 *   // On update:
 *   updateOptimistic(item.id, { ...item, status: "done" });
 *   await base44.entities.MyEntity.update(item.id, { status: "done" });
 */
export function useOptimisticList(initialItems = []) {
  const [items, setItems] = useState(initialItems);

  // Sync when server data arrives (e.g. after re-fetch)
  const syncFromServer = useCallback((serverItems) => {
    setItems(serverItems);
  }, []);

  // Add a temporary item and return its temp id
  const addOptimistic = useCallback((item) => {
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticItem = { ...item, id: tempId, _optimistic: true };
    setItems(prev => [optimisticItem, ...prev]);
    return tempId;
  }, []);

  // Replace an item by id (swap temp → real, or apply partial update)
  const updateOptimistic = useCallback((id, updates) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, ...updates, _optimistic: false }
        : item
    ));
  }, []);

  // Remove an item immediately
  const removeOptimistic = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  return { items, setItems: syncFromServer, addOptimistic, updateOptimistic, removeOptimistic };
}