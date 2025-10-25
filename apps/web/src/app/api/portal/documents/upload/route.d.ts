/**
 * Document Upload API
 * Handles file uploads with validation, hash generation, and storage
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: {
        document: {
            id: any;
            fileName: any;
            fileType: any;
            fileSize: any;
            documentType: any;
            documentHash: any;
            createdAt: any;
        };
    };
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map