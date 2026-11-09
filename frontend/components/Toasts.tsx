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
      <div className="toasts fixed bottom-5 left-1/2 z-[99] flex -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className="toast animate-[rise_.25s_ease] rounded-md bg-[#262627] px-[18px] py-2.5 text-sm text-white shadow-lg">{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  );
}
