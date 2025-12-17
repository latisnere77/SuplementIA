import { searchSupplements } from '../lib/search-service';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    try {
        console.log("Testing searchSupplements('Jiaogulan')...");
        const results = await searchSupplements('Jiaogulan');
        console.log("Results:", JSON.stringify(results, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

test();
