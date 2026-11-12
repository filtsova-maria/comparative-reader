import { serverUrl } from './const';
import type { ListTestimonyParams, TestimonySummary } from './types';

export async function listTestimonies(
    params: ListTestimonyParams = {},
    signal?: AbortSignal,
): Promise<TestimonySummary[]> {
    const searchParams = new URLSearchParams();

    if (params?.search) {
        searchParams.set('search', params.search);
    }
    if (params?.language) {
        searchParams.set('language', params.language);
    }

    const query = searchParams.toString();
    const response = await fetch(
        `${serverUrl}/api/testimonies${query ? `?${query}` : ''}`,
        { signal },
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch testimonies: ${response.status} ${response.statusText}`,
        );
    }

    return response.json();
}

export async function listLanguages(signal?: AbortSignal): Promise<string[]> {
    const response = await fetch(`${serverUrl}/api/languages`, { signal });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch languages: ${response.status} ${response.statusText}`,
        );
    }

    return response.json();
}
