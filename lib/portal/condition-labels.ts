const CONDITION_LABELS: Record<string, string> = {
  acne: 'Acne',
  anemia: 'Anemia',
  anxiety: 'Anxiety support',
  antioxidant: 'Antioxidant support',
  bones: 'Bone health',
  brain: 'Brain health',
  calcium: 'Calcium metabolism',
  cholesterol: 'Cholesterol support',
  cognition: 'Cognitive function',
  collagen: 'Collagen formation',
  cortisol: 'Cortisol balance',
  cramps: 'Muscle cramps',
  diabetes: 'Blood sugar support',
  digestion: 'Digestive comfort',
  endurance: 'Exercise endurance',
  energy: 'Energy metabolism',
  fatigue: 'Fatigue support',
  heart: 'Heart health',
  immunity: 'Immune support',
  inflammation: 'Inflammatory balance',
  joints: 'Joint comfort',
  libido: 'Libido support',
  liver: 'Liver support',
  memory: 'Memory support',
  metabolism: 'Metabolic health',
  muscles: 'Muscle function',
  nerves: 'Nervous system support',
  skin: 'Skin health',
  sleep: 'Sleep quality',
  stress: 'Stress support',
  testosterone: 'Testosterone support',
  thyroid: 'Thyroid support',
  vision: 'Vision support',

  acne_es: 'Acne',
  anemia_es: 'Anemia',
  ansiedad: 'Apoyo para ansiedad',
  antioxidante: 'Apoyo antioxidante',
  articulaciones: 'Salud articular',
  cabello: 'Salud del cabello',
  calcio: 'Metabolismo del calcio',
  calambres: 'Calambres musculares',
  cerebro: 'Salud cerebral',
  colesterol: 'Apoyo para colesterol',
  colageno: 'Formacion de colageno',
  corazon: 'Salud cardiovascular',
  cortisol_es: 'Balance de cortisol',
  diabetes_es: 'Apoyo para glucosa',
  energia: 'Metabolismo energetico',
  estres: 'Apoyo para estres',
  fatiga: 'Apoyo para fatiga',
  higado: 'Apoyo hepatico',
  huesos: 'Salud osea',
  inmunidad: 'Apoyo inmune',
  inflamacion: 'Balance inflamatorio',
  libido_es: 'Apoyo para libido',
  memoria: 'Apoyo para memoria',
  metabolismo: 'Salud metabolica',
  musculos: 'Funcion muscular',
  nervios: 'Apoyo del sistema nervioso',
  piel: 'Salud de la piel',
  sueno: 'Calidad del sueno',
  testosterona: 'Apoyo para testosterona',
  tiroides: 'Apoyo tiroideo',
  vision_es: 'Apoyo visual',
};

function normalizeCondition(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function formatConditionLabel(condition: string): string {
  const normalized = normalizeCondition(condition);
  if (!normalized) return condition;

  return CONDITION_LABELS[normalized] || titleCase(normalized);
}
