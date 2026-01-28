/**
 * Agent Tools Discovery API
 * 
 * GET /api/agent/tools - List all available MCP tools for agents
 * 
 * This endpoint allows agents to discover available tools,
 * their schemas, and required permissions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToolSchemas, getToolsByCategory, searchTools, getAllRegisteredTools } from '@/lib/mcp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/tools
 * 
 * Query parameters:
 * - category: Filter by tool category
 * - q: Search tools by name or description
 * - format: 'full' | 'minimal' (default: 'full')
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const query = searchParams.get('q');
        const format = searchParams.get('format') || 'full';

        let tools;

        if (query) {
            // Search by query
            tools = searchTools(query);
        } else if (category) {
            // Filter by category
            tools = getToolsByCategory(category);
        } else {
            // Get all tools
            tools = getAllRegisteredTools();
        }

        // Format response based on requested format
        const formattedTools = format === 'minimal'
            ? tools.map(t => ({
                name: t.name,
                description: t.description,
                category: t.category,
            }))
            : tools.map(t => ({
                name: t.name,
                description: t.description,
                category: t.category,
                requiredPermissions: t.requiredPermissions,
                deprecated: t.deprecated || false,
            }));

        // Get all available categories
        const allTools = getAllRegisteredTools();
        const categories = [...new Set(allTools.map(t => t.category))];

        return NextResponse.json({
            success: true,
            count: formattedTools.length,
            categories,
            tools: formattedTools,
            meta: {
                version: '1.0.0',
                protocol: 'mcp',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Error fetching tools:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch tools',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/agent/tools
 * 
 * Execute a tool (for testing purposes)
 * In production, tools should be called via the MCP protocol
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tool, input } = body;

        if (!tool) {
            return NextResponse.json(
                { success: false, error: 'Tool name is required' },
                { status: 400 }
            );
        }

        // For now, just validate that the tool exists
        const allTools = getAllRegisteredTools();
        const foundTool = allTools.find(t => t.name === tool);

        if (!foundTool) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Tool '${tool}' not found`,
                    availableTools: allTools.map(t => t.name)
                },
                { status: 404 }
            );
        }

        // Validate input against schema
        const validation = foundTool.inputSchema.safeParse(input || {});

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid input',
                    validationErrors: validation.error.errors,
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Tool validated successfully. Use MCP protocol for execution.',
            tool: {
                name: foundTool.name,
                description: foundTool.description,
                requiredPermissions: foundTool.requiredPermissions,
            },
            validatedInput: validation.data,
        });
    } catch (error) {
        console.error('Error validating tool:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to validate tool' },
            { status: 500 }
        );
    }
}
