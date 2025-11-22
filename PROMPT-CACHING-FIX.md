# Fix: Prompt Caching con Converse API

**Fecha:** 2025-11-22  
**Problema:** Prompt caching con InvokeModel causó timeouts

---

## 🔍 Causa Raíz

El problema fue usar `InvokeModel` API con prompt caching. Según la documentación de AWS:

1. **InvokeModel API:** Soporta prompt caching pero con formato específico
2. **Converse API:** API recomendada para conversaciones con mejor soporte de caching
3. **Claude 3.5 Haiku:** Requiere mínimo 2048 tokens para cachear

**Error cometido:**
- Usamos `InvokeModel` con `cache_control` en formato incorrecto
- Causó timeouts de 31s en Lambda
- Sistema retornó 404 para términos válidos

---

## ✅ Solución: Usar Converse API

### Opción 1: Converse API (Recomendado)

```typescript
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

const command = new ConverseCommand({
  modelId: 'anthropic.claude-3-5-haiku-20241022-v1:0',
  messages: [
    {
      role: 'user',
      content: [
        {
          text: `Translate to English: "${term}"`,
        },
      ],
    },
  ],
  system: [
    {
      text: `You are a supplement translation expert...
      
[40+ ejemplos aquí para alcanzar 2048 tokens]`,
    },
    {
      cachePoint: {
        type: 'default',
      },
    },
  ],
  inferenceConfig: {
    maxTokens: 100,
    temperature: 0,
  },
});

const response = await client.send(command);
```

### Opción 2: InvokeModel con formato correcto

```typescript
const command = new InvokeModelCommand({
  modelId: MODEL_ID,
  body: JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 100,
    temperature: 0,
    system: 'System prompt aquí...',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Prompt aquí...',
          },
          {
            type: 'text',
            text: '[Ejemplos para alcanzar 2048 tokens]',
            cache_control: {
              type: 'ephemeral',
            },
          },
        ],
      },
    ],
  }),
});
```

---

## 🎯 Estrategia Recomendada

### Enfoque Híbrido Pragmático

Dado que:
1. Prompt caching requiere >2048 tokens (latencia inicial de 2-5s)
2. El mapa estático es instantáneo (0ms)
3. Tenemos timeouts de protección (5s/8s)

**Mejor solución:**
```typescript
// 1. Mapa estático para top 20-30 términos (0ms)
const COMMON_TERMS = {
  'menta': 'peppermint',
  'panax ginseng': 'ginseng',
  'resveratrol': 'resveratrol', // Ya está en inglés
  // ... top 20-30 términos
};

// 2. LLM simple y rápido para términos raros (500-2000ms)
// Sin prompt caching por ahora (requiere más testing)

// 3. Timeout de 5s para protección
```

**Ventajas:**
- ✅ Términos comunes: 0ms (mapa)
- ✅ Términos raros: 500-2000ms (LLM simple)
- ✅ Sin timeouts (protección de 5s)
- ✅ 100% cobertura
- ✅ Fácil de mantener (solo top 20-30)

---

## 📊 Comparación de Enfoques

| Enfoque | Latencia | Cobertura | Mantenimiento | Complejidad |
|---------|----------|-----------|---------------|-------------|
| Solo mapa | 0ms | Limitada | Alto | Baja |
| Solo LLM simple | 500-2000ms | 100% | Ninguno | Baja |
| LLM + Caching | 200-500ms* | 100% | Ninguno | Alta |
| **Híbrido (mapa + LLM)** | **0-2000ms** | **100%** | **Bajo** | **Baja** |

*Después del primer hit, requiere >2048 tokens

---

## 🚀 Implementación Recomendada

```typescript
// lib/services/abbreviation-expander.ts

// Mapa pequeño y curado (top 20-30 términos)
const COMMON_TERMS: Record<string, string> = {
  // Términos en inglés que no necesitan traducción
  'resveratrol': 'resveratrol',
  'quercetin': 'quercetin',
  'ashwagandha': 'ashwagandha',
  'ginseng': 'ginseng',
  'rhodiola': 'rhodiola',
  
  // Términos compuestos comunes
  'panax ginseng': 'ginseng',
  'rhodiola rosea': 'rhodiola rosea',
  
  // Top 10-15 términos españoles
  'menta': 'peppermint',
  'jengibre': 'ginger',
  'cúrcuma': 'turmeric',
  'magnesio': 'magnesium',
  'calcio': 'calcium',
  'hierro': 'iron',
  'colageno': 'collagen',
  'melatonina': 'melatonin',
  'valeriana': 'valerian',
  'manzanilla': 'chamomile',
  
  // Abreviaturas críticas
  'hmb': 'beta-hydroxy beta-methylbutyrate',
  'nac': 'N-acetylcysteine',
  'bcaa': 'branched-chain amino acids',
  'cbd': 'cannabidiol',
  'coq10': 'coenzyme q10',
};

async function expandWithLLM(term: string): Promise<string[]> {
  // Prompt simple y directo (sin caching por ahora)
  const prompt = `Translate supplement term to English for PubMed: "${term}"
  
Return JSON array: ["translation"] or [] if already English.`;

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 100,
      temperature: 0,
      system: 'You are a supplement translation expert. Translate Spanish terms to English. Expand abbreviations. Return ONLY JSON arrays.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });
  
  // ... resto del código
}
```

---

## 📈 Próximos Pasos (Futuro)

### Fase 1: Estabilizar sistema actual ✅
- Mapa estático para top 20-30 términos
- LLM simple para términos raros
- Timeouts de protección

### Fase 2: Implementar Converse API (Opcional)
- Migrar a Converse API
- Implementar prompt caching correctamente
- Testing exhaustivo en staging

### Fase 3: Optimizaciones avanzadas (Opcional)
- Cache en DynamoDB para términos traducidos
- Batch processing para múltiples términos
- Fine-tuning de modelo específico

---

## 🎓 Lecciones Aprendidas

1. **Converse API > InvokeModel** para conversaciones y caching
2. **Prompt caching requiere >2048 tokens** (no siempre vale la pena)
3. **Enfoque híbrido es pragmático** (mapa + LLM)
4. **Testing en staging es crítico** antes de producción
5. **Timeouts son esenciales** para protección

---

**Conclusión:** El enfoque híbrido (mapa + LLM simple) es la mejor solución por ahora. Prompt caching puede implementarse en el futuro cuando tengamos más tiempo para testing.
