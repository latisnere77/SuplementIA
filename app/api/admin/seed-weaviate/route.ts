import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/verification';

// In-memory progress tracking (in production, use Redis or DB)
let seedingProgress = {
    isRunning: false,
    currentMineral: '',
    completed: 0,
    total: 4,
    history: [] as Array<{
        timestamp: string;
        mineral: string;
        status: 'success' | 'error';
        count?: number;
    }>
};

export async function POST(request: NextRequest) {
    const authResult = await verifyToken(request);

    if (!authResult.valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { action } = await request.json();

        if (action === 'start') {
            if (seedingProgress.isRunning) {
                return NextResponse.json({
                    error: 'Seeding already in progress'
                }, { status: 409 });
            }

            // Start seeding in background
            seedingProgress.isRunning = true;
            seedingProgress.completed = 0;

            // Execute seeding asynchronously
            runSeeding().catch(console.error);

            return NextResponse.json({
                success: true,
                message: 'Seeding started'
            });
        }

        if (action === 'status') {
            return NextResponse.json({
                success: true,
                progress: seedingProgress
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Seeding error:', error);
        return NextResponse.json({
            error: 'Failed to execute command',
            details: error.message
        }, { status: 500 });
    }
}

async function runSeeding() {
    const minerals = ['Copper', 'Potassium', 'Manganese', 'Iodine'];

    for (const mineral of minerals) {
        seedingProgress.currentMineral = mineral;

        try {
            // Simulate seeding (in production, call actual seeding logic)
            await new Promise(resolve => setTimeout(resolve, 2000));

            seedingProgress.history.unshift({
                timestamp: new Date().toISOString(),
                mineral,
                status: 'success',
                count: 10
            });

            seedingProgress.completed++;
        } catch (error) {
            seedingProgress.history.unshift({
                timestamp: new Date().toISOString(),
                mineral,
                status: 'error'
            });
        }
    }

    seedingProgress.isRunning = false;
    seedingProgress.currentMineral = '';

    // Keep only last 20 entries
    if (seedingProgress.history.length > 20) {
        seedingProgress.history = seedingProgress.history.slice(0, 20);
    }
}
