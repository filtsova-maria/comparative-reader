import type { TestimonySearchResult, TestimonySummary } from '../api/types';
import personImage from '../assets/person.png';

interface TestimonyCardProps {
    testimony: TestimonySummary | TestimonySearchResult;
    onSelect: (docId: string) => void;
}

export const TestimonyCard = ({ testimony, onSelect }: TestimonyCardProps) => (
    <li className="h-full">
        <button
            type="button"
            className="flex h-full min-h-[11rem] max-h-[15rem] w-full flex-row items-start gap-4 overflow-hidden rounded-lg border border-gray-300 bg-white p-4 text-left text-inherit hover:border-gray-600 hover:bg-gray-50 focus-visible:border-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            onClick={() => onSelect(testimony.id)}
        >
            <img
                src={testimony.thumbnail_url || personImage}
                alt={testimony.name}
                className="block h-24 w-24 shrink-0 aspect-square rounded object-cover"
            />
            <div className="flex flex-col gap-1 text-left">
                <span className="text-lg font-semibold">{testimony.name}</span>
                <span>
                    {testimony.language}
                    {testimony.experience ? ` · ${testimony.experience}` : ''}
                </span>
                {testimony.location && <span>{testimony.location}</span>}
                {testimony.interview_date && (
                    <span>
                        Interviewed{' '}
                        {new Date(
                            testimony.interview_date,
                        ).toLocaleDateString()}
                    </span>
                )}
                {testimony.duration && (
                    <span>Duration: {testimony.duration}</span>
                )}
            </div>
        </button>
    </li>
);
