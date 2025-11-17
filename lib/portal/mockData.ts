/**
 * Mock Data for Portal Demo
 * Used when backend is not configured
 */

export interface MockRecommendation {
  recommendation_id: string;
  quiz_id: string;
  category: string;
  evidence_summary: {
    totalStudies: number;
    totalParticipants: number;
    efficacyPercentage: number;
    researchSpanYears: number;
    ingredients: Array<{
      name: string;
      grade: 'A' | 'B' | 'C';
      studyCount: number;
      rctCount: number;
    }>;
  };
  ingredients: Array<{
    name: string;
    grade: 'A' | 'B' | 'C';
    adjustedDose?: string;
    adjustmentReason?: string;
  }>;
  products: Array<{
    tier: 'budget' | 'value' | 'premium';
    name: string;
    price: number;
    currency: string;
    contains: string[];
    whereToBuy: string;
    affiliateLink?: string;
    directLink?: string;
    description: string;
    isAnkonere?: boolean;
  }>;
  personalization_factors: {
    altitude?: number;
    climate?: string;
    gender?: string;
    age?: number;
    location?: string;
    sensitivities?: string[];
  };
}

export function getMockRecommendation(category: string): MockRecommendation {
  const categoryData: Record<string, Partial<MockRecommendation>> = {
    'muscle-gain': {
      category: 'Muscle Gain & Exercise',
      evidence_summary: {
        totalStudies: 247,
        totalParticipants: 18450,
        efficacyPercentage: 87,
        researchSpanYears: 15,
        ingredients: [
          { name: 'Creatine Monohydrate', grade: 'A', studyCount: 89, rctCount: 45 },
          { name: 'Whey Protein', grade: 'A', studyCount: 112, rctCount: 67 },
          { name: 'Beta-Alanine', grade: 'B', studyCount: 34, rctCount: 12 },
          { name: 'BCAA', grade: 'B', studyCount: 28, rctCount: 8 },
        ],
      },
      ingredients: [
        { name: 'Creatine Monohydrate', grade: 'A', adjustedDose: '5g/día', adjustmentReason: 'Dosis optimizada para ganancia de masa muscular' },
        { name: 'Whey Protein', grade: 'A', adjustedDose: '25-30g post-entrenamiento', adjustmentReason: 'Timing optimizado para síntesis proteica' },
      ],
      products: [
        {
          tier: 'budget',
          name: 'Creatina Monohidrato Premium',
          price: 150,
          currency: 'MXN',
          contains: ['Creatine Monohydrate 5g', 'Sin aditivos'],
          whereToBuy: 'Amazon México',
          affiliateLink: 'https://amazon.com.mx/dp/example',
          description: 'Creatina pura de alta calidad, ideal para principiantes',
          isAnkonere: false,
        },
        {
          tier: 'value',
          name: 'Proteína Whey + Creatina Stack',
          price: 320,
          currency: 'MXN',
          contains: ['Whey Protein 25g', 'Creatine 5g', 'BCAA 5g'],
          whereToBuy: 'Amazon México',
          affiliateLink: 'https://amazon.com.mx/dp/example',
          description: 'Combinación optimizada de proteína y creatina para máximo rendimiento',
          isAnkonere: false,
        },
        {
          tier: 'premium',
          name: 'ANKONERE Muscle Builder Pro',
          price: 450,
          currency: 'MXN',
          contains: ['Whey Protein 30g', 'Creatine 5g', 'Beta-Alanine 3g', 'BCAA 8g', 'Electrolitos'],
          whereToBuy: 'ANKONERE Direct',
          directLink: 'https://ankonere.com/product/muscle-builder',
          description: 'Fórmula premium con todos los ingredientes respaldados por ciencia, optimizada para LATAM',
          isAnkonere: true,
        },
      ],
      personalization_factors: {
        altitude: 2250,
        climate: 'tropical',
        gender: 'male',
        age: 35,
        location: 'CDMX',
        sensitivities: [],
      },
    },
    'cognitive': {
      category: 'Memory & Focus',
      evidence_summary: {
        totalStudies: 189,
        totalParticipants: 12450,
        efficacyPercentage: 82,
        researchSpanYears: 12,
        ingredients: [
          { name: 'Omega-3 DHA', grade: 'A', studyCount: 76, rctCount: 34 },
          { name: 'Lion&apos;s Mane', grade: 'B', studyCount: 45, rctCount: 18 },
          { name: 'Bacopa Monnieri', grade: 'B', studyCount: 38, rctCount: 15 },
          { name: 'Rhodiola Rosea', grade: 'B', studyCount: 30, rctCount: 12 },
        ],
      },
      ingredients: [
        { name: 'Omega-3 DHA', grade: 'A', adjustedDose: '1000mg/día', adjustmentReason: 'Dosis optimizada para función cognitiva' },
        { name: 'Lion&apos;s Mane', grade: 'B', adjustedDose: '500mg/día', adjustmentReason: 'Extracto estandarizado para mejor absorción' },
      ],
      products: [
        {
          tier: 'budget',
          name: 'Omega-3 Premium',
          price: 180,
          currency: 'MXN',
          contains: ['Omega-3 DHA 1000mg', 'EPA 200mg'],
          whereToBuy: 'Amazon México',
          affiliateLink: 'https://amazon.com.mx/dp/example',
          description: 'Aceite de pescado de alta calidad para salud cerebral',
          isAnkonere: false,
        },
        {
          tier: 'value',
          name: 'Focus Stack Completo',
          price: 380,
          currency: 'MXN',
          contains: ['Omega-3 DHA 1000mg', 'Lion&apos;s Mane 500mg', 'Bacopa 300mg'],
          whereToBuy: 'Amazon México',
          affiliateLink: 'https://amazon.com.mx/dp/example',
          description: 'Combinación sinérgica de nootrópicos respaldados por ciencia',
          isAnkonere: false,
        },
        {
          tier: 'premium',
          name: 'ANKONERE Cognitive Pro',
          price: 520,
          currency: 'MXN',
          contains: ['Omega-3 DHA 1200mg', 'Lion&apos;s Mane 600mg', 'Bacopa 400mg', 'Rhodiola 300mg', 'Fosfatidilserina'],
          whereToBuy: 'ANKONERE Direct',
          directLink: 'https://ankonere.com/product/cognitive-pro',
          description: 'Fórmula premium para máximo rendimiento cognitivo, optimizada para altitud y clima LATAM',
          isAnkonere: true,
        },
      ],
      personalization_factors: {
        altitude: 2250,
        climate: 'tropical',
        gender: 'male',
        age: 35,
        location: 'CDMX',
        sensitivities: [],
      },
    },
    'sleep': {
      category: 'Sleep',
      evidence_summary: {
        totalStudies: 156,
        totalParticipants: 9870,
        efficacyPercentage: 91,
        researchSpanYears: 10,
        ingredients: [
          { name: 'Melatonin', grade: 'A', studyCount: 98, rctCount: 56 },
          { name: 'Magnesium', grade: 'A', studyCount: 42, rctCount: 28 },
          { name: 'L-Theanine', grade: 'B', studyCount: 34, rctCount: 15 },
          { name: 'GABA', grade: 'B', studyCount: 28, rctCount: 12 },
        ],
      },
      ingredients: [
        { name: 'Melatonin', grade: 'A', adjustedDose: '3-5mg antes de dormir', adjustmentReason: 'Dosis ajustada para latitud y exposición solar' },
        { name: 'Magnesium', grade: 'A', adjustedDose: '400mg/día', adjustmentReason: 'Forma glicinato para mejor absorción' },
      ],
      products: [
        {
          tier: 'budget',
          name: 'Melatonina 3mg',
          price: 120,
          currency: 'MXN',
          contains: ['Melatonin 3mg', 'Sin aditivos'],
          whereToBuy: 'Amazon México',
          affiliateLink: 'https://amazon.com.mx/dp/example',
          description: 'Melatonina de liberación rápida para conciliar el sueño',
          isAnkonere: false,
        },
        {
          tier: 'value',
          name: 'Sleep Support Stack',
          price: 280,
          currency: 'MXN',
          contains: ['Melatonin 5mg', 'Magnesium 400mg', 'L-Theanine 200mg'],
          whereToBuy: 'Amazon México',
          affiliateLink: 'https://amazon.com.mx/dp/example',
          description: 'Combinación sinérgica para mejorar calidad y duración del sueño',
          isAnkonere: false,
        },
        {
          tier: 'premium',
          name: 'ANKONERE Sleep Optimizer',
          price: 420,
          currency: 'MXN',
          contains: ['Melatonin 5mg (liberación prolongada)', 'Magnesium Glicinato 400mg', 'L-Theanine 300mg', 'GABA 500mg', 'Valeriana'],
          whereToBuy: 'ANKONERE Direct',
          directLink: 'https://ankonere.com/product/sleep-optimizer',
          description: 'Fórmula premium con liberación prolongada, optimizada para altitud y ritmos circadianos LATAM',
          isAnkonere: true,
        },
      ],
      personalization_factors: {
        altitude: 2250,
        climate: 'tropical',
        gender: 'male',
        age: 35,
        location: 'CDMX',
        sensitivities: [],
      },
    },
  };

  const defaultData: MockRecommendation = {
    recommendation_id: `mock_${Date.now()}`,
    quiz_id: `quiz_${Date.now()}`,
    category: categoryData[category]?.category || category,
    evidence_summary: categoryData[category]?.evidence_summary || {
      totalStudies: 150,
      totalParticipants: 10000,
      efficacyPercentage: 80,
      researchSpanYears: 10,
      ingredients: [
        { name: 'Ingredient A', grade: 'A', studyCount: 50, rctCount: 25 },
        { name: 'Ingredient B', grade: 'B', studyCount: 30, rctCount: 12 },
      ],
    },
    ingredients: categoryData[category]?.ingredients || [],
    products: categoryData[category]?.products || [],
    personalization_factors: categoryData[category]?.personalization_factors || {
      altitude: 2250,
      climate: 'tropical',
      gender: 'male',
      age: 35,
      location: 'CDMX',
    },
  };

  return defaultData;
}

