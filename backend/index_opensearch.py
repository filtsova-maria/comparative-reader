import json

from backend.repository import DATA_DIR, iter_all_metadata, to_summary
from backend.opensearch_backend import (
    create_client,
    index_testimonies,
)


def main() -> None:
    client = create_client()
    try:
        indexed_testimonies = 0
        indexed_sentences = 0

        def iter_testimonies():
            nonlocal indexed_sentences, indexed_testimonies
            for metadata in iter_all_metadata():
                indexed_testimonies += 1
                summary = to_summary(metadata)
                sentences_path = DATA_DIR / f"{summary.id}.sentences.json"
                sentences_doc = (
                    json.loads(sentences_path.read_text(encoding="utf-8"))
                    if sentences_path.is_file()
                    else None
                )
                if sentences_doc is not None:
                    indexed_sentences += len(sentences_doc["sentences"])
                yield summary.model_dump(), sentences_doc

        index_testimonies(client, iter_testimonies())
        print(
            f"Indexed {indexed_testimonies} testimonies and "
            f"{indexed_sentences} sentences."
        )
    finally:
        client.close()


if __name__ == "__main__":
    main()
