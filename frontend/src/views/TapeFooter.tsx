import { formatTimecode } from './documentModel';

interface TapeFooterProps {
    tape: number;
    seconds: number;
    duration: number | undefined;
}

export const TapeFooter = ({ tape, seconds, duration }: TapeFooterProps) => {
    const hasDuration =
        duration !== undefined && Number.isFinite(duration) && duration > 0;
    const currentSeconds = hasDuration
        ? Math.min(Math.max(seconds, 0), duration)
        : 0;
    const progress = hasDuration ? (currentSeconds / duration) * 100 : 0;

    return (
        <footer
            aria-label="Current tape timecode"
            className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-gray-200 bg-white py-2 text-xs font-semibold text-gray-500"
        >
            <span className="shrink-0">Tape {tape}</span>
            {hasDuration && (
                <div
                    role="progressbar"
                    aria-label={`Tape ${tape} progress`}
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={currentSeconds}
                    aria-valuetext={`${formatTimecode(seconds)} of ${formatTimecode(duration)}`}
                    className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"
                >
                    <div
                        className="h-full rounded-full bg-blue-300 transition-[width] duration-200 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
            <span className="shrink-0 pr-2 tabular-nums">
                {formatTimecode(seconds)}/
                {duration === undefined ? '--:--' : formatTimecode(duration)}
            </span>
        </footer>
    );
};
