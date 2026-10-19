"""Load newfacade/LeetCodeDataset from Hugging Face into code-service's Postgres database.

Run from the CodeService directory after creating the database and schema
(see ../sql/databases.sql and ../sql/schema.sql):

    pip install -r setup/requirements.txt
    python setup/dataset.py
"""

import os
from pathlib import Path

import psycopg2
from datasets import concatenate_datasets, load_dataset
from dotenv import load_dotenv
from psycopg2.extras import Json, execute_values

DATASET_NAME = "newfacade/LeetCodeDataset"
BATCH_SIZE = 500

# service/CodeService/setup/dataset.py -> repo root, matching src/db.ts's dotenv path.
ENV_PATH = Path(__file__).resolve().parents[3] / ".env"

COLUMNS = [
    "task_id",
    "question_id",
    "difficulty",
    "tags",
    "problem_description",
    "starter_code",
    "estimated_date",
    "prompt",
    "completion",
    "entry_point",
    "test",
    "input_output",
    "query",
    "response",
]

UPSERT_SQL = f"""
    INSERT INTO problems ({", ".join(COLUMNS)})
    VALUES %s
    ON CONFLICT (task_id) DO UPDATE SET
        {", ".join(f"{col} = EXCLUDED.{col}" for col in COLUMNS if col != "task_id")}
"""


def row_to_tuple(row: dict) -> tuple:
    input_output = row.get("input_output")

    return (
        row.get("task_id"),
        row.get("question_id"),
        row.get("difficulty"),
        row.get("tags") or [],
        row.get("problem_description"),
        row.get("starter_code"),
        row.get("estimated_date"),
        row.get("prompt"),
        row.get("completion"),
        row.get("entry_point"),
        row.get("test"),
        Json(input_output) if input_output is not None else None,
        row.get("query"),
        row.get("response"),
    )


def get_connection():
    return psycopg2.connect(
        host=os.environ["POSTGRES_HOST"],
        port=os.environ["POSTGRES_PORT"],
        dbname=os.environ["CODE_POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
    )


def load_rows():
    dataset = load_dataset(DATASET_NAME)
    return concatenate_datasets([dataset[split] for split in dataset.keys()])


def main():
    load_dotenv(ENV_PATH)
    rows = load_rows()

    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            batch = []
            for row in rows:
                batch.append(row_to_tuple(row))
                if len(batch) >= BATCH_SIZE:
                    execute_values(cur, UPSERT_SQL, batch)
                    batch.clear()
            if batch:
                execute_values(cur, UPSERT_SQL, batch)
        print(f"Loaded {len(rows)} problems into '{os.environ['CODE_POSTGRES_DB']}'.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
