/**
 * Full-Text Search Utility
 *
 * Powerful search across all healthcare data
 * Simple, fast, intelligent results
 */
export interface SearchResult {
    id: string;
    type: 'patient' | 'appointment' | 'document' | 'note' | 'medication' | 'message';
    title: string;
    description: string;
    date?: Date;
    url: string;
    metadata?: Record<string, any>;
}
export interface SearchOptions {
    userId: string;
    userType: 'clinician' | 'patient';
    query: string;
    limit?: number;
    types?: SearchResult['type'][];
}
/**
 * Search across all data types
 */
export declare function search(options: SearchOptions): Promise<SearchResult[]>;
/**
 * Quick search for patients (clinicians only)
 */
export declare function searchPatients(clinicianId: string, query: string): Promise<any>;
/**
 * Get recent searches (for autocomplete/suggestions)
 */
export declare function getRecentSearches(userId: string, userType: 'clinician' | 'patient'): Promise<never[]>;
/**
 * Save search query (for analytics and suggestions)
 */
export declare function saveSearchQuery(userId: string, userType: 'clinician' | 'patient', query: string, resultsCount: number): Promise<void>;
//# sourceMappingURL=search.d.ts.map