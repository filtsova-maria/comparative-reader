import { useQuery } from '@tanstack/react-query';
import type { ListTestimonyParams, SearchTestimonyParams } from './types';
import {
    countTestimonies,
    getTestimonyData,
    getTestimonyMetadata,
    listLanguages,
    listTestimonyMetadata,
    searchTestimonies,
    searchWithinTestimony,
} from './testimonies';

export interface TestimonyFilters {
    search: string;
    language: string;
    location: string;
}

export interface TestimonyPagination {
    limit: number;
    offset: number;
}

export function useTestimonies(
    filters: TestimonyFilters,
    pagination: TestimonyPagination,
    excludedIds: string[],
) {
    const { search, language, location } = filters;
    return useQuery({
        queryKey: [
            'testimonies',
            filters,
            search ? 'search' : { ...pagination, excludedIds },
        ] as const,
        queryFn: ({ signal }) =>
            search
                ? searchTestimonies(
                      {
                          search,
                          language: language || undefined,
                          location: location || undefined,
                      } satisfies SearchTestimonyParams,
                      signal,
                  )
                : listTestimonyMetadata(
                      {
                          language: language || undefined,
                          location: location || undefined,
                          excluded_ids: excludedIds,
                          limit: pagination.limit,
                          offset: pagination.offset,
                      } satisfies ListTestimonyParams,
                      signal,
                  ),
    });
}

export function useTestimonyCount(
    filters: TestimonyFilters,
    excludedIds: string[],
) {
    return useQuery({
        queryKey: [
            'testimony-count',
            filters.language,
            filters.location,
            excludedIds,
        ] as const,
        queryFn: ({ signal }) =>
            countTestimonies(
                {
                    language: filters.language || undefined,
                    location: filters.location || undefined,
                    excluded_ids: excludedIds,
                },
                signal,
            ),
        enabled: !filters.search,
    });
}

export function useTestimonyLanguages() {
    return useQuery({
        queryKey: ['testimony-languages'] as const,
        queryFn: ({ signal }) => listLanguages(signal),
    });
}

export function useTestimonyData(id: string) {
    return useQuery({
        queryKey: ['testimony-data', id] as const,
        queryFn: ({ signal }) => getTestimonyData(id, signal),
        enabled: Boolean(id),
    });
}

export function useTestimonyMetadata(id: string) {
    return useQuery({
        queryKey: ['testimony-metadata', id] as const,
        queryFn: ({ signal }) => getTestimonyMetadata(id, signal),
        enabled: Boolean(id),
    });
}

export function useTestimonySearch(id: string, search: string) {
    return useQuery({
        queryKey: ['testimony-search', id, search] as const,
        queryFn: ({ signal }) => searchWithinTestimony(id, search, signal),
        enabled: Boolean(id && search),
    });
}
