# Plan de Implementación: Motor de Búsqueda Inteligente

Este documento detalla el plan estratégico para evolucionar el buscador de suplementos de un sistema basado en ingredientes a un motor de recomendación inteligente basado en condiciones de salud y evidencia científica.

## Visión General

El objetivo es unificar la experiencia de búsqueda. Un usuario podrá introducir "Vitamina D" o "dolor articular" en la misma barra de búsqueda. El sistema, de forma inteligente, detectará la intención y devolverá el tipo de resultado apropiado: un análisis detallado para el ingrediente o una lista de suplementos clasificados por evidencia científica para la condición.

---

## Fase 1: Backend - Detección de Intención y Lógica de Búsqueda por Evidencia

Esta fase se centra en construir la inteligencia del sistema en el backend.

1.  **Modificar el Endpoint Principal (`/api/portal/quiz`):**
    *   **Sub-tarea:** Implementar un módulo de "Detección de Intención".
    *   **Detalle:** Este módulo analizará el `query` del usuario. Usando la base de datos `SUPPLEMENTS_DATABASE`, determinará si la búsqueda es para un `ingrediente` (si coincide con una entrada existente) o una `condición` (si coincide con una entrada de `category: 'condition'` o si no se encuentra como ingrediente).

2.  **Integración con API Externa (PubMed):**
    *   **Sub-tarea:** Crear un nuevo servicio para conectar con la API de PubMed.
    *   **Detalle:** Cuando se detecta una "condición", el sistema necesita saber qué suplementos son relevantes. Se realizarán búsquedas en PubMed para la condición (ej. "joint pain supplements"). Se analizarán los resultados para extraer los nombres de los suplementos y la fuerza de la evidencia (meta-análisis, RCTs, etc.).

3.  **Sistema de Clasificación (Grading):**
    *   **Sub-tarea:** Desarrollar una lógica para asignar grados (A, B, C, D) a los suplementos encontrados.
    *   **Detalle:** Basado en la cantidad y calidad de la evidencia de PubMed, cada suplemento para una condición dada recibirá una calificación.
        *   **Grado A:** Fuerte evidencia (múltiples meta-análisis y RCTs).
        *   **Grado B:** Evidencia moderada (algunos RCTs positivos).
        *   **Grado C:** Evidencia limitada o conflictiva.
        *   **Grado D:** Evidencia en contra.

4.  **Definir Nueva Estructura de Datos de Respuesta:**
    *   **Sub-tarea:** Diseñar el JSON que el endpoint devolverá para una búsqueda de "condición".
    *   **Detalle:** La respuesta será diferente a la actual. Incluirá listas de suplementos agrupados por su calificación.
        ```json
        {
          "searchType": "condition",
          "condition": "Dolor Articular",
          "summary": "Resumen de los hallazgos...",
          "supplementsByEvidence": {
            "gradeA": [
              { "name": "Cúrcuma", "summary": "...", "studyCount": 50 },
              { "name": "Glucosamina", "summary": "...", "studyCount": 45 }
            ],
            "gradeB": [
              { "name": "MSM", "summary": "...", "studyCount": 25 }
            ],
            "gradeC": [],
            "gradeD": [
              { "name": "Vitamina X", "summary": "...", "studyCount": 10 }
            ]
          }
        }
        ```

5.  **Implementar Caching:**
    *   **Sub-tarea:** Añadir una capa de caché (ej. Redis o en memoria) para las búsquedas de PubMed.
    *   **Detalle:** Las búsquedas en PubMed pueden ser lentas. Cachear los resultados para condiciones comunes mejorará drásticamente el rendimiento.

---

## Fase 2: Frontend - Visualización de Resultados Basados en Evidencia

Esta fase se enfoca en cómo el usuario verá los nuevos resultados.

1.  **Adaptar la Página de Resultados (`app/portal/results/page.tsx`):**
    *   **Sub-tarea:** Añadir lógica de estado para manejar el nuevo tipo de respuesta (`searchType: 'condition'`).
    *   **Detalle:** El componente `ResultsPageContent` necesitará un `useState` para almacenar el nuevo formato de datos y renderizar condicionalmente la vista de resultados de ingrediente o la nueva vista de condición.

2.  **Crear Componente `ConditionResultsDisplay.tsx`:**
    *   **Sub-tarea:** Construir un nuevo componente React para mostrar los resultados de la búsqueda por condición.
    *   **Detalle:** Este componente será el contenedor principal. Recibirá los datos (`supplementsByEvidence`) y renderizará las diferentes secciones (Grado A, B, etc.).

3.  **Crear Componente `SupplementEvidenceCard.tsx`:**
    *   **Sub-tarea:** Diseñar y construir la tarjeta individual para cada suplemento en la lista.
    *   **Detalle:** Esta tarjeta mostrará el nombre del suplemento, su calificación (con un badge visual), un breve resumen de la evidencia y la cantidad de estudios. Será clickable, llevando al usuario a la página de resultados de ese ingrediente específico.

4.  **Integrar el Flujo:**
    *   **Sub-tarea:** Asegurar que al hacer clic en un `SupplementEvidenceCard`, el usuario navegue correctamente a la URL `/portal/results?q=<nombre_suplemento>`.
    *   **Detalle:** Esto reutilizará la vista de resultados de ingrediente ya existente, creando una experiencia de usuario fluida y conectada.

---

## Fase 3: Pruebas y Despliegue

1.  **Pruebas Unitarias:** Para la lógica de detección de intención y el sistema de clasificación en el backend.
2.  **Pruebas de Integración:** Para el endpoint `/api/portal/quiz` asegurando que devuelve la estructura correcta para ambos tipos de búsqueda.
3.  **Pruebas End-to-End:** Simular el flujo completo de un usuario buscando una condición y navegando a un suplemento.
4.  **Despliegue por Fases:** Desplegar primero en un entorno de `staging` para validación antes de pasar a producción.
