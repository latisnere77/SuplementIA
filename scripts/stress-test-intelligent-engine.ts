/**
 * Stress Test del Motor Inteligente de Búsqueda
 * Prueba suplementos NO mapeados para validar el sistema de fallback
 */

import { normalizeQuery } from '../lib/portal/query-normalization';
import { getSupplementMappingWithSuggestions } from '../lib/portal/supplement-mappings';
import { suggestSupplementCorrection } from '../lib/portal/supplement-suggestions';
import { searchAnalytics, logSearch } from '../lib/portal/search-analytics';

const testSupplements = [
  { name: 'Rutina', type: 'Flavonoide', variants: ['Rutin', 'Rutina', 'Rutoside'] },
  { name: 'Quercetina', type: 'Flavonoide', variants: ['Quercetin', 'Quercetina'] },
  { name: 'Fisetina', type: 'Flavonoide', variants: ['Fisetin', 'Fisetina'] },
  { name: 'Apigenina', type: 'Flavonoide', variants: ['Apigenin', 'Apigenina'] },
  { name: 'Piperina', type: 'Extracto', variants: ['Piperine', 'Piperina', 'BioPerine'] },
  { name: 'Bromelina', type: 'Enzima', variants: ['Bromelain', 'Bromelina'] },
  { name: 'Papaína', type: 'Enzima', variants: ['Papain', 'Papaína'] },
  { name: 'Serrapeptasa', type: 'Enzima', variants: ['Serrapeptase', 'Serrapeptasa'] },
  { name: 'Nattokinasa', type: 'Enzima', variants: ['Nattokinase', 'Nattokinasa'] },
  { name: 'Digezyme', type: 'Complejo', variants: ['Digezyme', 'DigeZyme'] },
];

let totalTests = 0;
let passedTests = 0;

console.log('='.repeat(100));
console.log('🔥 STRESS TEST DEL MOTOR INTELIGENTE');
console.log('='.repeat(100));
console.log('\n⚠️  Probando suplementos NO mapeados - Sistema de fallback\n');

for (const supplement of testSupplements) {
  console.log(`\n${'─'.repeat(100)}`);
  console.log(`🧪 ${supplement.name} (${supplement.type})`);
  console.log('─'.repeat(100));

  for (const variant of supplement.variants) {
    totalTests++;
    console.log(`\n   Variante: "${variant}"`);

    // Normalizar
    const normalized = normalizeQuery(variant);
    console.log(`   ✓ Normalizado: "${normalized.normalized}" (conf: ${normalized.confidence})`);

    // Obtener mapping
    const result = getSupplementMappingWithSuggestions(normalized.normalized);

    if (result.mapping) {
      console.log(`   ✓ Mapping: ${result.mapping.normalizedName}`);
      console.log(`   ✓ Categoría: ${result.mapping.category}`);
      console.log(`   ✓ Fallback: ${result.usedFallback ? 'SÍ' : 'NO'}`);
      console.log(`   ✓ Query: "${result.mapping.pubmedQuery.substring(0, 60)}..."`);

      // Sugerencias
      const suggestions = suggestSupplementCorrection(variant);
      if (suggestions.suggestions.length > 0) {
        console.log(`   ✓ Sugerencias: ${suggestions.suggestions.slice(0, 2).map(s => s.name).join(', ')}`);
      }

      // Analytics
      logSearch(variant, normalized.normalized, !result.usedFallback, result.usedFallback, []);

      passedTests++;
      console.log('   ✅ PASADO');
    } else {
      console.log('   ❌ FALLIDO - No se generó mapping');
    }
  }
}

// Resumen
console.log('\n\n' + '='.repeat(100));
console.log('📊 RESUMEN');
console.log('='.repeat(100));
console.log(`\nTotal: ${totalTests}`);
console.log(`Exitosos: ${passedTests}`);
console.log(`Fallidos: ${totalTests - passedTests}`);
console.log(`Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

const stats = searchAnalytics.getStatistics();
console.log('📈 ANALYTICS:');
console.log(`   Búsquedas: ${stats.total}`);
console.log(`   Exitosas: ${stats.successful} (${stats.successRate.toFixed(1)}%)`);
console.log(`   Fallback: ${stats.usedFallback} (${stats.fallbackRate.toFixed(1)}%)\n`);

if (passedTests === totalTests) {
  console.log('✅ TODOS LOS TESTS PASARON - MOTOR AL 100%');
} else {
  console.log('⚠️  ALGUNOS TESTS FALLARON');
}

console.log('='.repeat(100) + '\n');

process.exit(passedTests === totalTests ? 0 : 1);
