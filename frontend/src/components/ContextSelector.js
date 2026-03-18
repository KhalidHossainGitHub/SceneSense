"use client";

const OPTIONS = {
  mood: {
    happy:   { label: "Happy" },
    sad:     { label: "Sad" },
    excited: { label: "Excited" },
    relaxed: { label: "Relaxed" },
  },
  time_of_day: {
    morning:   { label: "Morning" },
    afternoon: { label: "Afternoon" },
    night:     { label: "Night" },
  },
  company: {
    alone:   { label: "Solo" },
    friends: { label: "Friends" },
    family:  { label: "Family" },
  },
  age_group: {
    kids:   { label: "Kids" },
    teens:  { label: "Teens" },
    adults: { label: "Adults" },
  },
  length_pref: {
    short:  { label: "Short (<90m)" },
    medium: { label: "Medium" },
    long:   { label: "Long (2h+)" },
    any:    { label: "Any" },
  },
};

export default function ContextSelector({ category, value, onChange }) {
  const opts = OPTIONS[category] ?? {};

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(opts).map(([key, meta]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium
              transition-all duration-100 cursor-pointer border
              ${
                active
                  ? "border-[color:var(--color-cb-accent-border)] bg-[color:var(--color-cb-accent-soft)] text-white shadow-[0_0_0_3px_rgba(229,9,20,0.08)]"
                  : "border-transparent bg-cb-surface text-cb-muted hover:bg-cb-card hover:text-white/80 hover:border-white/10"
              }
            `}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
