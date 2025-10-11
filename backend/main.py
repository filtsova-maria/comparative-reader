from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer, util
import torch
from typing import Optional, Dict
from transformers import AutoTokenizer
from pathlib import Path
from fastapi.responses import JSONResponse


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    # TODO: This allows CORS requests from any origin. Change this to frontend URL later
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = SentenceTransformer("all-MiniLM-L6-v2")
store: Dict[str, Dict[str, Optional[torch.Tensor]]] = {
    "source": {"embeddings": None},
    "target": {"embeddings": None},
}


class SegmentsPayload(BaseModel):
    type: str  # "source" or "target"
    segments: list[str]  # text segments from frontend


class SimilarityRequest(BaseModel):
    selected_ids: list[int]  # indexes of selected segments


@app.post("/upload-segments")
def upload_segments(payload: SegmentsPayload):
    print(f"Received {payload.type} segments: {len(payload.segments)} segments")
    embeddings = model.encode(payload.segments, convert_to_tensor=True)
    store[payload.type]["embeddings"] = embeddings
    # TODO: add logger
    # TODO: consider using a vector database for storing embeddings
    print(f"Processed {payload.type} segments: {len(payload.segments)} segments")
    return {"status": "ok", "count": len(payload.segments)}


# TODO: test similarity computation and embedding correspondence to segments
# TODO: consider recomputing embeds instead of taking mean
@app.post("/compute-similarity")
def compute_similarity(req: SimilarityRequest):
    if store["source"]["embeddings"] is None or store["target"]["embeddings"] is None:
        return {"error": "Missing embeddings"}

    # Get embeddings of selected IDs directly from stored tensor
    selected_embeds = torch.stack(
        [store["source"]["embeddings"][i] for i in req.selected_ids]
    )

    # Mean of selected embeddings
    mean_embed = selected_embeds.mean(dim=0, keepdim=True)

    # Cosine similarity against target
    sims = util.cos_sim(mean_embed, store["target"]["embeddings"]).squeeze(0)

    # Normalize to [0, 1]
    min_val, max_val = sims.min(), sims.max()
    norm_sims = (sims - min_val) / (max_val - min_val) if max_val > min_val else sims
    # Get target segment IDs sorted by similarity (descending order)
    target_segment_ids = torch.argsort(norm_sims, descending=True).tolist()
    print(f"Computed similarities for {len(req.selected_ids)} segments")
    return {
        "similarities": norm_sims.tolist(),  # similarities for each target segment in original order
        "target_segment_ids": target_segment_ids,  # target segment IDs sorted by similarity (descending)
    }


@app.post("/swap-documents")
def swap_documents():
    store["source"], store["target"] = store["target"], store["source"]
    print("Swapped source and target documents")
    return {"status": "swapped"}


tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")


def generate_embed(text: str):
    tokens = tokenizer.tokenize(text)

    max_tokens = 256
    if len(tokens) > max_tokens:
        half_limit = max_tokens // 2
        truncated_tokens = tokens[: half_limit - 1] + tokens[-half_limit + 1 :]
        truncated_text = tokenizer.convert_tokens_to_string(truncated_tokens)
    else:
        truncated_text = text
    embedding = model.encode(truncated_text, convert_to_tensor=True)
    return (
        torch.tensor(embedding)
        if not isinstance(embedding, torch.Tensor)
        else embedding
    )


import pickle

# Path to the file where embeddings will be stored
EMBEDDINGS_FILE = "court_data_store.pkl"

# Load precomputed embeddings from file if it exists
try:
    with open(EMBEDDINGS_FILE, "rb") as f:
        court_data_store: Dict[str, torch.Tensor] = pickle.load(f)
    print(f"Loaded {len(court_data_store)} embeddings from {EMBEDDINGS_FILE}")
except FileNotFoundError:
    court_data_store: Dict[str, torch.Tensor] = {}
    print(f"No precomputed embeddings found. Starting fresh.")


COURT_DATA = "../data/soudni_data/SupAdmCo/"


@app.get("/most-similar-docs")
def most_similar_docs():
    print("Computing most similar documents...")
    filenames_path = "../demo/src/filenames.txt"

    # Generate embedding for the reference text
    reference_text_path = COURT_DATA + "000211A___0300073A_prevedeno.txt"
    reference_text = Path(reference_text_path).read_text()
    reference_embedding = generate_embed(reference_text)

    # Read filenames from the file
    filenames = Path(filenames_path).read_text().strip().splitlines()

    distances = []
    for filename in filenames:
        print(f"{len(distances)}/{len(filenames)}: Processing file {filename}")
        file_path = Path(COURT_DATA) / filename
        if not file_path.exists():
            distances.append({"filename": filename, "error": "File not found"})
            continue

        # Check if the embedding is already in the store
        if filename in court_data_store:
            file_embedding = court_data_store[filename]
        else:
            # Read the content of the file
            file_content = file_path.read_text()

            # Generate embedding for the file content
            file_embedding = generate_embed(file_content)

            # Store the embedding in the dictionary
            court_data_store[filename] = file_embedding

        # Compute cosine similarity
        cosine_similarity = util.cos_sim(reference_embedding, file_embedding).item()

        # Append the result
        distances.append({"filename": filename, "cosine_similarity": cosine_similarity})

    # Save updated embeddings to file after processing all files
    if not Path(EMBEDDINGS_FILE).exists():
        print(f"Saving embeddings to {EMBEDDINGS_FILE}...")
        with open(EMBEDDINGS_FILE, "wb") as f:
            pickle.dump(court_data_store, f)
    print(f"Done processing {len(filenames)} files.")

    # Sort distances by cosine similarity in descending order
    distances = sorted(
        distances,
        key=lambda x: x.get("cosine_similarity", float("-inf")),
        reverse=True,
    )
    return {"distances": distances}


@app.get("/fetch-file")
def fetch_file(file_name: str):
    try:
        file_path = Path(COURT_DATA) / file_name
        if not file_path.exists():
            return JSONResponse(
                status_code=404, content={"error": f"File not found: {file_name}"}
            )
        # Read the file content
        file_content = file_path.read_text()
        return {"filename": file_name, "content": file_content}
    except FileNotFoundError:
        return JSONResponse(
            status_code=404, content={"error": f"File not found: {file_name}"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": f"Failed to read file: {str(e)}"}
        )
