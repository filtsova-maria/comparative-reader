import { fetchJson } from './fetchJson';
import type {
    ListTestimonyParams,
    TestimonyData,
    TestimonyMetadata,
    TestimonySearchResponse,
    TestimonySearchResult,
    SearchTestimonyParams,
    TestimonySummary,
} from './types';

function buildQueryParams(
    params: Record<
        string,
        string | number | readonly string[] | null | undefined
    >,
    omitEmpty = false,
): URLSearchParams {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (
            value === undefined ||
            value === null ||
            (omitEmpty && value === '')
        ) {
            continue;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                searchParams.append(key, item);
            }
            continue;
        }
        searchParams.set(key, String(value));
    }
    return searchParams;
}

export async function listTestimonyMetadata(
    params: ListTestimonyParams = {},
    signal?: AbortSignal,
): Promise<TestimonySummary[]> {
    const searchParams = buildQueryParams(params, true);
    const query = searchParams.toString();
    return fetchJson(
        `/api/testimonies${query ? `?${query}` : ''}`,
        'Failed to fetch testimonies',
        signal,
    );
}

export async function countTestimonies(
    params: {
        language?: string | null;
        location?: string | null;
        excluded_ids?: string[];
    },
    signal?: AbortSignal,
): Promise<number> {
    const searchParams = buildQueryParams(
        {
            language: params.language,
            location: params.location,
            excluded_ids: params.excluded_ids,
        },
        true,
    );
    const query = searchParams.toString();
    return fetchJson(
        `/api/testimonies/count${query ? `?${query}` : ''}`,
        'Failed to count testimonies',
        signal,
    );
}

export async function searchTestimonies(
    params: SearchTestimonyParams,
    signal?: AbortSignal,
): Promise<TestimonySearchResult[]> {
    const searchParams = buildQueryParams(params);
    return fetchJson(
        `/api/search/testimonies?${searchParams.toString()}`,
        'Failed to search testimonies',
        signal,
    );
}

export async function searchWithinTestimony(
    testimonyId: string,
    query: string,
    signal?: AbortSignal,
): Promise<TestimonySearchResponse> {
    const searchParams = buildQueryParams({ q: query });
    return fetchJson(
        `/api/search/testimonies/${encodeURIComponent(testimonyId)}?${searchParams.toString()}`,
        'Failed to search testimony',
        signal,
    );
}

export async function listLanguages(signal?: AbortSignal): Promise<string[]> {
    return fetchJson('/api/languages', 'Failed to fetch languages', signal);
}

export async function getTestimonyMetadata(
    testimonyId: string,
    signal?: AbortSignal,
): Promise<TestimonyMetadata> {
    return fetchJson(
        `/api/testimonies/${encodeURIComponent(testimonyId)}`,
        'Failed to fetch testimony metadata',
        signal,
    );
}

export async function getTestimonyData(
    testimonyId: string,
    signal?: AbortSignal,
): Promise<TestimonyData> {
    return fetchJson(
        `/api/testimonies/${encodeURIComponent(testimonyId)}/data`,
        'Failed to fetch testimony data',
        signal,
    );
}
