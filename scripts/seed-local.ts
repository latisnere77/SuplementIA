
const WEAVIATE_HOST = process.env.WEAVIATE_HOST || '98.93.21.159:8080';

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
    },
    {
        name: 'Cúrcuma',
        data: {
            title: "Efectos antiinflamatorios de la curcumina en enfermedades crónicas",
            abstract: "La curcumina, el principal curcuminoide de la cúrcuma, ha demostrado potentes propiedades antiinflamatorias y antioxidantes, siendo útil en el manejo de la artritis y el síndrome metabólico.",
            ingredients: "Cúrcuma, Curcumina, Pimienta Negra, Piperina",
            conditions: "Inflamación, Artritis, Salud articular, Digestión",
            year: 2023
        }
    },
    {
        name: 'Omega-3',
        data: {
            title: "Ácidos grasos Omega-3 y salud cardiovascular: evidencia actual",
            abstract: "Los ácidos grasos EPA y DHA derivados del aceite de pescado contribuyen a la reducción de triglicéridos y la presión arterial, mejorando la salud cardiovascular general.",
            ingredients: "Omega-3, Aceite de Pescado, EPA, DHA",
            conditions: "Salud cardiovascular, Triglicéridos altos, Salud cerebral",
            year: 2022
        }
    }
];

async function seed() {
    console.log(`🚀 Iniciando Seeding a ${WEAVIATE_HOST}...`);
    console.log(`📦 Preparando ${supplements.length} suplementos para insertar.`);

    let successCount = 0;
    let errorCount = 0;

    for (const [index, item] of supplements.entries()) {
        console.log(`\n[${index + 1}/${supplements.length}] Procesando: ${item.name}...`);

        try {
            // Usamos fetch con un AbortController para manejar timeouts largos si es necesario
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000); // 60 segundos por item!

            const response = await fetch(`http://${WEAVIATE_HOST}/v1/objects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class: "SupplementPaper",
                    properties: item.data
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Weaviate Error ${response.status}: ${text}`);
            }

            const json = await response.json();
            console.log(`✅ ÉXITO: ${item.name} insertado correctamente. ID: ${json.id}`);
            successCount++;

        } catch (error: any) {
            console.error(`❌ ERROR: Falló inserción de ${item.name}.`);
            if (error.name === 'AbortError') {
                console.error('   Causa: Timeout (Weaviate tardó mas de 60s en responder)');
            } else {
                console.error(`   Causa: ${error.message}`);
            }
            errorCount++;
        }
    }

    console.log('\n-----------------------------------');
    console.log('🏁 Seeding Finalizado');
    console.log(`✅ Insertados: ${successCount}`);
    console.log(`❌ Fallidos:   ${errorCount}`);
    console.log('-----------------------------------');
}

seed();
