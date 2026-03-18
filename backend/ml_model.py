import logging

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

MOOD_KEYS = ["happy", "sad", "excited", "relaxed"]
TIME_KEYS = ["morning", "afternoon", "night"]
COMPANY_KEYS = ["alone", "friends", "family"]
AGE_KEYS = ["kids", "teens", "adults"]
LENGTH_KEYS = ["short", "medium", "long", "any"]
GENRE_KEYS = [
    "Action", "Adventure", "Animation", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Fantasy", "History",
    "Horror", "Music", "Mystery", "Romance", "Science Fiction",
    "Thriller", "War", "Western",
]

CONTEXT_KEYWORDS: dict[str, dict[str, str]] = {
    "mood": {
        "happy": "comedy animation music family fun cheerful upbeat humorous",
        "sad": "drama romance emotional moving heartfelt melancholy poignant",
        "excited": "action thriller science fiction adventure intense explosive suspense",
        "relaxed": "documentary animation comedy romance calm gentle peaceful",
    },
    "time": {
        "morning": "comedy animation family music light bright fun wholesome",
        "afternoon": "action adventure science fiction comedy fantasy epic blockbuster",
        "night": "thriller horror drama mystery crime dark intense noir suspense",
    },
    "company": {
        "alone": "drama thriller horror documentary mystery deep thoughtful introspective",
        "friends": "action comedy adventure science fiction fun exciting group",
        "family": "animation family comedy adventure fantasy wholesome heartwarming",
    },
    "age": {
        "kids": "animation family comedy adventure fun bright colorful cheerful wholesome",
        "teens": "action comedy adventure fantasy science fiction thriller exciting",
        "adults": "drama thriller crime mystery romance documentary intense thought noir",
    },
    "length": {
        "short": "comedy animation short fun quick light",
        "medium": "drama comedy action adventure",
        "long": "epic drama adventure fantasy science fiction saga",
        "any": "",
    },
}


class MovieRecommenderModel:
    """
    Hybrid recommender: TF-IDF content similarity + SGD classifier
    that learns from user feedback. Supports mood, time, company,
    age group, genre preferences, and length preference.
    """

    def __init__(self, max_tfidf_features: int = 3000):
        self.tfidf = TfidfVectorizer(
            max_features=max_tfidf_features, stop_words="english"
        )
        self.movie_features = None
        self.classifier: SGDClassifier | None = None
        self.is_trained = False
        self.feedback_count = 0
        self._min_feedback = 5

    def fit_content_features(self, movies: list[dict]) -> None:
        texts = []
        for m in movies:
            genres = " ".join(m.get("genres", []))
            desc = m.get("description", "")
            texts.append(f"{genres} {genres} {genres} {desc}")
        self.movie_features = self.tfidf.fit_transform(texts)
        logger.info("TF-IDF matrix built: %s", self.movie_features.shape)

    # ------------------------------------------------------------------
    # Content-based scoring
    # ------------------------------------------------------------------

    def _context_text(
        self,
        mood: str,
        time_of_day: str,
        company: str,
        age_group: str,
        genres: list[str],
        length_pref: str,
    ) -> str:
        parts = [
            CONTEXT_KEYWORDS["mood"].get(mood, ""),
            CONTEXT_KEYWORDS["time"].get(time_of_day, ""),
            CONTEXT_KEYWORDS["company"].get(company, ""),
            CONTEXT_KEYWORDS["age"].get(age_group, ""),
            CONTEXT_KEYWORDS["length"].get(length_pref, ""),
        ]
        if genres:
            parts.append(" ".join(genres) * 3)
        return " ".join(parts)

    def content_scores(
        self,
        mood: str,
        time_of_day: str,
        company: str,
        age_group: str,
        genres: list[str],
        length_pref: str,
    ) -> np.ndarray:
        text = self._context_text(mood, time_of_day, company, age_group, genres, length_pref)
        profile = self.tfidf.transform([text])
        return cosine_similarity(profile, self.movie_features).flatten()

    # ------------------------------------------------------------------
    # Context encoding for the classifier
    # ------------------------------------------------------------------

    @staticmethod
    def _encode_context(
        mood: str,
        time_of_day: str,
        company: str,
        age_group: str = "adults",
        genres: list[str] | None = None,
        length_pref: str = "any",
    ) -> np.ndarray:
        vec: list[float] = []
        vec.extend(1.0 if mood == m else 0.0 for m in MOOD_KEYS)
        vec.extend(1.0 if time_of_day == t else 0.0 for t in TIME_KEYS)
        vec.extend(1.0 if company == c else 0.0 for c in COMPANY_KEYS)
        vec.extend(1.0 if age_group == a else 0.0 for a in AGE_KEYS)
        vec.extend(1.0 if length_pref == lp else 0.0 for lp in LENGTH_KEYS)
        genre_set = set(genres or [])
        vec.extend(1.0 if g in genre_set else 0.0 for g in GENRE_KEYS)
        return np.array(vec)

    # ------------------------------------------------------------------
    # Classifier training & prediction
    # ------------------------------------------------------------------

    def train(
        self, feedback_records: list[dict], movies_index: dict[int, int]
    ) -> bool:
        if len(feedback_records) < self._min_feedback:
            return False

        X, y = [], []
        for rec in feedback_records:
            idx = movies_index.get(rec["movie_id"])
            if idx is None:
                continue
            movie_feat = self.movie_features[idx].toarray().flatten()
            genres_list = rec.get("genres", "")
            if isinstance(genres_list, str):
                genres_list = [g for g in genres_list.split(",") if g]
            ctx_feat = self._encode_context(
                rec["mood"],
                rec["time_of_day"],
                rec["company"],
                rec.get("age_group", "adults"),
                genres_list,
                rec.get("length_pref", "any"),
            )
            X.append(np.concatenate([movie_feat, ctx_feat]))
            y.append(1 if rec["liked"] else 0)

        if len(X) < self._min_feedback or len(set(y)) < 2:
            return False

        self.classifier = SGDClassifier(
            loss="log_loss", random_state=42, max_iter=1000
        )
        self.classifier.fit(np.array(X), np.array(y))
        self.is_trained = True
        self.feedback_count = len(feedback_records)
        logger.info("SGD classifier trained on %d samples", len(X))
        return True

    def predict_scores(
        self,
        mood: str,
        time_of_day: str,
        company: str,
        age_group: str,
        genres: list[str],
        length_pref: str,
        n_movies: int,
    ) -> np.ndarray | None:
        if not self.is_trained or self.classifier is None:
            return None
        try:
            ctx = self._encode_context(mood, time_of_day, company, age_group, genres, length_pref)
            dense = self.movie_features.toarray()
            ctx_tiled = np.tile(ctx, (n_movies, 1))
            combined = np.hstack([dense, ctx_tiled])
            return self.classifier.predict_proba(combined)[:, 1]
        except Exception as exc:
            logger.warning("ML prediction failed: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Hybrid scoring
    # ------------------------------------------------------------------

    def recommend_scores(
        self,
        mood: str,
        time_of_day: str,
        company: str,
        age_group: str,
        genres: list[str],
        length_pref: str,
        n_movies: int,
        ratings: np.ndarray,
    ) -> np.ndarray:
        cb = self.content_scores(mood, time_of_day, company, age_group, genres, length_pref)
        cb_min, cb_max = cb.min(), cb.max()
        if cb_max > cb_min:
            cb = (cb - cb_min) / (cb_max - cb_min)

        rating_bonus = (ratings / 10.0) * 0.2

        ml = self.predict_scores(
            mood, time_of_day, company, age_group, genres, length_pref, n_movies
        )
        if ml is not None:
            alpha = min(0.6, 0.2 + (self.feedback_count / 50) * 0.4)
            return alpha * ml + (1 - alpha) * cb + rating_bonus
        return cb + rating_bonus
