# ✅ CHECKLIST DE IMPLEMENTACIÓN

**Objetivo:** Activar features existentes en 1 día  
**Esfuerzo:** 5 horas  
**Impacto:** Alto (mejora UX en 60-70%)

---

## 🌅 MAÑANA (4 horas)

### ⏰ 9:00 - 9:15 (15 min) - Preparación

- [ ] Revisar cambios locales
  ```bash
  git diff app/api/portal/recommend/route.ts
  ```
- [ ] Decidir: commitear o descartar
- [ ] Crear branch
  ```bash
  git checkout -b feature/streaming-and-examine
  ```

---

### ⏰ 9:15 - 11:15 (2 horas) - Streaming SSE

#### Paso 1: Integrar StreamingResults (30 min)

- [ ] Abrir `app/portal/results/page.tsx`
- [ ] Importar componente
  ```typescript
  import { StreamingResults } from '@/components/portal/StreamingResults';
  ```
- [ ] Reemplazar loading state
  ```typescript
  if (isLoading) {
    return (
      <StreamingResults
        supplementName={query || ''}
        onComplete={(data) => {
          setRecommendation(data);
          setIsLoading(false);
        }}
        onError={(error) => {
          setError(error);
          setIsLoading(false);
        }}
      />
    );
  }
  ```
- [ ] Guardar archivo

#### Paso 2: Verificar endpoint SSE (15 min)

- [ ] Abrir `app/api/portal/enrich-stream/route.ts`
- [ ] Verificar que existe y está completo
- [ ] Verificar headers CORS
  ```typescript
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
  ```

#### Paso 3: Testing local (45 min)

- [ ] Iniciar dev server
  ```bash
  npm run dev
  ```
- [ ] Probar con vitamin-d (cache hit)
  - [ ] Buscar "vitamin-d"
  - [ ] Verificar streaming funciona
  - [ ] Verificar progreso se muestra
  - [ ] Verificar resultado final correcto

- [ ] Probar con nuevo suplemento (generación)
  - [ ] Buscar "rhodiola rosea"
  - [ ] Verificar streaming funciona
  - [ ] Verificar todas las etapas se muestran
  - [ ] Verificar resultado final correcto

- [ ] Probar error 404
  - [ ] Buscar "suplemento-inexistente-xyz"
  - [ ] Verificar error se maneja bien
  - [ ] Verificar sugerencias se muestran

#### Paso 4: Ajustes y polish (30 min)

- [ ] Ajustar mensajes de progreso
- [ ] Ajustar estilos si es necesario
- [ ] Verificar responsive (mobile)
- [ ] Verificar accesibilidad

---

### ⏰ 11:15 - 12:15 (1 hora) - Examine View

#### Paso 1: Crear toggle component (20 min)

- [ ] Crear `components/portal/ViewToggle.tsx`
  ```typescript
  interface ViewToggleProps {
    mode: 'standard' | 'examine';
    onChange: (mode: 'standard' | 'examine') => void;
  }
  
  export function ViewToggle({ mode, onChange }: ViewToggleProps) {
    return (
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === 'standard' ? 'default' : 'outline'}
          onClick={() => onChange('standard')}
        >
          Vista Estándar
        </Button>
        <Button
          variant={mode === 'examine' ? 'default' : 'outline'}
          onClick={() => onChange('examine')}
        >
          Vista Cuantitativa
        </Button>
      </div>
    );
  }
  ```

#### Paso 2: Integrar en results page (20 min)

- [ ] Abrir `app/portal/results/page.tsx`
- [ ] Importar componentes
  ```typescript
  import { ExamineStyleView } from '@/components/portal/ExamineStyleView';
  import { ViewToggle } from '@/components/portal/ViewToggle';
  ```
- [ ] Agregar estado
  ```typescript
  const [viewMode, setViewMode] = useState<'standard' | 'examine'>('standard');
  ```
- [ ] Agregar toggle y render condicional
  ```typescript
  <ViewToggle mode={viewMode} onChange={setViewMode} />
  
  {viewMode === 'standard' ? (
    <EvidenceAnalysisPanelNew evidenceSummary={transformedEvidence} />
  ) : (
    <ExamineStyleView content={examineContent} />
  )}
  ```

#### Paso 3: Transformar datos para Examine view (20 min)

- [ ] Crear función de transformación
  ```typescript
  function transformToExamineFormat(recommendation: Recommendation) {
    return {
      overview: {
        whatIsIt: recommendation.supplement.description,
        functions: recommendation.supplement.primaryUses || [],
        sources: recommendation.supplement.sources || [],
      },
      benefitsByCondition: recommendation.supplement.worksFor.map(item => ({
        condition: item.condition,
        effect: item.magnitude || 'Moderate',
        quantitativeData: item.effectSize || 'Ver estudios',
        evidence: `${item.studyCount} estudios`,
        context: item.notes,
        studyTypes: ['RCT', 'Meta-analysis'],
      })),
      dosage: recommendation.supplement.dosage,
      safety: recommendation.supplement.safety,
    };
  }
  ```
- [ ] Aplicar transformación
  ```typescript
  const examineContent = transformToExamineFormat(recommendation);
  ```

---

### ⏰ 12:15 - 13:00 (45 min) - Testing Completo

- [ ] Probar toggle funciona
- [ ] Probar vista estándar
- [ ] Probar vista examine
- [ ] Verificar datos se muestran correctamente
- [ ] Verificar responsive
- [ ] Verificar accesibilidad
- [ ] Tomar screenshots para documentación

---

## 🌆 TARDE (4 horas)

### ⏰ 14:00 - 16:00 (2 horas) - Enhanced Error States

#### Paso 1: Crear ErrorState component (45 min)

- [ ] Crear `components/portal/ErrorState.tsx`
  ```typescript
  interface ErrorStateProps {
    error: string;
    supplementName: string;
    onRetry: () => void;
    suggestions?: string[];
  }
  
  export function ErrorState({ 
    error, 
    supplementName, 
    onRetry, 
    suggestions 
  }: ErrorStateProps) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Error Icon & Message */}
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold text-red-900">
                No pudimos encontrar información
              </h3>
              <p className="text-sm text-red-700 mt-2">{error}</p>
            </div>
  
            {/* Suggestions */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-900">
                  ¿Quizás buscabas?
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/portal/results?q=${encodeURIComponent(suggestion)}`;
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
  
            {/* Actions */}
            <div className="flex gap-2 justify-center">
              <Button onClick={onRetry} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar de Nuevo
              </Button>
              <Button 
                onClick={() => window.location.href = '/portal'} 
                variant="outline"
              >
                Nueva Búsqueda
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  ```

#### Paso 2: Integrar en results page (30 min)

- [ ] Importar ErrorState
- [ ] Reemplazar error display
  ```typescript
  if (error) {
    return (
      <ErrorState
        error={error}
        supplementName={query || ''}
        onRetry={() => window.location.reload()}
        suggestions={getSuggestions(query)}
      />
    );
  }
  ```

#### Paso 3: Agregar lógica de sugerencias (45 min)

- [ ] Crear función getSuggestions
  ```typescript
  function getSuggestions(query: string): string[] {
    const suggestion = suggestSupplementCorrection(query);
    if (suggestion) {
      return [suggestion.suggestion];
    }
    
    // Fallback: sugerencias populares
    return [
      'Ashwagandha',
      'Omega-3',
      'Vitamin D',
      'Magnesium',
    ];
  }
  ```

---

### ⏰ 16:00 - 17:00 (1 hora) - Offline Detection

#### Paso 1: Crear hook useOnlineStatus (20 min)

- [ ] Crear `lib/hooks/useOnlineStatus.ts`
  ```typescript
  import { useState, useEffect } from 'react';
  
  export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true);
  
    useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
  
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
  
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }, []);
  
    return isOnline;
  }
  ```

#### Paso 2: Integrar en results page (20 min)

- [ ] Importar hook
- [ ] Usar en componente
  ```typescript
  const isOnline = useOnlineStatus();
  
  useEffect(() => {
    if (!isOnline) {
      setError('Sin conexión a internet. Verifica tu red.');
    } else if (error === 'Sin conexión a internet. Verifica tu red.') {
      setError(null);
      // Retry last request
      window.location.reload();
    }
  }, [isOnline]);
  ```

#### Paso 3: Agregar banner offline (20 min)

- [ ] Crear componente OfflineBanner
  ```typescript
  {!isOnline && (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-5 h-5" />
        <span>Sin conexión a internet</span>
      </div>
    </div>
  )}
  ```

---

### ⏰ 17:00 - 18:00 (1 hora) - Deploy

#### Paso 1: Testing final (20 min)

- [ ] Probar streaming con 3 suplementos
- [ ] Probar toggle examine view
- [ ] Probar error states
- [ ] Probar offline detection
- [ ] Verificar mobile
- [ ] Verificar accesibilidad

#### Paso 2: Commit y push (10 min)

- [ ] Commit cambios
  ```bash
  git add .
  git commit -m "feat: add streaming SSE, examine view, enhanced errors, and offline detection"
  ```
- [ ] Push a remote
  ```bash
  git push origin feature/streaming-and-examine
  ```

#### Paso 3: Deploy a staging (15 min)

- [ ] Crear PR en GitHub
- [ ] Esperar CI/CD
- [ ] Verificar deploy preview en Vercel
- [ ] Testing en staging

#### Paso 4: Deploy a producción (15 min)

- [ ] Merge PR a main
- [ ] Esperar auto-deploy en Vercel
- [ ] Verificar en producción
- [ ] Monitorear errores en Sentry

---

## 📊 VALIDACIÓN FINAL

### Checklist de Validación

- [ ] Streaming funciona con cache hit (<3s)
- [ ] Streaming funciona con generación nueva (20-30s)
- [ ] Toggle examine view funciona
- [ ] Vista estándar muestra datos correctos
- [ ] Vista examine muestra datos cuantitativos
- [ ] Error 404 muestra sugerencias
- [ ] Error 503 muestra retry
- [ ] Offline detection funciona
- [ ] Mobile responsive
- [ ] Accesibilidad (keyboard navigation)

### Métricas Esperadas

- [ ] Tiempo percibido de espera: <10s (antes: 30s)
- [ ] Feedback durante carga: 100% (antes: 0%)
- [ ] Datos cuantitativos visibles: 90% (antes: 30%)
- [ ] Errores con acción: 100% (antes: 0%)

---

## 🎉 COMPLETADO

**Fecha de completación:** _____________  
**Tiempo total:** _____________  
**Issues encontrados:** _____________  
**Próximos pasos:** _____________

