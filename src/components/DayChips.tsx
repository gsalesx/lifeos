const DAYS = [
  { i: 0, l: 'D' },
  { i: 1, l: 'S' },
  { i: 2, l: 'T' },
  { i: 3, l: 'Q' },
  { i: 4, l: 'Q' },
  { i: 5, l: 'S' },
  { i: 6, l: 'S' },
]

export function DayChips({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return (
    <div className="flex gap-1">
      {DAYS.map((d) => {
        const on = value.includes(d.i)
        return (
          <button
            key={d.i}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== d.i) : [...value, d.i].sort((a, b) => a - b))}
            className={`flex size-9 items-center justify-center rounded-full text-[11px] font-bold ${on ? 'bg-[#18181b] text-white' : 'bg-[#f4f4f5] text-[#71717a]'}`}
          >
            {d.l}
          </button>
        )
      })}
    </div>
  )
}
