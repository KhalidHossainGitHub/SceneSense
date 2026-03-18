import logging

import numpy as np

from dataset_loader import get_movies
from ml_model import MovieRecommenderModel
from feedback_store import get_all_feedback, get_feedback_count

logger = logging.getLogger(__name__)

model = MovieRecommenderModel()
_movies_index: dict[int, int] = {}

KIDS_EXCLUDE = {"Horror", "Crime", "Thriller", "War", "Mystery"}
TEENS_EXCLUDE = {"Horror"}


def init_model() -> None:
    movies = get_movies()
    if not movies:
        logger.warning("No movies loaded — ML model not initialised")
        return
    global _movies_index
    _movies_index = {m["id"]: idx for idx, m in enumerate(movies)}
    model.fit_content_features(movies)
    retrain_model()


def retrain_model() -> None:
    feedback = get_all_feedback()
    if feedback:
        ok = model.train(feedback, _movies_index)
        if ok:
            logger.info("Classifier retrained on %d records", len(feedback))


def get_model_stats() -> dict:
    return {
        "is_trained": model.is_trained,
        "feedback_count": get_feedback_count(),
    }


def recommend(
    mood: str,
    time_of_day: str,
    company: str,
    age_group: str = "adults",
    genres: list[str] | None = None,
    length_pref: str = "any",
    n: int = 12,
) -> list[dict]:
    movies = get_movies()
    if not movies:
        return []

    mood = mood.lower().strip()
    time_of_day = time_of_day.lower().strip()
    company = company.lower().strip()
    age_group = age_group.lower().strip()
    length_pref = length_pref.lower().strip()
    genres = genres or []

    ratings = np.array([m.get("rating", 0) or 0 for m in movies])

    scores = model.recommend_scores(
        mood, time_of_day, company, age_group, genres, length_pref,
        len(movies), ratings,
    )

    # --- Genre preference bonus ---
    if genres:
        genre_set = set(genres)
        for i, m in enumerate(movies):
            overlap = len(set(m.get("genres", [])) & genre_set)
            scores[i] += overlap * 0.25

    # --- Filtering mask ---
    mask = np.ones(len(movies), dtype=bool)

    # Age group filter
    if age_group == "kids":
        for i, m in enumerate(movies):
            if set(m.get("genres", [])) & KIDS_EXCLUDE:
                mask[i] = False
    elif age_group == "teens":
        for i, m in enumerate(movies):
            if set(m.get("genres", [])) & TEENS_EXCLUDE:
                mask[i] = False

    # Length filter
    if length_pref == "short":
        for i, m in enumerate(movies):
            if (m.get("runtime") or 120) > 100:
                mask[i] = False
    elif length_pref == "medium":
        for i, m in enumerate(movies):
            rt = m.get("runtime") or 120
            if rt < 85 or rt > 140:
                mask[i] = False
    elif length_pref == "long":
        for i, m in enumerate(movies):
            if (m.get("runtime") or 120) < 120:
                mask[i] = False

    scores[~mask] = -999

    top_indices = np.argsort(-scores)[:n]

    results: list[dict] = []
    for idx in top_indices:
        if scores[idx] < -1:
            break
        m = movies[idx]
        results.append(
            {
                "id": m["id"],
                "title": m["title"],
                "genres": m["genres"],
                "rating": m["rating"],
                "runtime": m["runtime"],
                "description": m["description"],
                "poster_path": m["poster_path"],
                "release_date": m["release_date"],
                "relevance_score": round(float(scores[idx]), 4),
            }
        )

    return results
