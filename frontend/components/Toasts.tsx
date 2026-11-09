"use client";
import { createContext, useCallback, useContext, useState } from "react";

const Ctx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, msg }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts">{items.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}</div>
    </Ctx.Provider>
  );
}
