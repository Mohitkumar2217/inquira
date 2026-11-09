"use client";
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="ghost" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}
