export type BrowseMode = 'source' | 'target'

interface BrowseViewProps {
    mode: BrowseMode
    onDocumentSelect: (docId: string) => void
}

export const BrowseView = ({ mode }: BrowseViewProps) => {
    return (
        <div className="browse-view">
            <h1>Pick a {mode} document</h1>
        </div>
    )
}
