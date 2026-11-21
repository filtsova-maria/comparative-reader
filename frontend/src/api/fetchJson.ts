import { serverUrl } from './const';

export async function fetchJson<T>(
    path: string,
    errorMessage: string,
    signal?: AbortSignal,
): Promise<T> {
    const response = await fetch(`${serverUrl}${path}`, { signal });

    if (!response.ok) {
        throw new Error(
            `${errorMessage}: ${response.status} ${response.statusText}`,
        );
    }

    return response.json();
}
