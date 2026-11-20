import { useLocation } from 'react-router';
import { DocumentPane } from './DocumentPane';
import { useReaderUrlState } from '../hooks/useReaderUrlState';

// TODO: add toast notification

export const ReaderView = () => {
    const {
        sourceId,
        targetId,
        sourceAnchor,
        targetAnchor,
        updateSourceAnchor,
        updateTargetAnchor,
    } = useReaderUrlState();
    const location = useLocation();

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
                    idPrefix="source"
                    role="source"
                    browsePath="/pick/source"
                    browseSearch={location.search}
                    browseLabel="Change source document"
                    secondaryBrowsePath={targetId ? undefined : '/pick/target'}
                    secondaryBrowseLabel={
                        targetId ? undefined : 'Choose target document'
                    }
                    onAnchorChange={updateSourceAnchor}
                />
                {targetId && (
                    <DocumentPane
                        docId={targetId}
                        anchor={targetAnchor}
                        idPrefix="target"
                        role="target"
                        browsePath="/pick/target"
                        browseSearch={location.search}
                        browseLabel="Change target document"
                        onAnchorChange={updateTargetAnchor}
                    />
                )}
            </div>
        </div>
    );
};
