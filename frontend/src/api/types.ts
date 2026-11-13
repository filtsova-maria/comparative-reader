import type { components, operations } from './schema';

export type ListTestimonyParams =
    operations['list_testimonies_api_testimonies_get']['parameters']['query'];
export type TestimonySummary = components['schemas']['TestimonySummary'];
export type TestimonyData = components['schemas']['TestimonyData'];
export type TestimonySentence = components['schemas']['Sentence'];
export type TestimonyKeyword = components['schemas']['Keyword'];
export type TestimonyMetadata =
    operations['get_testimony_metadata_api_testimonies__testimony_id__get']['responses']['200']['content']['application/json'];
