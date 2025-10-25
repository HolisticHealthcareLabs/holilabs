import { NextResponse } from 'next/server';
export declare function POST(request: Request): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map