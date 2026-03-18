"use client";

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "History",
  "Horror", "Music", "Mystery", "Romance", "Science Fiction",
  "Thriller", "War", "Western",
];

export default function GenreSelector({ selected, onChange }) {
  function toggle(genre) {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre));
    } else {
      onChange([...selected, genre]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {GENRES.map((genre) => {
        const active = selected.includes(genre);
        return (
          <button
            key={genre}
            type="button"
            onClick={() => toggle(genre)}
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
            {genre}
          </button>
        );
      })}
    </div>
  );
}
