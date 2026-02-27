/**
 * RBAC Middleware Tests
 * Focuses on role validation and authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '../middleware';

const mockNext = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

describe('Middleware RBAC (requireRole)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should reject request if user is not authenticated (401 response)', async () => {
        const req = new NextRequest('http://localhost/api/admin-only');
        const context: any = {}; // Missing user object

        const middleware = requireRole('ADMIN');
        const response = await middleware(req, context, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(response.status).toBe(401);

        const body = await response.json();
        expect(body.error).toBe('Authentication required');
    });

    it('should reject request if user role is not in allowed list (403 response)', async () => {
        const req = new NextRequest('http://localhost/api/admin-only');
        const context: any = {
            user: { id: 'usr-1', role: 'CLINICIAN' }
        };

        const middleware = requireRole('ADMIN', 'PHYSICIAN');
        const response = await middleware(req, context, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(response.status).toBe(403);

        const body = await response.json();
        expect(body.error).toBe('Insufficient permissions');
        expect(body.required).toEqual(['ADMIN', 'PHYSICIAN']);
        expect(body.current).toBe('CLINICIAN');
    });

    it('should accept request if user role matches single required role', async () => {
        const req = new NextRequest('http://localhost/api/admin-only');
        const context: any = {
            user: { id: 'usr-1', role: 'ADMIN' }
        };

        const middleware = requireRole('ADMIN');
        await middleware(req, context, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    it('should accept request if user role matches one of multiple required roles', async () => {
        const req = new NextRequest('http://localhost/api/staff-only');
        const context: any = {
            user: { id: 'usr-1', role: 'NURSE' }
        };

        const middleware = requireRole('ADMIN', 'PHYSICIAN', 'NURSE');
        await middleware(req, context, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

});
