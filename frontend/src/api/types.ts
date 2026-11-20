import type { components, operations } from './schema';

export type ListTestimonyParams =
    operations['list_testimony_summaries_api_testimonies_get']['parameters']['query'];
export type SearchTestimonyParams =
    operations['search_testimonies_api_search_testimonies_get']['parameters']['query'];
export type TestimonySearchResult =
    components['schemas']['TestimonySearchResult'];
export type TestimonySummary = Omit<
    TestimonySearchResult,
    'name_match' | 'transcript_hits' | 'snippets'
>;
export type TestimonySearchResponse =
    components['schemas']['DocSearchResponse'];
export type Range = components['schemas']['Range'];
export type TestimonyData = components['schemas']['TestimonyData'];
export type TestimonySentence = components['schemas']['Sentence'];
export type TestimonyKeyword = components['schemas']['Keyword'];
export type TestimonyMetadata =
    operations['get_testimony_metadata_api_testimonies__testimony_id__get']['responses']['200']['content']['application/json'];
