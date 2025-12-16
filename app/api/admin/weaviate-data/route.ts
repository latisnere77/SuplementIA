import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/verification';

const WEAVIATE_HOST = '98.93.21.159:8080'; // process.env.WEAVIATE_HOST override

export async function GET(request: NextRequest) {
    // 1. Verificar Seguridad (Solo admins pueden ver esto)
    const authResult = await verifyToken(request);
    if (!authResult.valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. Obtener Conteo Total de Objetos
        const countQuery = JSON.stringify({
            query: `{ Aggregate { SupplementPaper { meta { count } } } }`
        });

        const countResponse = await fetch(`http://${WEAVIATE_HOST}/v1/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: countQuery
        });

        const countData = await countResponse.json();
        const totalCount = countData.data?.Aggregate?.SupplementPaper?.[0]?.meta?.count || 0;

        // 3. Obtener los últimos 10 objetos
        const listQuery = JSON.stringify({
            query: `{ 
                Get { 
                    SupplementPaper(limit: 10) { 
                        title 
                        ingredients 
                        year
                    } 
                } 
            }`
        });

        const listResponse = await fetch(`http://${WEAVIATE_HOST}/v1/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: listQuery
        });

        const listData = await listResponse.json();
        const items = listData.data?.Get?.SupplementPaper || [];

        return NextResponse.json({
            success: true,
            stats: {
                totalObjects: totalCount
            },
            items: items
        });

    } catch (error: any) {
        console.error('Error fetching weaviate data:', error);
        return NextResponse.json({
            error: 'Failed to fetch data',
            details: error.message,
            isConnected: false
        }, { status: 500 }); // Return 500 but frontend handles it gracefully
    }
}
