import { DocumentPane } from '../components/DocumentPane';
import {
    ReaderUrlStateProvider,
    useReaderUrlState,
} from '../hooks/useReaderUrlState';

// TODO: add toast notification

const ReaderContent = () => {
    const {
        state: { target },
    } = useReaderUrlState();

    return (
        <div className="mx-auto max-w-screen-2xl px-4 py-6">
            <div
                className={
                    target.id
                        ? 'grid gap-6 lg:grid-cols-2'
                        : 'mx-auto grid w-full max-w-screen-md grid-cols-1'
                }
            >
                <DocumentPane role="source" />
                {target.id && <DocumentPane role="target" />}
            </div>
        </div>
    );
};

export const ReaderView = () => (
    <ReaderUrlStateProvider>
        <ReaderContent />
    </ReaderUrlStateProvider>
);
