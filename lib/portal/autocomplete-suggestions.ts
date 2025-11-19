/**
 * Autocomplete Suggestions Database
 * Sugerencias multiidioma para el sistema de autocomplete del portal
 *
 * Sincronizado con:
 * - components/portal/HealthSearchForm.tsx (HEALTH_CATEGORIES)
 * - lib/i18n/translations.ts
 */

export interface AutocompleteSuggestion {
  text: string;
  type: 'category' | 'popular' | 'keyword';
  score: number;
}

export type Language = 'en' | 'es';

interface SuggestionsData {
  categories: string[];
  popularSearches: string[];
  keywords: Record<string, string[]>;
}

export const AUTOCOMPLETE_SUGGESTIONS: Record<Language, SuggestionsData> = {
  en: {
    // Categorías principales (sincronizadas con HEALTH_CATEGORIES)
    categories: [
      'Muscle Gain & Exercise',
      'Memory & Focus',
      'Sleep',
      'Immune System',
      'Heart Health',
      'Fat Loss',
    ],

    // Búsquedas populares (top 10)
    popularSearches: [
      'How to build muscle',
      'Improve sleep quality',
      'Boost cognitive function',
      'Support immune system',
      'Increase energy levels',
      'Reduce inflammation',
      'Better focus and concentration',
      'Enhance athletic performance',
      'Improve recovery after exercise',
      'Support joint health',
    ],

    // Keywords y términos relacionados para matching inteligente
    keywords: {
      // Muscle/Exercise related
      'muscle': ['Muscle Gain & Exercise', 'How to build muscle', 'Enhance athletic performance'],
      'strength': ['Muscle Gain & Exercise', 'How to build muscle'],
      'exercise': ['Muscle Gain & Exercise', 'Enhance athletic performance', 'Improve recovery after exercise'],
      'workout': ['Muscle Gain & Exercise', 'Enhance athletic performance'],
      'athletic': ['Muscle Gain & Exercise', 'Enhance athletic performance'],
      'performance': ['Enhance athletic performance', 'Boost cognitive function'],
      'recovery': ['Improve recovery after exercise', 'Muscle Gain & Exercise'],

      // Cognitive/Brain related
      'brain': ['Memory & Focus', 'Boost cognitive function'],
      'memory': ['Memory & Focus', 'Boost cognitive function'],
      'focus': ['Memory & Focus', 'Better focus and concentration'],
      'concentration': ['Better focus and concentration', 'Memory & Focus'],
      'cognitive': ['Boost cognitive function', 'Memory & Focus'],
      'mental': ['Memory & Focus', 'Boost cognitive function'],

      // Sleep related
      'sleep': ['Sleep', 'Improve sleep quality'],
      'insomnia': ['Sleep', 'Improve sleep quality'],
      'rest': ['Sleep', 'Improve sleep quality'],

      // Immune related
      'immune': ['Immune System', 'Support immune system'],
      'immunity': ['Immune System', 'Support immune system'],
      'defense': ['Immune System', 'Support immune system'],

      // Heart related
      'heart': ['Heart Health'],
      'cardiovascular': ['Heart Health'],
      'cardio': ['Heart Health'],

      // Weight/Fat loss related
      'weight': ['Fat Loss'],
      'fat': ['Fat Loss'],
      'loss': ['Fat Loss'],
      'slim': ['Fat Loss'],

      // General health
      'energy': ['Increase energy levels'],
      'inflammation': ['Reduce inflammation'],
      'joint': ['Support joint health'],
      'pain': ['Reduce inflammation', 'Support joint health'],
    },
  },

  es: {
    // Categorías principales (sincronizadas con HEALTH_CATEGORIES)
    categories: [
      'Ganancia de Músculo y Ejercicio',
      'Memoria y Concentración',
      'Sueño',
      'Sistema Inmunológico',
      'Salud Cardíaca',
      'Pérdida de Grasa',
    ],

    // Búsquedas populares (top 10)
    popularSearches: [
      'Cómo ganar músculo',
      'Mejorar calidad del sueño',
      'Aumentar función cognitiva',
      'Apoyar sistema inmunológico',
      'Aumentar niveles de energía',
      'Reducir inflamación',
      'Mejor concentración y enfoque',
      'Mejorar rendimiento atlético',
      'Mejorar recuperación después del ejercicio',
      'Apoyar salud de las articulaciones',
    ],

    // Keywords y términos relacionados para matching inteligente
    keywords: {
      // Muscle/Exercise related
      'musculo': ['Ganancia de Músculo y Ejercicio', 'Cómo ganar músculo', 'Mejorar rendimiento atlético'],
      'músculo': ['Ganancia de Músculo y Ejercicio', 'Cómo ganar músculo', 'Mejorar rendimiento atlético'],
      'fuerza': ['Ganancia de Músculo y Ejercicio', 'Cómo ganar músculo'],
      'ejercicio': ['Ganancia de Músculo y Ejercicio', 'Mejorar rendimiento atlético', 'Mejorar recuperación después del ejercicio'],
      'entrenamiento': ['Ganancia de Músculo y Ejercicio', 'Mejorar rendimiento atlético'],
      'atlético': ['Ganancia de Músculo y Ejercicio', 'Mejorar rendimiento atlético'],
      'atletico': ['Ganancia de Músculo y Ejercicio', 'Mejorar rendimiento atlético'],
      'rendimiento': ['Mejorar rendimiento atlético', 'Aumentar función cognitiva'],
      'recuperación': ['Mejorar recuperación después del ejercicio', 'Ganancia de Músculo y Ejercicio'],
      'recuperacion': ['Mejorar recuperación después del ejercicio', 'Ganancia de Músculo y Ejercicio'],

      // Cognitive/Brain related
      'cerebro': ['Memoria y Concentración', 'Aumentar función cognitiva'],
      'memoria': ['Memoria y Concentración', 'Aumentar función cognitiva'],
      'concentración': ['Memoria y Concentración', 'Mejor concentración y enfoque'],
      'concentracion': ['Memoria y Concentración', 'Mejor concentración y enfoque'],
      'enfoque': ['Mejor concentración y enfoque', 'Memoria y Concentración'],
      'cognitiva': ['Aumentar función cognitiva', 'Memoria y Concentración'],
      'cognitivo': ['Aumentar función cognitiva', 'Memoria y Concentración'],
      'mental': ['Memoria y Concentración', 'Aumentar función cognitiva'],

      // Sleep related
      'sueño': ['Sueño', 'Mejorar calidad del sueño'],
      'sueNo': ['Sueño', 'Mejorar calidad del sueño'],
      'dormir': ['Sueño', 'Mejorar calidad del sueño'],
      'insomnio': ['Sueño', 'Mejorar calidad del sueño'],
      'descanso': ['Sueño', 'Mejorar calidad del sueño'],

      // Immune related
      'inmune': ['Sistema Inmunológico', 'Apoyar sistema inmunológico'],
      'inmunológico': ['Sistema Inmunológico', 'Apoyar sistema inmunológico'],
      'inmunologico': ['Sistema Inmunológico', 'Apoyar sistema inmunológico'],
      'inmunidad': ['Sistema Inmunológico', 'Apoyar sistema inmunológico'],
      'defensas': ['Sistema Inmunológico', 'Apoyar sistema inmunológico'],

      // Heart related
      'corazón': ['Salud Cardíaca'],
      'corazon': ['Salud Cardíaca'],
      'cardiovascular': ['Salud Cardíaca'],
      'cardíaco': ['Salud Cardíaca'],
      'cardiaco': ['Salud Cardíaca'],

      // Weight/Fat loss related
      'peso': ['Pérdida de Grasa'],
      'grasa': ['Pérdida de Grasa'],
      'adelgazar': ['Pérdida de Grasa'],
      'bajar': ['Pérdida de Grasa'],

      // General health
      'energía': ['Aumentar niveles de energía'],
      'energia': ['Aumentar niveles de energía'],
      'inflamación': ['Reducir inflamación'],
      'inflamacion': ['Reducir inflamación'],
      'articulaciones': ['Apoyar salud de las articulaciones'],
      'dolor': ['Reducir inflamación', 'Apoyar salud de las articulaciones'],
    },
  },
};

/**
 * Obtiene sugerencias filtradas y ordenadas por relevancia
 *
 * @param query - Texto de búsqueda del usuario
 * @param lang - Idioma de las sugerencias
 * @param limit - Número máximo de sugerencias a retornar
 * @returns Array de sugerencias ordenadas por score
 */
export function getSuggestions(
  query: string,
  lang: Language,
  limit: number = 5
): AutocompleteSuggestion[] {
  const normalizedQuery = query.toLowerCase().trim();
  const data = AUTOCOMPLETE_SUGGESTIONS[lang];
  const suggestions: AutocompleteSuggestion[] = [];

  // 1. Buscar en categorías
  data.categories.forEach(category => {
    if (category.toLowerCase().includes(normalizedQuery)) {
      suggestions.push({
        text: category,
        type: 'category',
        score: calculateScore(normalizedQuery, category.toLowerCase()),
      });
    }
  });

  // 2. Buscar en búsquedas populares
  data.popularSearches.forEach(search => {
    if (search.toLowerCase().includes(normalizedQuery)) {
      // Evitar duplicados
      if (!suggestions.find(s => s.text === search)) {
        suggestions.push({
          text: search,
          type: 'popular',
          score: calculateScore(normalizedQuery, search.toLowerCase()),
        });
      }
    }
  });

  // 3. Buscar en keywords
  Object.entries(data.keywords).forEach(([keyword, relatedSearches]) => {
    if (keyword.toLowerCase().includes(normalizedQuery)) {
      relatedSearches.forEach(relatedSearch => {
        // Evitar duplicados
        if (!suggestions.find(s => s.text === relatedSearch)) {
          suggestions.push({
            text: relatedSearch,
            type: 'keyword',
            score: calculateScore(normalizedQuery, keyword),
          });
        }
      });
    }
  });

  // 4. Ordenar por score (mayor a menor) y limitar
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Calcula score de relevancia (0-100)
 *
 * Prioriza:
 * - Match exacto (100 puntos)
 * - Match al inicio de la palabra (80-90 puntos)
 * - Match en medio de la palabra (50-80 puntos)
 * - Coincidencias más largas tienen mayor score
 *
 * @param query - Texto buscado
 * @param text - Texto donde buscar
 * @returns Score de 0 a 100
 */
function calculateScore(query: string, text: string): number {
  const index = text.indexOf(query);

  // No match
  if (index === -1) return 0;

  // Exact match (máximo score)
  if (query === text) return 100;

  // Starts with query (alto score)
  if (index === 0) {
    const lengthRatio = query.length / text.length;
    return 80 + (lengthRatio * 20);  // 80-100
  }

  // Contains query but not at start (medio score)
  const lengthRatio = query.length / text.length;
  return 50 + (lengthRatio * 30);  // 50-80
}
