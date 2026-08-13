import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/** A single captured photo: a real snapshot taken from the device camera. */
export type Shot = { slotId: string; dataUrl: string };

type Store = {
  /** Captured shots keyed by session key (frame id or customer session slug). */
  shots: Record<string, Shot[]>;
  setShots: (sessionKey: string, shots: Shot[]) => void;
};

const PhotoboothContext = createContext<Store | null>(null);

export function PhotoboothProvider({ children }: { children: ReactNode }) {
  const [shots, setShotsState] = useState<Record<string, Shot[]>>({});

  const setShots = useCallback((sessionKey: string, next: Shot[]) => {
    setShotsState((prev) => ({ ...prev, [sessionKey]: next }));
  }, []);

  const value = useMemo(() => ({ shots, setShots }), [shots, setShots]);

  return <PhotoboothContext.Provider value={value}>{children}</PhotoboothContext.Provider>;
}

export function usePhotobooth() {
  const ctx = useContext(PhotoboothContext);
  if (!ctx) throw new Error("usePhotobooth must be used inside PhotoboothProvider");
  return ctx;
}
