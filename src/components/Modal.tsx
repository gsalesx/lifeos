import type { ReactNode } from 'react'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl border border-[#e4e4e7] bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold">{title}</h2>
          <button className="rounded-lg px-2 py-1 text-[#a1a1aa] hover:bg-[#f4f4f5]" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#a1a1aa]">{label}</div>
      {children}
    </label>
  )
}

export const inputClass = 'w-full rounded-[9px] border border-[#e4e4e7] bg-[#fafafa] px-3 py-2.5 text-[13px] outline-none focus:border-[#18181b]'

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="safe-nav w-full max-w-md rounded-t-3xl border border-[#e4e4e7] bg-white p-5 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold">{title}</h2>
          <button className="rounded-lg px-2 py-1 text-[#a1a1aa]" onClick={onClose}>✕</button>
        </div>
        {children}
        {footer && <div className="mt-4 flex gap-2">{footer}</div>}
      </div>
    </div>
  )
}
