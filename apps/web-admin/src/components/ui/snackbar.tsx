"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type Snack = { id: number; message: string; tone?: "success" | "info" | "error" };

type SnackCtx = {
  show: (message: string, tone?: Snack["tone"]) => void;
};

const Ctx = createContext<SnackCtx | null>(null);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Snack[]>([]);

  const show = useCallback((message: string, tone: Snack["tone"] = "success") => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((s) => s.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[360px] max-w-[90vw] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "animate-fade-up rounded-xl px-4 py-3 text-sm font-medium text-white",
              item.tone === "error" && "bg-rose-600",
              item.tone === "info" && "bg-sky-600",
              item.tone === "success" && "bg-emerald-600"
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSnackbar must be used within SnackbarProvider");
  return ctx;
}
