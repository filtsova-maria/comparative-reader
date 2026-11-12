export interface SourceDoc {
    /**
     * Testimony id.
     */
    docId: string;
    /**
     *  Human-readable name of the document.
     */
    label: string;
    /**
     * Where the user is in the document. This is used to restore the user's position when they return to the document.
     */
    anchor: number;
    /**
     * Hash of the selected document text. Used for caching.
     */
    textHash: string | null;
}

export interface SourceSelection {
    docId: string;
    textHash: string | null;
    range: CharRange;
    preview: string;
}

export interface CharRange {
    start: number;
    end: number;
}

export interface TargetTab {
    docId: string;
    label: string;
    anchor: number;
}

export interface UrlPatch {
    source?: { docId: string; anchor: number };
    selection?: { docId: string; range: CharRange };
    target?: { docId: string; anchor: number };
}

/**
 * Right panel reader state. `empty` if no document selected, `suggestions` if a source excerpt is selected, `target` if a target document is selected.
 */
type RightPaneMode = 'empty' | 'suggestions' | 'target';

export type WorkspaceData = {
    source: SourceDoc | null;
    selection: SourceSelection | null;
    tabs: TargetTab[];
    activeTabDocId: string | null;
    rightPane: RightPaneMode;
};
