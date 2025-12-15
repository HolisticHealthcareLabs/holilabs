/**
 * Lab Reference Ranges API
 * Query available lab tests, LOINC codes, and reference ranges
 *
 * GET /api/lab-reference-ranges - List all lab tests and reference ranges
 * GET /api/lab-reference-ranges?loincCode=718-7 - Get specific test by LOINC code
 * GET /api/lab-reference-ranges?category=Hematology - Get tests by category
 * GET /api/lab-reference-ranges?stats=true - Get database statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import {
  REFERENCE_RANGES,
  getReferenceRange,
  getReferenceRangeByTestName,
  getAllLoincCodes,
  getTestsByCategory,
  getAllCategories,
  isValidLoincCode,
  getTestInfoByLoincCode,
  getDatabaseStats,
} from '@/lib/clinical/lab-reference-ranges';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lab-reference-ranges
 * Query lab reference ranges
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const loincCode = searchParams.get('loincCode');
      const testName = searchParams.get('testName');
      const category = searchParams.get('category');
      const stats = searchParams.get('stats');
      const patientAge = searchParams.get('age');
      const patientGender = searchParams.get('gender');

      // Get database statistics
      if (stats === 'true') {
        return NextResponse.json({
          success: true,
          data: getDatabaseStats(),
        });
      }

      // Get all categories
      if (searchParams.get('categories') === 'true') {
        return NextResponse.json({
          success: true,
          data: {
            categories: getAllCategories(),
          },
        });
      }

      // Get all LOINC codes
      if (searchParams.get('loincCodes') === 'true') {
        return NextResponse.json({
          success: true,
          data: {
            loincCodes: getAllLoincCodes(),
          },
        });
      }

      // Get specific test by LOINC code with patient demographics
      if (loincCode && patientAge && patientGender) {
        const age = parseInt(patientAge);
        const range = getReferenceRange(loincCode, age, patientGender);

        if (!range) {
          return NextResponse.json(
            { error: 'Reference range not found for specified demographics' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: range,
        });
      }

      // Get test info by LOINC code (without demographics)
      if (loincCode) {
        const testInfo = getTestInfoByLoincCode(loincCode);

        if (!testInfo) {
          return NextResponse.json(
            { error: 'Lab test not found with specified LOINC code' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: testInfo,
        });
      }

      // Get test by name with patient demographics
      if (testName && patientAge && patientGender) {
        const age = parseInt(patientAge);
        const range = getReferenceRangeByTestName(testName, age, patientGender);

        if (!range) {
          return NextResponse.json(
            { error: 'Reference range not found for specified demographics' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: range,
        });
      }

      // Get tests by category
      if (category) {
        const tests = getTestsByCategory(category);

        return NextResponse.json({
          success: true,
          data: {
            category,
            count: tests.length,
            tests,
          },
        });
      }

      // Return all reference ranges (paginated)
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const paginatedRanges = REFERENCE_RANGES.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        data: {
          total: REFERENCE_RANGES.length,
          limit,
          offset,
          ranges: paginatedRanges,
        },
      });
    } catch (error: any) {
      console.error('Error fetching lab reference ranges:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lab reference ranges', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
  }
);
