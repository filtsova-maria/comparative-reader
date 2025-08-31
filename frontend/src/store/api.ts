// /upload-segments
export interface UploadSegmentsResponse {
  status: string; // "ok"
  count: number; // Number of segments uploaded
}

// /compute-similarity
export interface ComputeSimilarityResponse {
  similarities: number[]; // Array of similarity scores
  target_segment_ids: number[]; // Array that indexes segments sorted by similarity
}

// /swap-documents
export interface SwapDocumentsResponse {
  status: string; // "swapped"
}

const API_URL = "http://localhost:8000";

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // TODO: consider adding a logger
    throw new Error(`API request failed with status ${res.status}`);
  }
  return res.json();
}
