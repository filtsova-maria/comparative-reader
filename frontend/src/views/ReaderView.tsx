import { DocumentPane } from './DocumentPane';
import { useReaderUrlState } from '../hooks/useReaderUrlState';

// TODO: add toast notification

export const ReaderView = () => {
    const {
        sourceId,
        targetId,
        sourceAnchor,
        targetAnchor,
        sourceSearch,
        targetSearch,
        updateSourceAnchor,
        updateTargetAnchor,
        updateSourceSearch,
        updateTargetSearch,
    } = useReaderUrlState();

    return (
        <div className="mx-auto max-w-screen-2xl px-4 py-6">
            <div
                className={
                    targetId
                        ? 'grid gap-6 lg:grid-cols-2'
                        : 'mx-auto grid w-full max-w-screen-md grid-cols-1'
                }
            >
                <DocumentPane
                    docId={sourceId}
                    anchor={sourceAnchor}
                    role="source"
                    search={sourceSearch}
                    onSearchChange={updateSourceSearch}
                    onAnchorChange={updateSourceAnchor}
                    showTargetPicker={!targetId}
                />
                {targetId && (
                    <DocumentPane
                        docId={targetId}
                        anchor={targetAnchor}
                        role="target"
                        search={targetSearch}
                        onSearchChange={updateTargetSearch}
                        onAnchorChange={updateTargetAnchor}
                    />
                )}
            </div>
        </div>
    );
};
