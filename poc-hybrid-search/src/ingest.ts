import { client } from './client';
import { createSchema, CLASS_NAME } from './schema';

const SAMPLE_PAPERS = [
    {
        title: "Efficacy of Panax Ginseng in fatigue and physical performance",
        abstract: "A double-blind study showing significant improvement in chronic fatigue symptoms in patients treated with 200mg of Panax Ginseng extract daily.",
        ingredients: ["Panax Ginseng"],
        conditions: ["Fatigue", "Physical Performance"],
        year: 2021
    },
    {
        title: "Neuroprotective effects of Lion's Mane Mushroom",
        abstract: "Hericium erinaceus (Lion's Mane) promotes nerve growth factor (NGF) synthesis. This study confirms its potential for treating cognitive decline and memory loss.",
        ingredients: ["Hericium erinaceus", "Lion's Mane"],
        conditions: ["Memory", "Cognitive Decline"],
        year: 2023
    },
    {
        title: "Curcumin and joint inflammation: A review",
        abstract: "Curcumin, the active compound in Turmeric, reduces markers of inflammation in osteoarthritis patients effectively.",
        ingredients: ["Curcumin", "Turmeric"],
        conditions: ["Inflammation", "Osteoarthritis", "Joint Pain"],
        year: 2022
    },
    {
        title: "Iron supplementation for anemia",
        abstract: "Daily iron intake restores hemoglobin levels in patients with iron-deficiency anemia.",
        ingredients: ["Iron"],
        conditions: ["Anemia"],
        year: 2020
    }
];

export async function ingest() {
    console.log("🚀 Starting Ingestion...");
    await createSchema();

    console.log("📥 Indexing papers...");
    const batcher = client.batch.objectsBatcher();

    for (const paper of SAMPLE_PAPERS) {
        const obj = {
            class: CLASS_NAME,
            properties: paper,
        };
        batcher.withObject(obj);
    }

    const result = await batcher.do();
    console.log(`✅ Indexed ${result.length} papers successfully.`);
}

// Only run if called directly
if (require.main === module) {
    ingest().catch(console.error);
}
