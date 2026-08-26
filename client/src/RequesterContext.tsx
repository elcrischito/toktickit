import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { DevRequester } from "./api.js";

const STORAGE_KEY = "toktickit.selectedRequester";

interface RequesterContextValue {
  requester: DevRequester | null;
  selectRequester: (requester: DevRequester) => void;
  changeRequester: () => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequester] = useState<DevRequester | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRequester(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  function selectRequester(next: DevRequester) {
    setRequester(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function changeRequester() {
    setRequester(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <RequesterContext.Provider value={{ requester, selectRequester, changeRequester }}>
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester(): RequesterContextValue {
  const ctx = useContext(RequesterContext);
  if (!ctx) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return ctx;
}