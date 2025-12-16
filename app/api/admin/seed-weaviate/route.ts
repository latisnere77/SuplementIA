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

const WEAVIATE_HOST = '54.160.143.30:8080'; // IP Pública de SPOT

async function runSeeding() {
    const supplements = [
        {
            name: 'Baya Goji',
            data: {
                title: "Efectos antioxidantes de la Baya Goji (Lycium barbarum) en la salud humana",
                abstract: "Revision sistematica sobre los polisacaridos de la Baya Goji (Lycium barbarum) y sus efectos protectores contra el estres oxidativo, promoviendo la salud ocular y el sistema inmunologico. Estudios clinicos demuestran mejoras en marcadores de inflamacion.",
                ingredients: "Baya Goji, Lycium barbarum, Polisacaridos, Zeaxantina",
                conditions: "Estres oxidativo, Salud ocular, Inmunidad, Anti-envejecimiento",
                year: 2024
            }
        },
        {
            name: 'Ashwagandha',
            data: {
                title: "Eficacia de Ashwagandha en la reducción del estrés y ansiedad: un estudio doble ciego",
                abstract: "El extracto de raíz de Ashwagandha (Withania somnifera) mostró una reducción significativa en los niveles de cortisol sérico y puntajes de escalas de estrés en comparación con el placebo.",
                ingredients: "Ashwagandha, Withania somnifera, Withanólidos",
                conditions: "Estrés, Ansiedad, Calidad del sueño, Fatiga adrenal",
                year: 2023
            }
        },
        {
            name: 'Magnesio',
            data: {
                title: "El rol del Magnesio en la función neurológica y el sueño",
                abstract: "La suplementación con glicinato de magnesio mejora la latencia del sueño y reduce los calambres musculares nocturnos en adultos mayores.",
                ingredients: "Magnesio, Glicinato de Magnesio",
                conditions: "Insomnio, Calambres musculares, Migraña, Ansiedad",
                year: 2023
            }
        }
    ];

    seedingProgress.total = supplements.length;

    for (const item of supplements) {
        seedingProgress.currentMineral = item.name; // Usamos el campo existente para mostrar el nombre

        try {
            // Real Weaviate Insertion
            const response = await fetch(`http://${WEAVIATE_HOST}/v1/objects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class: "SupplementPaper",
                    properties: item.data
                })
            });

            if (!response.ok) {
                throw new Error(`Weaviate responded with ${response.status}`);
            }

            seedingProgress.history.unshift({
                timestamp: new Date().toISOString(),
                mineral: item.name,
                status: 'success',
                count: 1
            });

            seedingProgress.completed++;
        } catch (error) {
            console.error(`Error seeding ${item.name}:`, error);
            seedingProgress.history.unshift({
                timestamp: new Date().toISOString(),
                mineral: item.name,
                status: 'error'
            });
        }
    }

    seedingProgress.isRunning = false;
    seedingProgress.currentMineral = '';
}
