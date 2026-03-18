import os
import logging
from contextlib import asynccontextmanager
from enum import Enum
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from dataset_loader import load_movies, get_movies
from recommender import recommend, init_model, retrain_model, get_model_stats
from feedback_store import init_db, add_feedback, get_feedback_count

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not TMDB_API_KEY:
        logger.error(
            "TMDB_API_KEY is not set. "
            "Export it as an environment variable or add it to .env"
        )
    else:
        await load_movies(api_key=TMDB_API_KEY, pages=25)
        init_model()
    yield


app = FastAPI(
    title="CineMatch — ML Movie Recommender",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Enums & Schemas
# ---------------------------------------------------------------------------

class Mood(str, Enum):
    happy = "happy"
    sad = "sad"
    excited = "excited"
    relaxed = "relaxed"


class TimeOfDay(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    night = "night"


class Company(str, Enum):
    alone = "alone"
    friends = "friends"
    family = "family"


class AgeGroup(str, Enum):
    kids = "kids"
    teens = "teens"
    adults = "adults"


class LengthPref(str, Enum):
    short = "short"
    medium = "medium"
    long = "long"
    any = "any"


class RecommendRequest(BaseModel):
    mood: Mood
    time_of_day: TimeOfDay
    company: Company
    age_group: AgeGroup = AgeGroup.adults
    genres: list[str] = []
    length_pref: LengthPref = LengthPref.any
    n: Optional[int] = Field(default=12, ge=1, le=50)


class MovieOut(BaseModel):
    id: int
    title: str
    genres: list[str]
    rating: float
    runtime: Optional[int]
    description: str
    poster_path: Optional[str]
    release_date: str
    relevance_score: float


class RecommendResponse(BaseModel):
    count: int
    movies: list[MovieOut]
    model_trained: bool
    feedback_count: int


class FeedbackRequest(BaseModel):
    movie_id: int
    mood: Mood
    time_of_day: TimeOfDay
    company: Company
    age_group: AgeGroup = AgeGroup.adults
    genres: list[str] = []
    length_pref: LengthPref = LengthPref.any
    liked: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    stats = get_model_stats()
    return {
        "status": "ok",
        "movies_loaded": len(get_movies()),
        "model_trained": stats["is_trained"],
        "feedback_count": stats["feedback_count"],
    }


@app.post("/recommend", response_model=RecommendResponse)
async def get_recommendations(body: RecommendRequest):
    movies = get_movies()
    if not movies:
        raise HTTPException(
            status_code=503,
            detail="Movie dataset has not been loaded yet. Check TMDB_API_KEY.",
        )

    results = recommend(
        mood=body.mood.value,
        time_of_day=body.time_of_day.value,
        company=body.company.value,
        age_group=body.age_group.value,
        genres=body.genres,
        length_pref=body.length_pref.value,
        n=body.n,
    )

    stats = get_model_stats()
    return RecommendResponse(
        count=len(results),
        movies=results,
        model_trained=stats["is_trained"],
        feedback_count=stats["feedback_count"],
    )


@app.post("/feedback")
async def submit_feedback(body: FeedbackRequest):
    add_feedback(
        movie_id=body.movie_id,
        mood=body.mood.value,
        time_of_day=body.time_of_day.value,
        company=body.company.value,
        liked=body.liked,
        age_group=body.age_group.value,
        genres=body.genres,
        length_pref=body.length_pref.value,
    )
    count = get_feedback_count()
    if count % 5 == 0:
        retrain_model()
        logger.info("Model retrained after %d feedback entries", count)
    return {"status": "ok", "total_feedback": count}
