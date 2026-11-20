import { serverUrl } from './const';
import type {
    ListTestimonyParams,
    TestimonyData,
    TestimonyMetadata,
    TestimonySearchResponse,
    TestimonySearchResult,
    SearchTestimonyParams,
    TestimonySummary,
} from './types';

export async function listTestimonyMetadata(
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
    if (params?.location) {
        searchParams.set('location', params.location);
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

export async function searchTestimonies(
    params: SearchTestimonyParams,
    signal?: AbortSignal,
): Promise<TestimonySearchResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('search', params.search);
    if (params.language) {
        searchParams.set('language', params.language);
    }
    if (params.location) {
        searchParams.set('location', params.location);
    }

    const response = await fetch(
        `${serverUrl}/api/search/testimonies?${searchParams.toString()}`,
        { signal },
    );

    if (!response.ok) {
        throw new Error(
            `Failed to search testimonies: ${response.status} ${response.statusText}`,
        );
    }

    return response.json();
}

export async function searchWithinTestimony(
    testimonyId: string,
    query: string,
    signal?: AbortSignal,
): Promise<TestimonySearchResponse> {
    const searchParams = new URLSearchParams({ q: query });
    const response = await fetch(
        `${serverUrl}/api/search/testimonies/${encodeURIComponent(testimonyId)}?${searchParams.toString()}`,
        { signal },
    );

    if (!response.ok) {
        throw new Error(
            `Failed to search testimony: ${response.status} ${response.statusText}`,
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

export async function getTestimonyMetadata(
    testimonyId: string,
    signal?: AbortSignal,
): Promise<TestimonyMetadata> {
    const response = await fetch(
        `${serverUrl}/api/testimonies/${encodeURIComponent(testimonyId)}`,
        { signal },
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch testimony metadata: ${response.status} ${response.statusText}`,
        );
    }

    return response.json();
}

export async function getTestimonyData(
    testimonyId: string,
    signal?: AbortSignal,
): Promise<TestimonyData> {
    const response = await fetch(
        `${serverUrl}/api/testimonies/${encodeURIComponent(testimonyId)}/data`,
        { signal },
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch testimony data: ${response.status} ${response.statusText}`,
        );
    }

    return response.json();
}
