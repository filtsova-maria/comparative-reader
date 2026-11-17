import json

from backend.main import DATA_DIR, load_all_metadata, to_summary
from backend.opensearch_backend import (
    create_client,
    ensure_indices,
    index_testimony,
)


def main() -> None:
    client = create_client()
    try:
        ensure_indices(client)
        metadata_records = load_all_metadata()
        indexed_sentences = 0
        for metadata in metadata_records:
            summary = to_summary(metadata)
            sentences_path = DATA_DIR / f"{summary.id}.sentences.json"
            sentences_doc = (
                json.loads(sentences_path.read_text(encoding="utf-8"))
                if sentences_path.is_file()
                else None
            )
            if sentences_doc is not None:
                indexed_sentences += len(sentences_doc["sentences"])
            index_testimony(client, summary.model_dump(), sentences_doc)
        print(
            f"Indexed {len(metadata_records)} testimonies and "
            f"{indexed_sentences} sentences."
        )
    finally:
        client.close()


if __name__ == "__main__":
    main()
