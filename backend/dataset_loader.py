import os
import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

GENRE_MAP: dict[int, str] = {}

# ---------------------------------------------------------------------------
# Context-tag heuristics: genre name -> set of applicable context values
# ---------------------------------------------------------------------------

MOOD_GENRES: dict[str, set[str]] = {
    "happy": {"Comedy", "Animation", "Music", "Family"},
    "sad": {"Drama", "Romance"},
    "excited": {"Action", "Thriller", "Science Fiction", "Adventure"},
    "relaxed": {"Documentary", "Animation", "Comedy", "Romance"},
}

TIME_GENRES: dict[str, set[str]] = {
    "morning": {"Comedy", "Animation", "Family", "Music"},
    "afternoon": {"Action", "Adventure", "Science Fiction", "Comedy", "Fantasy"},
    "night": {"Thriller", "Horror", "Drama", "Mystery", "Crime"},
}

COMPANY_GENRES: dict[str, set[str]] = {
    "alone": {"Drama", "Thriller", "Horror", "Documentary", "Mystery"},
    "friends": {"Action", "Comedy", "Adventure", "Science Fiction"},
    "family": {"Animation", "Family", "Comedy", "Adventure", "Fantasy"},
}

TIME_RUNTIME: dict[str, tuple[int, int]] = {
    "morning": (0, 100),
    "afternoon": (80, 150),
    "night": (90, 300),
}

# ---------------------------------------------------------------------------
# In-memory movie cache
# ---------------------------------------------------------------------------

_movies_cache: list[dict] = []
_loaded = False


def _assign_context_tags(movie: dict) -> dict:
    """Attach mood / time / company suitability lists to a movie dict."""
    genres = set(movie.get("genres", []))

    movie["mood_tags"] = [
        mood for mood, g in MOOD_GENRES.items() if genres & g
    ]
    movie["time_tags"] = [
        t for t, g in TIME_GENRES.items() if genres & g
    ]
    movie["company_tags"] = [
        c for c, g in COMPANY_GENRES.items() if genres & g
    ]

    runtime = movie.get("runtime") or 120
    for period, (lo, hi) in TIME_RUNTIME.items():
        if lo <= runtime <= hi and period not in movie["time_tags"]:
            movie["time_tags"].append(period)

    return movie


async def _fetch_genre_map(client: httpx.AsyncClient, api_key: str) -> None:
    """Populate the global GENRE_MAP from TMDB."""
    global GENRE_MAP
    resp = await client.get(
        f"{TMDB_BASE}/genre/movie/list",
        params={"api_key": api_key, "language": "en-US"},
    )
    resp.raise_for_status()
    for g in resp.json().get("genres", []):
        GENRE_MAP[g["id"]] = g["name"]


async def _fetch_movies_page(
    client: httpx.AsyncClient, api_key: str, page: int
) -> list[dict]:
    """Fetch a single page from TMDB discover endpoint."""
    resp = await client.get(
        f"{TMDB_BASE}/discover/movie",
        params={
            "api_key": api_key,
            "language": "en-US",
            "sort_by": "popularity.desc",
            "include_adult": "false",
            "vote_count.gte": 200,
            "page": page,
        },
    )
    resp.raise_for_status()
    return resp.json().get("results", [])


def _parse_movie(raw: dict) -> dict:
    return {
        "id": raw["id"],
        "title": raw.get("title", "Unknown"),
        "genres": [GENRE_MAP.get(gid, "Unknown") for gid in raw.get("genre_ids", [])],
        "rating": raw.get("vote_average", 0),
        "vote_count": raw.get("vote_count", 0),
        "runtime": None,
        "description": raw.get("overview", ""),
        "poster_path": (
            f"{TMDB_IMAGE_BASE}{raw['poster_path']}" if raw.get("poster_path") else None
        ),
        "release_date": raw.get("release_date", ""),
    }


async def _fetch_runtime_batch(
    client: httpx.AsyncClient, api_key: str, movie_ids: list[int]
) -> dict[int, Optional[int]]:
    """Fetch runtimes for a batch of movie IDs concurrently."""
    results: dict[int, Optional[int]] = {}

    async def _get_one(mid: int) -> None:
        try:
            resp = await client.get(
                f"{TMDB_BASE}/movie/{mid}",
                params={"api_key": api_key, "language": "en-US"},
            )
            resp.raise_for_status()
            results[mid] = resp.json().get("runtime")
        except Exception:
            results[mid] = None

    sem = asyncio.Semaphore(10)

    async def _limited(mid: int) -> None:
        async with sem:
            await _get_one(mid)

    await asyncio.gather(*[_limited(mid) for mid in movie_ids])
    return results


async def load_movies(api_key: str, pages: int = 25) -> list[dict]:
    """
    Fetch popular movies from TMDB, enrich with runtime and context tags,
    and cache the result in memory.
    """
    global _movies_cache, _loaded

    if _loaded:
        return _movies_cache

    logger.info("Loading movies from TMDB (%d pages)...", pages)

    async with httpx.AsyncClient(timeout=30.0) as client:
        await _fetch_genre_map(client, api_key)

        raw_movies: list[dict] = []
        for page in range(1, pages + 1):
            try:
                batch = await _fetch_movies_page(client, api_key, page)
                raw_movies.extend(batch)
            except httpx.HTTPStatusError as exc:
                logger.warning("TMDB page %d failed: %s", page, exc)
                break

        movies = [_parse_movie(m) for m in raw_movies]
        seen_ids: set[int] = set()
        unique: list[dict] = []
        for m in movies:
            if m["id"] not in seen_ids:
                seen_ids.add(m["id"])
                unique.append(m)
        movies = unique

        logger.info("Fetching runtimes for %d movies...", len(movies))
        runtimes = await _fetch_runtime_batch(
            client, api_key, [m["id"] for m in movies]
        )
        for m in movies:
            m["runtime"] = runtimes.get(m["id"])

    movies = [_assign_context_tags(m) for m in movies]
    _movies_cache = movies
    _loaded = True
    logger.info("Loaded %d movies into cache.", len(movies))
    return movies


def get_movies() -> list[dict]:
    """Return the cached movie list (empty if not yet loaded)."""
    return _movies_cache
