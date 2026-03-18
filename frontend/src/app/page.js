"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ContextSelector from "@/components/ContextSelector";
import GenreSelector from "@/components/GenreSelector";
import MovieCard from "@/components/MovieCard";

function SkeletonCard() {
  return <div className="aspect-[2/3] rounded-lg bg-cb-card animate-pulse" />;
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 bg-cb-accent rounded-sm shadow-[0_0_18px_rgba(229,9,20,0.35)]" />
        <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
          {title}
        </h3>
      </div>
      {subtitle && <p className="text-[12px] text-cb-muted mt-1">{subtitle}</p>}
    </div>
  );
}

function SectionRow({ title, subtitle, movies, context }) {
  if (!movies?.length) return null;

  const scrollerRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function updateArrows() {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft < max - 2);
  }

  function scrollByAmount(dir) {
    const el = scrollerRef.current;
    if (!el) return;
    const amt = Math.round(el.clientWidth * 0.85) * dir;
    el.scrollBy({ left: amt, behavior: "smooth" });
    // state update happens via scroll handler too
    setTimeout(updateArrows, 200);
  }

  useEffect(() => {
    updateArrows();
    const onResize = () => updateArrows();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [movies?.length]);

  return (
    <section className="mt-10 group/row">
      <div className="flex items-baseline justify-between mb-3">
        <SectionHeader title={title} subtitle={subtitle} />
        <span className="text-[11px] text-cb-dim">{movies.length}</span>
      </div>

      <div className="relative">
        {/* Arrows */}
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          disabled={!canLeft}
          className={`
            absolute left-0 top-1/2 -translate-y-1/2 z-10
            h-11 w-11 rounded-full flex items-center justify-center
            transition-all duration-150 cursor-pointer
            ${
              canLeft
                ? "bg-black/65 hover:bg-black/80 border border-white/10 hover:border-white/20 text-white shadow-lg shadow-black/50 opacity-0 group-hover/row:opacity-100"
                : "opacity-0 pointer-events-none"
            }
          `}
          title="Scroll left"
          aria-label="Scroll left"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          disabled={!canRight}
          className={`
            absolute right-0 top-1/2 -translate-y-1/2 z-10
            h-11 w-11 rounded-full flex items-center justify-center
            transition-all duration-150 cursor-pointer
            ${
              canRight
                ? "bg-black/65 hover:bg-black/80 border border-white/10 hover:border-white/20 text-white shadow-lg shadow-black/50 opacity-0 group-hover/row:opacity-100"
                : "opacity-0 pointer-events-none"
            }
          `}
          title="Scroll right"
          aria-label="Scroll right"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-cb-bg to-transparent opacity-90" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-cb-bg to-transparent opacity-90" />

        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="no-scrollbar overflow-x-auto scroll-smooth"
        >
          <div className="flex gap-3 pr-2">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} context={context} variant="row" />
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TabIcon({ active, children }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
        active
          ? "bg-[color:var(--color-cb-accent-soft)] border-[color:var(--color-cb-accent-border)] text-white shadow-[0_0_0_3px_rgba(229,9,20,0.08)]"
          : "bg-cb-surface border-white/10 text-cb-muted hover:text-white/80 hover:border-white/20"
      }`}
    >
      {children}
    </span>
  );
}

function WizardTabs({ step, setStep }) {
  const items = [
    { id: 0, label: "Vibe" },
    { id: 1, label: "Preferences" },
    { id: 2, label: "Review" },
  ];

  return (
    <div className="flex items-center justify-center gap-3">
      {items.map((it) => {
        const active = step === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => setStep(it.id)}
            className="flex flex-col items-center gap-1 cursor-pointer"
            aria-current={active ? "step" : undefined}
            title={it.label}
          >
            <TabIcon active={active}>
              {it.id === 0 && (
                <svg
                  className="w-4.5 h-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6V4m0 16v-2m6-6h2M4 12H6m10.95-6.95 1.41-1.41M5.64 18.36l1.41-1.41m0-10.9L5.64 5.64m12.72 12.72-1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                  />
                </svg>
              )}
              {it.id === 1 && (
                <svg
                  className="w-4.5 h-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6V4m0 16v-2m6-6h2M4 12H6m10.95-6.95 1.41-1.41M5.64 18.36l1.41-1.41m0-10.9L5.64 5.64m12.72 12.72-1.41-1.41"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.5 14.5 8 16l-2-2 1.5-1.5M14.5 9.5 16 8l2 2-1.5 1.5"
                  />
                </svg>
              )}
              {it.id === 2 && (
                <svg
                  className="w-4.5 h-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4.5h18M3 9h18M3 13.5h18M3 18h18"
                  />
                </svg>
              )}
            </TabIcon>
            <span
              className={`text-[11px] ${
                active ? "text-white/90" : "text-cb-dim"
              }`}
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [mood, setMood] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [company, setCompany] = useState("");
  const [ageGroup, setAgeGroup] = useState("adults");
  const [lengthPref, setLengthPref] = useState("any");
  const [genres, setGenres] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [step, setStep] = useState(0);
  const [showSetup, setShowSetup] = useState(true);

  const canSubmit = mood && timeOfDay && company;

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setMovies([]);
    setHasSearched(true);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          time_of_day: timeOfDay,
          company,
          age_group: ageGroup,
          genres,
          length_pref: lengthPref,
          n: 36,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMovies(data.movies || []);
      setModelInfo({
        trained: data.model_trained,
        feedbackCount: data.feedback_count,
      });
      setStep(2);
      setShowSetup(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const context = {
    mood,
    time_of_day: timeOfDay,
    company,
    age_group: ageGroup,
    genres,
    length_pref: lengthPref,
  };

  const featured = movies?.[0];
  const top10 = movies.slice(0, 10);
  const rowA = movies.slice(10, 22);
  const rowB = movies.slice(22, 34);
  const highlyRated = [...movies]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 12);
  const genreHint = genres?.[0] ? `Because You Picked ${genres[0]}` : "More Like This";

  const featuredMeta = useMemo(() => {
    if (!featured) return { year: "", genresText: "", rating: "" };
    return {
      year: featured.release_date?.slice(0, 4) || "",
      genresText: (featured.genres || []).slice(0, 2).join(" · "),
      rating: typeof featured.rating === "number" ? featured.rating.toFixed(1) : "",
    };
  }, [featured]);

  return (
    <>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-cb-bg/70 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Image
                src="/icon.png"
                alt="SceneSense"
                width={24}
                height={24}
                className="rounded"
                priority
              />
              <span className="text-lg font-bold tracking-tight text-white">
                SceneSense
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] text-cb-dim">
              Netflix-Style Picks That Learn From You
            </span>
          </div>
          <div className="flex items-center gap-3">
            {modelInfo && (
              <span className="text-[11px] text-cb-muted hidden sm:block">
                {modelInfo.trained
                  ? `Model Trained · ${modelInfo.feedbackCount} Ratings`
                  : modelInfo.feedbackCount > 0
                    ? `${modelInfo.feedbackCount} Ratings · Need 5+`
                    : "Rate Movies To Train Your Model"}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 cursor-pointer"
              title="Change Your Setup"
            >
              Setup
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {/* Hero */}
        <section className="relative mt-6 sm:mt-10 rounded-2xl overflow-hidden border border-white/[0.06]">
          <div className="relative h-[360px] sm:h-[420px] bg-black">
            {featured?.poster_path && (
              <>
                {/* Left side: crisp */}
                <img
                  src={featured.poster_path}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-65"
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 78%)",
                    maskImage:
                      "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 78%)",
                  }}
                />
                {/* Right side: cinematic blur */}
                <img
                  src={featured.poster_path}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-[10px] opacity-40"
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 46%, rgba(0,0,0,0) 72%)",
                    maskImage:
                      "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 46%, rgba(0,0,0,0) 72%)",
                  }}
                />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_20%_20%,rgba(229,9,20,0.22),transparent_55%)]" />

            <div className="relative h-full flex items-end sm:items-center">
              <div className="p-6 sm:p-10 max-w-xl">
                <div className="flex items-center gap-3 mb-3">
                  <span className="h-4 w-1 bg-cb-accent rounded-sm shadow-[0_0_18px_rgba(229,9,20,0.35)]" />
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">
                    Featured Pick
                  </p>
                </div>
                <h1 className="text-4xl sm:text-6xl font-black text-white leading-[1.05] tracking-tight">
                  {featured ? featured.title : "SceneSense"}
                </h1>
                {(featuredMeta.rating || featuredMeta.year || featuredMeta.genresText) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[12px] text-white/65">
                    {featuredMeta.rating && (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-cb-gold font-semibold">{featuredMeta.rating}</span>
                        <span className="text-white/35">/10</span>
                      </span>
                    )}
                    {featuredMeta.year && <span>{featuredMeta.year}</span>}
                    {featuredMeta.genresText && <span>{featuredMeta.genresText}</span>}
                  </div>
                )}
                {featured?.description && (
                  <p className="text-sm sm:text-base text-white/70 mt-4 line-clamp-3">
                    {featured.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSetup(true);
                      setStep(0);
                    }}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-white text-black hover:bg-white/90 cursor-pointer"
                  >
                    Personalize
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canSubmit) {
                        setShowSetup(true);
                        setStep(0);
                        return;
                      }
                      handleSubmit();
                    }}
                    disabled={!canSubmit || loading}
                    className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
                      canSubmit && !loading
                        ? "border-white/20 text-white hover:bg-white/10 cursor-pointer hover:border-white/30"
                        : "border-white/10 text-white/40 cursor-not-allowed"
                    }`}
                  >
                    {loading ? "Loading…" : "Refresh Picks"}
                  </button>
                </div>

                {!hasSearched && (
                  <p className="text-[12px] text-white/45 mt-4">
                    Start by clicking{" "}
                    <span className="text-white/70 font-semibold">
                      Personalize
                    </span>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-lg">
            {error}
          </div>
        )}

        {/* Skeleton loading */}
        {loading && (
          <section className="mt-10">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </section>
        )}

        {!loading && movies.length > 0 && (
          <div className="animate-fade-up">
            <SectionRow
              title="Top 10 For You"
              subtitle="Your Strongest Matches Right Now"
              movies={top10}
              context={context}
            />
            <SectionRow
              title={genreHint}
              subtitle="Similar Tone And Themes"
              movies={rowA}
              context={context}
            />
            <SectionRow
              title="Hidden Gems"
              subtitle="More Picks To Explore"
              movies={rowB}
              context={context}
            />
            <SectionRow
              title="Highly Rated"
              subtitle="Great Ratings Across The Board"
              movies={highlyRated}
              context={context}
            />
          </div>
        )}

        {!loading && hasSearched && movies.length === 0 && !error && (
          <p className="text-cb-muted text-sm mt-10">
            No movies matched your filters. Try loosening the length or genre
            criteria.
          </p>
        )}
      </main>

      {/* Setup modal */}
      {showSetup && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowSetup(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-white/[0.10] bg-cb-surface/80 backdrop-blur-xl shadow-[0_40px_120px_rgba(0,0,0,0.75)]">
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Personalize SceneSense
                  </h2>
                  <p className="text-[12px] text-cb-muted mt-0.5">
                    Quick Setup — Switch Tabs To Edit, Then Generate Picks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
                  title="Close"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="px-5 sm:px-6 py-5">
                <div className="mb-6">
                  <WizardTabs step={step} setStep={setStep} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {step === 0 && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[11px] font-medium text-cb-muted uppercase tracking-wider mb-2">
                          Mood
                        </label>
                        <ContextSelector
                          category="mood"
                          value={mood}
                          onChange={setMood}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-cb-muted uppercase tracking-wider mb-2">
                          Time of day
                        </label>
                        <ContextSelector
                          category="time_of_day"
                          value={timeOfDay}
                          onChange={setTimeOfDay}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-cb-muted uppercase tracking-wider mb-2">
                          Watching with
                        </label>
                        <ContextSelector
                          category="company"
                          value={company}
                          onChange={setCompany}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-cb-dim">
                          Step 1 of 2
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-sm font-semibold text-white/90 hover:text-white cursor-pointer"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[11px] font-medium text-cb-muted uppercase tracking-wider mb-2">
                            Age group
                          </label>
                          <ContextSelector
                            category="age_group"
                            value={ageGroup}
                            onChange={setAgeGroup}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-cb-muted uppercase tracking-wider mb-2">
                            Movie length
                          </label>
                          <ContextSelector
                            category="length_pref"
                            value={lengthPref}
                            onChange={setLengthPref}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-cb-muted uppercase tracking-wider mb-2">
                          Preferred genres
                          <span className="text-cb-dim ml-1 normal-case">
                            (optional, multi-select)
                          </span>
                        </label>
                        <GenreSelector selected={genres} onChange={setGenres} />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setStep(0)}
                          className="text-sm font-semibold text-white/70 hover:text-white cursor-pointer"
                        >
                          ← Back
                        </button>

                        <button
                          type="submit"
                          disabled={!canSubmit || loading}
                          className={`
                            px-7 py-2.5 rounded-md text-sm font-semibold tracking-wide
                            transition-all duration-150
                            ${
                              canSubmit && !loading
                                ? "bg-cb-accent hover:bg-[color:var(--color-cb-accent-2)] text-white cursor-pointer shadow-lg shadow-red-500/20"
                                : "bg-cb-border text-cb-dim cursor-not-allowed"
                            }
                          `}
                        >
                          {loading ? "Searching…" : "Get Recommendations"}
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-white">
                            Ready.
                          </h3>
                          <p className="text-[12px] text-cb-muted mt-0.5">
                            Close this modal to see your Netflix-style rows.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSetup(false)}
                          className="px-5 py-2 rounded-md text-sm font-semibold bg-white text-black hover:bg-white/90 cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
