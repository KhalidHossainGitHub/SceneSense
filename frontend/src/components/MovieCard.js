"use client";

import { useState } from "react";
import Image from "next/image";

export default function MovieCard({ movie, context, variant = "grid", className = "" }) {
  const [feedback, setFeedback] = useState(null);
  const [sending, setSending] = useState(false);

  const rating = movie.rating?.toFixed(1) ?? "0";
  const year = movie.release_date?.slice(0, 4) || "";

  async function sendFeedback(liked) {
    if (sending || feedback !== null) return;
    setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie_id: movie.id,
          mood: context.mood,
          time_of_day: context.time_of_day,
          company: context.company,
          age_group: context.age_group,
          genres: context.genres,
          length_pref: context.length_pref,
          liked,
        }),
      });
      setFeedback(liked ? "liked" : "disliked");
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  }

  const base =
    variant === "row"
      ? "group relative rounded-lg overflow-hidden bg-cb-card cursor-pointer w-[140px] sm:w-[160px] shrink-0"
      : "group relative aspect-[2/3] rounded-lg overflow-hidden bg-cb-card cursor-pointer";

  return (
    <div className={`${base} ${className} ${variant === "row" ? "aspect-[2/3]" : ""}`}>
      {/* Poster */}
      {movie.poster_path ? (
        <Image
          src={movie.poster_path}
          alt={movie.title}
          fill
          sizes="(max-width:640px) 33vw,(max-width:1024px) 25vw,16vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-cb-dim text-xs">
          No Poster
        </div>
      )}

      {/* Bottom gradient */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent pb-3 px-3 ${
          variant === "row"
            ? "pt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            : "pt-14"
        }`}
      >
        <h3 className="text-[13px] font-semibold text-white leading-tight line-clamp-2">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-white/50">
          {year && <span>{year}</span>}
          {movie.genres?.slice(0, 2).map((g) => (
            <span key={g}>{g}</span>
          ))}
        </div>
      </div>

      {/* Rating badge */}
      <div className="absolute top-2 left-2 bg-black/80 rounded px-1.5 py-0.5 flex items-center gap-1">
        <svg className="w-3 h-3 text-cb-gold" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.065 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.284-3.957z" />
        </svg>
        <span className="text-[11px] font-bold text-cb-gold">{rating}</span>
      </div>

      {/* Hover overlay + feedback */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
        {/* Like */}
        <button
          onClick={(e) => { e.stopPropagation(); sendFeedback(true); }}
          disabled={feedback !== null || sending}
          className={`
            w-7 h-7 rounded-full flex items-center justify-center text-xs
            transition-all duration-100 cursor-pointer
            ${
              feedback === "liked"
                ? "bg-green-500 text-white"
                : feedback !== null
                  ? "bg-white/10 text-white/20 cursor-default"
                  : "bg-black/70 text-white/70 hover:bg-green-500 hover:text-white"
            }
          `}
          title="Like"
        >
          <svg className="w-3.5 h-3.5" fill={feedback === "liked" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        {/* Dislike */}
        <button
          onClick={(e) => { e.stopPropagation(); sendFeedback(false); }}
          disabled={feedback !== null || sending}
          className={`
            w-7 h-7 rounded-full flex items-center justify-center text-xs
            transition-all duration-100 cursor-pointer
            ${
              feedback === "disliked"
                ? "bg-red-500 text-white"
                : feedback !== null
                  ? "bg-white/10 text-white/20 cursor-default"
                  : "bg-black/70 text-white/70 hover:bg-red-500 hover:text-white"
            }
          `}
          title="Not For Me"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
