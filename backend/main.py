from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer, util
import torch
from typing import Optional, Dict

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
# FIXME: I have a feeling that swapping doesn't work correctly
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
