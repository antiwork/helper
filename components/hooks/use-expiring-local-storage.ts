import { useCallback, useEffect, useState } from "react";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const STORAGE_PREFIX = "helper_";

function cleanupExpiredItems() {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(STORAGE_PREFIX));

    for (const key of keys) {
      try {
        const item = window.localStorage.getItem(key);
        if (!item) continue;

        const parsed = JSON.parse(item);
        if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
          window.localStorage.removeItem(key);
        }
      } catch (error) {
        captureExceptionAndLog(error);
        window.localStorage.removeItem(key);
      }
    }
  } catch (error) {
    captureExceptionAndLog(error);
  }
}

type StorageItem<T> = {
  value: T;
  expiresAt: number;
};

export function useExpiringLocalStorage<T>(
  key: string,
  options?: {
    expirationTime?: number;
    shouldStore?: (value: T) => boolean;
  },
) {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const expirationTime = options?.expirationTime ?? 1000 * 60 * 60 * 24; // 1 day
  const shouldStore = options?.shouldStore ?? ((value: T) => value !== null);

  useEffect(() => {
    cleanupExpiredItems();
  }, []);

  const loadStoredValue = useCallback((): T | undefined => {
    if (typeof window === "undefined") {
      return undefined;
    }

    try {
      const item = window.localStorage.getItem(storageKey);
      if (!item) {
        return undefined;
      }

      const parsed = JSON.parse(item) as StorageItem<T>;

      if (parsed.expiresAt < Date.now()) {
        window.localStorage.removeItem(storageKey);
        return undefined;
      }

      return parsed.value;
    } catch (error) {
      captureExceptionAndLog(error);
      return undefined;
    }
  }, [storageKey]);

  const [storedValue, setStoredValue] = useState<T | undefined>(loadStoredValue);

  useEffect(() => {
    setStoredValue(loadStoredValue());
  }, [storageKey, loadStoredValue]);

  const setValue = useCallback(
    (value: T | undefined | ((val: T | undefined) => T | undefined)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          if (!valueToStore || !shouldStore(valueToStore)) {
            window.localStorage.removeItem(storageKey);
            return;
          }

          const item: StorageItem<T> = {
            value: valueToStore,
            expiresAt: Date.now() + expirationTime,
          };
          window.localStorage.setItem(storageKey, JSON.stringify(item));
        }
      } catch (error) {
        captureExceptionAndLog(error);
      }
    },
    [storageKey, expirationTime, shouldStore, storedValue],
  );

  return [storedValue, setValue] as const;
}
