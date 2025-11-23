"""
Query Validator para Backend Lambda
Valida búsquedas para prevenir consultas inapropiadas

Sistema de Guardrails - Capa 3 (Backend)
Sincronizado con: /lib/portal/query-validator.ts
"""

import re
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """Resultado de validación"""
    valid: bool
    error: Optional[str] = None
    suggestion: Optional[str] = None
    severity: Optional[str] = None  # 'warning' | 'error' | 'blocked'


# LISTA BLANCA - Términos válidos conocidos
VALID_SUPPLEMENTS = {
    # Suplementos populares
    'ashwagandha', 'cbd', 'melatonin', 'melatonina', 'creatine', 'creatina',
    'protein', 'proteina', 'whey', 'collagen', 'colageno', 'caffeine', 'cafeina',
    'bcaa', 'glutamine', 'glutamina', 'beta-alanine', 'beta-alanina',
    'l-carnitine', 'l-carnitina', 'coq10', 'rhodiola', 'ginseng',
    'tribulus', 'maca', 'spirulina', 'chlorella', 'moringa',

    # Ácidos grasos
    'omega-3', 'omega-6', 'omega-9', 'fish-oil', 'aceite-de-pescado',
    'krill-oil', 'flaxseed', 'linaza', 'chia',

    # Vitaminas
    'vitamin-a', 'vitamina-a', 'vitamin-b', 'vitamina-b',
    'vitamin-b12', 'b12', 'vitamin-c', 'vitamina-c',
    'vitamin-d', 'vitamina-d', 'vitamin-d3', 'd3',
    'vitamin-e', 'vitamina-e', 'vitamin-k', 'vitamina-k',
    'biotin', 'biotina', 'niacin', 'niacina', 'riboflavin', 'riboflavina',
    'thiamine', 'tiamina', 'folate', 'folato', 'folic-acid', 'acido-folico',

    # Minerales
    'magnesium', 'magnesio', 'zinc', 'iron', 'hierro',
    'calcium', 'calcio', 'potassium', 'potasio',
    'selenium', 'selenio', 'chromium', 'cromo',
    'copper', 'cobre', 'manganese', 'manganeso',
    'iodine', 'yodo', 'phosphorus', 'fosforo',

    # Aminoácidos
    'l-theanine', 'l-teanina', 'taurine', 'taurina',
    'arginine', 'arginina', 'lysine', 'lisina',
    'leucine', 'leucina', 'isoleucine', 'isoleucina',
    'valine', 'valina', 'glycine', 'glicina',

    # Hierbas y extractos naturales
    'turmeric', 'curcuma', 'ginger', 'jengibre',
    'garlic', 'ajo', 'green-tea', 'te-verde',
    'black-pepper', 'pimienta-negra', 'cinnamon', 'canela',
    'valerian', 'valeriana', 'chamomile', 'manzanilla',
    'echinacea', 'milk-thistle', 'cardo-mariano',
    'saw-palmetto', 'ginkgo-biloba', 'st-johns-wort',
    'elderberry', 'sauco', 'astragalus', 'astragalo',

    # Probióticos y prebióticos
    'probiotics', 'probioticos', 'prebiotics', 'prebioticos',
    'lactobacillus', 'bifidobacterium', 'fiber', 'fibra',

    # Enzimas digestivas
    'digestive-enzymes', 'enzimas-digestivas',
    'bromelain', 'bromelina', 'papain', 'papaina',

    # Antioxidantes
    'resveratrol', 'quercetin', 'quercetina',
    'alpha-lipoic-acid', 'acido-alfa-lipoico',
    'glutathione', 'glutation', 'nac', 'n-acetyl-cysteine',

    # Otros
    'colostrum', 'calostro', 'bee-pollen', 'polen-de-abeja',
    'royal-jelly', 'jalea-real', 'propolis', 'propoleo',
    'glucosamine', 'glucosamina', 'chondroitin', 'condroitina',
    'msm', 'hyaluronic-acid', 'acido-hialuronico',
}

# CATEGORÍAS VÁLIDAS - Objetivos de salud legítimos
VALID_CATEGORIES = {
    # Categorías principales
    'sleep', 'sueño', 'dormir', 'insomnia', 'insomnio',
    'cognitive', 'cognitivo', 'memory', 'memoria', 'focus', 'enfoque',
    'brain', 'cerebro', 'mental', 'concentration', 'concentracion',
    'muscle', 'musculo', 'muscle-gain', 'ganar-musculo',
    'strength', 'fuerza', 'performance', 'rendimiento',
    'energy', 'energia', 'fatigue', 'fatiga', 'vitality', 'vitalidad',
    'immune', 'inmune', 'immunity', 'inmunidad', 'defense', 'defensa',
    'heart', 'corazon', 'cardiovascular', 'cardio',
    'stress', 'estres', 'anxiety', 'ansiedad', 'calm', 'calma',
    'mood', 'animo', 'depression', 'depresion',
    'joint', 'articulaciones', 'joints', 'bones', 'huesos',
    'skin', 'piel', 'hair', 'cabello', 'nails', 'uñas',
    'digestion', 'digestion', 'gut', 'intestino',
    'weight', 'peso', 'fat-loss', 'perder-grasa',
    'metabolism', 'metabolismo', 'thyroid', 'tiroides',
    'testosterone', 'testosterona', 'hormone', 'hormona',
    'antioxidant', 'antioxidante', 'inflammation', 'inflamacion',
    'detox', 'desintoxicacion', 'liver', 'higado',
    'vision', 'vista', 'eyes', 'ojos',
    'fertility', 'fertilidad', 'libido',
    'recovery', 'recuperacion', 'workout', 'entrenamiento',
    'endurance', 'resistencia', 'stamina',
}

# LISTA NEGRA - Términos explícitamente prohibidos
BLOCKED_TERMS = {
    # Recetas de cocina
    'recipe', 'receta', 'pizza', 'pasta', 'cake', 'pastel',
    'bread', 'pan', 'cookie', 'galleta', 'dessert', 'postre',
    'salad', 'ensalada', 'soup', 'sopa', 'stew', 'guiso',

    # Medicamentos con receta
    'antibiotic', 'antibiotico', 'penicillin', 'penicilina',
    'amoxicillin', 'amoxicilina', 'ibuprofen', 'ibuprofeno',
    'aspirin', 'aspirina', 'acetaminophen', 'paracetamol',
    'opioid', 'opioide', 'morphine', 'morfina',
    'oxycodone', 'hydrocodone', 'fentanyl',
    'adderall', 'ritalin', 'xanax', 'valium',
    'prozac', 'zoloft', 'lexapro',

    # Drogas ilegales
    'cocaine', 'cocaina', 'heroin', 'heroina',
    'methamphetamine', 'metanfetamina', 'meth',
    'marijuana', 'marihuana', 'cannabis', 'weed',
    'lsd', 'ecstasy', 'mdma', 'ketamine', 'ketamina',

    # Esteroides anabólicos
    'steroid', 'esteroide', 'anabolic', 'anabolico',
    'testosterone-injection', 'hgh', 'growth-hormone',
    'trenbolone', 'deca', 'dianabol', 'winstrol',

    # Términos ofensivos/inapropiados
    'bomb', 'bomba', 'weapon', 'arma',
    'poison', 'veneno', 'kill', 'matar',

    # Otro contenido no deseado
    'porn', 'porno', 'sex', 'sexo',
    'hack', 'hackear', 'crack',
}

# PATRONES SOSPECHOSOS - Regex para detectar consultas problemáticas
SUSPICIOUS_PATTERNS = [
    re.compile(r'\b(how to|como) (make|hacer|create|crear) (bomb|bomba|weapon|arma)', re.IGNORECASE),
    re.compile(r'\b(recipe|receta) (for|para|de)\b', re.IGNORECASE),
    re.compile(r'\b(buy|comprar|purchase|adquirir) (drug|droga|illegal)', re.IGNORECASE),
    re.compile(r'\b(prescription|receta medica|rx)\b', re.IGNORECASE),
]


def validate_supplement_query(query: str) -> ValidationResult:
    """
    Validar query de búsqueda

    Args:
        query: Búsqueda del usuario

    Returns:
        ValidationResult con valid=True/False y error opcional
    """
    # Normalizar query
    normalized = query.lower().strip()

    # 1. VALIDACIÓN BÁSICA
    if not normalized or len(normalized) < 2:
        return ValidationResult(
            valid=False,
            error='La búsqueda es demasiado corta. Intenta con al menos 2 caracteres.',
            severity='warning'
        )

    if len(normalized) > 100:
        return ValidationResult(
            valid=False,
            error='La búsqueda es demasiado larga. Por favor, sé más específico.',
            severity='warning'
        )

    # 2. LISTA NEGRA - Bloquear términos prohibidos
    words = normalized.split()
    for word in words:
        if word in BLOCKED_TERMS:
            return ValidationResult(
                valid=False,
                error='Esta búsqueda no está permitida. Por favor, busca suplementos alimenticios válidos.',
                severity='blocked',
                suggestion='Intenta buscar: ashwagandha, omega-3, vitamin-d, magnesium, sleep, cognitive, muscle-gain'
            )

    # 3. PATRONES SOSPECHOSOS
    for pattern in SUSPICIOUS_PATTERNS:
        if pattern.search(normalized):
            return ValidationResult(
                valid=False,
                error='Esta búsqueda no parece estar relacionada con suplementos alimenticios.',
                severity='blocked',
                suggestion='Intenta buscar: ashwagandha, omega-3, vitamin-d, magnesium, sleep, cognitive, muscle-gain'
            )

    # 4. LISTA BLANCA - Validación positiva
    has_valid_term = False

    for word in words:
        # Eliminar guiones para búsqueda flexible
        clean_word = word.replace('-', '')

        # Buscar coincidencias exactas
        if word in VALID_SUPPLEMENTS or word in VALID_CATEGORIES:
            has_valid_term = True
            break

        # Buscar coincidencias parciales (para typos menores)
        for valid_term in list(VALID_SUPPLEMENTS) + list(VALID_CATEGORIES):
            clean_valid = valid_term.replace('-', '')
            if clean_valid in clean_word or clean_word in clean_valid:
                if len(valid_term) >= 4 and len(clean_word) >= 4:
                    has_valid_term = True
                    break

        if has_valid_term:
            break

    # 5. VALIDACIÓN HEURÍSTICA - Si no está en lista blanca
    if not has_valid_term:
        # Permitir queries que parezcan ingredientes/suplementos
        looks_like_ingredient = (
            re.match(r'^[a-z]{4,}(-[a-z]{2,})?$', normalized, re.IGNORECASE) or
            re.search(r'acid|ine|ate|ol$', normalized, re.IGNORECASE) or
            re.search(r'extract|extracto|powder|polvo', normalized, re.IGNORECASE)
        )

        if not looks_like_ingredient:
            return ValidationResult(
                valid=False,
                error='No reconocemos este suplemento. ¿Estás buscando un suplemento alimenticio?',
                severity='warning',
                suggestion='Suplementos comunes: ashwagandha, omega-3, vitamin-d, magnesium, creatine, melatonin'
            )

    # ✅ QUERY VÁLIDA
    return ValidationResult(valid=True)


def sanitize_query(query: str) -> str:
    """
    Sanitizar y normalizar query

    Args:
        query: Query a sanitizar

    Returns:
        Query sanitizada
    """
    return query.strip()[:100].replace('<', '').replace('>', '')


# Función de conveniencia para usar en tests
def is_valid_query(query: str) -> bool:
    """Verifica si un query es válido (True/False simple)"""
    return validate_supplement_query(query).valid
