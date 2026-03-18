import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "feedback.db")


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as c:
        # migrate: if old schema exists without new columns, recreate
        try:
            c.execute("SELECT age_group FROM feedback LIMIT 1")
        except sqlite3.OperationalError:
            c.execute("DROP TABLE IF EXISTS feedback")

        c.execute(
            """
            CREATE TABLE IF NOT EXISTS feedback (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                movie_id    INTEGER NOT NULL,
                mood        TEXT    NOT NULL,
                time_of_day TEXT    NOT NULL,
                company     TEXT    NOT NULL,
                age_group   TEXT    NOT NULL DEFAULT 'adults',
                genres      TEXT    NOT NULL DEFAULT '',
                length_pref TEXT    NOT NULL DEFAULT 'any',
                liked       INTEGER NOT NULL,
                created_at  TEXT    NOT NULL
            )
            """
        )


def add_feedback(
    movie_id: int,
    mood: str,
    time_of_day: str,
    company: str,
    liked: bool,
    age_group: str = "adults",
    genres: list[str] | None = None,
    length_pref: str = "any",
) -> None:
    genres_str = ",".join(genres) if genres else ""
    with _conn() as c:
        c.execute(
            "INSERT INTO feedback "
            "(movie_id,mood,time_of_day,company,age_group,genres,length_pref,liked,created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (
                movie_id, mood, time_of_day, company,
                age_group, genres_str, length_pref,
                int(liked),
                datetime.now(timezone.utc).isoformat(),
            ),
        )


def get_all_feedback() -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT movie_id,mood,time_of_day,company,age_group,genres,length_pref,liked "
            "FROM feedback ORDER BY created_at"
        ).fetchall()
    return [{**dict(r), "liked": bool(r["liked"])} for r in rows]


def get_feedback_count() -> int:
    with _conn() as c:
        return c.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]
