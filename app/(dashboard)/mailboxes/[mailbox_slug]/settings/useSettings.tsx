import { startTransition, useEffect, useRef, useState } from "react";

export type NewRow = {
  key: string;
};

export function useSettings<T extends object>(onChange: (pendingUpdates: T[]) => void, pendingUpdates?: T[]) {
  const [changeset, setChangeset] = useState<Record<string, T>>({});
  const [newRows, setNewRows] = useState<NewRow[]>([]);
  const prevPendingUpdates = useRef<T[]>([]);

  useEffect(() => {
    if (prevPendingUpdates.current?.length && !pendingUpdates) {
      startTransition(() => {
        setChangeset({});
        setNewRows([]);
      });
    }
    prevPendingUpdates.current = pendingUpdates ?? [];
  }, [pendingUpdates]);

  const handleChange = (key: number | string, value: T) => {
    const newChangeset = { ...changeset, [key]: value };
    setChangeset(newChangeset);

    const pendingUpdates = Object.values(newChangeset).filter((changes) => Object.keys(changes).length);
    onChange(pendingUpdates);
  };

  const lastRow = newRows[newRows.length - 1];
  const addNewRow = (): string => {
    const nextKey = newRows.length && lastRow ? parseInt(lastRow.key.replace("new-", "")) + 1 : 0;
    const newRow = { key: `new-${nextKey}` };
    setNewRows([...newRows, newRow]);
    return newRow.key;
  };

  const deleteNewRow = (key: string) => {
    setNewRows(newRows.filter((row) => row.key !== key));
    handleChange(key, {} as T);
  };

  return {
    addNewRow,
    deleteNewRow,
    newRows,
    handleChange,
    changeset,
  };
}
