"use client";
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="backdrop fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="modal max-h-[85vh] w-[min(520px,92vw)] overflow-auto rounded-[10px] bg-white p-5 dark:bg-[#202024]" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head mb-2 flex items-center justify-between"><h3 className="mb-2.5 mt-0">{title}</h3><button type="button" className="ghost rounded-md border-0 bg-transparent p-2 text-base hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10" aria-label="Close dialog" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}
