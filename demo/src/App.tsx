import { createEffect, createSignal, type Component } from 'solid-js';
import styles from './App.module.css';

// Backend communication
const API_URL = "http://localhost:8000";
export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }
  return res.json();
}

type SimilarityResponse = {distances: { filename: string, cosine_similarity: number }[]};

// Frontend
const App: Component = () => {
  const sourceFile = '000211A___0300073A_prevedeno.txt';
  const [targetFiles, setTargetFiles] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal<boolean>(true);


  const fetchMostSimilarDocs = async () => {
    try {
      setLoading(true);
      const result: SimilarityResponse = await apiGet("/most-similar-docs");
      setTargetFiles(result.distances.map(d => d.filename));
    } catch (error) {
      console.error("Error fetching most similar docs:", error);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    fetchMostSimilarDocs();
  });

  return (
    <div class={styles.App}>
      <header class={styles.header}>Soudní data</header>
      {loading() ? (
        <div>
          <span>Loading...</span>
        <div class={styles.spinner}/>
        </div>
      ) : (
        <ul>
          {targetFiles().map((targetFile) => (
            <li>
              <a
                href={`http://localhost:3000?source=${encodeURIComponent(
                  sourceFile
                )}&target=${encodeURIComponent(targetFile)}`}
              >
                {sourceFile} → {targetFile}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>

  );
};

export default App;
