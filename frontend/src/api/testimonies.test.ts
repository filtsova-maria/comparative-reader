import { afterEach, describe, expect, it, vi } from 'vitest';
import { countTestimonies, listTestimonyMetadata } from './testimonies';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('listTestimonyMetadata', () => {
    it('sends pagination and excluded IDs to the list endpoint', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(new Response('[]', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        await listTestimonyMetadata({
            limit: 25,
            offset: 24,
            excluded_ids: ['1', '2'],
        });

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/testimonies?limit=25&offset=24&excluded_ids=1&excluded_ids=2',
            { signal: undefined },
        );
    });
});

describe('countTestimonies', () => {
    it('fetches the filtered total count', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(new Response('42', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            countTestimonies({
                language: 'English',
                excluded_ids: ['1'],
            }),
        ).resolves.toBe(42);

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/testimonies/count?language=English&excluded_ids=1',
            { signal: undefined },
        );
    });
});
