# ErrorMessage Component Usage Guide

## Overview

The `ErrorMessage` component provides a consistent way to display error messages throughout the application with different styles for client errors (4xx) vs server errors (5xx). It implements all requirements from Requirement 5 of the frontend-error-display-fix spec.

## Features

- ✅ **Requirement 5.1**: Generic friendly messages for 500 errors (no technical details)
- ✅ **Requirement 5.2**: Alternative search suggestions for 404 errors
- ✅ **Requirement 5.3**: Retry button for timeout errors (408)
- ✅ **Requirement 5.4**: Contact support after multiple consecutive errors
- ✅ **Requirement 5.5**: Error messages cleared on successful retry (handled by parent)
- Different visual styles for 4xx (warning/yellow) vs 5xx (error/red) errors
- Actionable suggestions for users
- Inline or card display variants

## Basic Usage

### Simple Error Message

```tsx
import { ErrorMessage } from '@/components/portal/ErrorMessage';

<ErrorMessage
  statusCode={500}
  message="Hubo un error al procesar tu búsqueda."
/>
```

### Error with Retry Button (408 Timeout)

```tsx
<ErrorMessage
  statusCode={408}
  message="La búsqueda está tomando más tiempo del esperado."
  suggestion="Por favor, intenta de nuevo en unos momentos."
  onRetry={() => handleRetry()}
/>
```

### 404 Error with Search Suggestions

```tsx
<ErrorMessage
  statusCode={404}
  message="No encontramos el suplemento solicitado."
  suggestion="Verifica el nombre o prueba con alguna de estas alternativas."
  searchSuggestions={['Vitamina C', 'Vitamina D', 'Magnesio']}
  onSearchSuggestion={(suggestion) => {
    window.location.href = `/portal/results?q=${encodeURIComponent(suggestion)}`;
  }}
/>
```

### Error with Contact Support (After Multiple Failures)

```tsx
<ErrorMessage
  statusCode={500}
  message="Hubo un error al procesar tu búsqueda."
  suggestion="Si el problema persiste, contáctanos."
  consecutiveFailures={3}
  onRetry={() => handleRetry()}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `statusCode` | `number` | No | HTTP status code (400, 404, 408, 410, 429, 500, etc.) |
| `message` | `string` | Yes | User-friendly error message |
| `suggestion` | `string` | No | Actionable suggestion for the user |
| `searchSuggestions` | `string[]` | No | Alternative search suggestions (shown for 404 errors) |
| `consecutiveFailures` | `number` | No | Number of consecutive failures (shows contact support at 3+) |
| `onRetry` | `() => void` | No | Callback for retry action |
| `onSearchSuggestion` | `(suggestion: string) => void` | No | Callback for search suggestion click |
| `variant` | `'inline' \| 'card'` | No | Display variant (default: 'inline') |

## Status Code Behavior

### Client Errors (4xx) - Yellow/Warning Style

- **400 Bad Request**: "Solicitud inválida"
- **404 Not Found**: "No encontrado" + shows search suggestions if provided
- **408 Request Timeout**: "Tiempo de espera agotado" + shows retry button
- **410 Gone**: "Proceso expirado"
- **429 Too Many Requests**: "Demasiados intentos"

### Server Errors (5xx) - Red/Error Style

- **500 Internal Server Error**: "Error del servidor" + shows retry button if onRetry provided
- **502/503/504**: "Servicio no disponible"

## Examples by Use Case

### 1. Enrichment Timeout (408)

```tsx
<ErrorMessage
  statusCode={408}
  message="La búsqueda está tomando más tiempo del esperado."
  suggestion="Por favor, intenta de nuevo en unos momentos."
  onRetry={handleRetry}
  variant="card"
/>
```

### 2. Job Expired (410)

```tsx
<ErrorMessage
  statusCode={410}
  message="El proceso de búsqueda tomó demasiado tiempo y expiró."
  suggestion="Intenta buscar de nuevo con un término más específico."
  onRetry={handleRetry}
  variant="card"
/>
```

### 3. Job Not Found (404)

```tsx
<ErrorMessage
  statusCode={404}
  message="No encontramos el proceso de búsqueda solicitado."
  suggestion="Verifica el enlace o inicia una nueva búsqueda."
  searchSuggestions={['Vitamina C', 'Omega-3', 'Magnesio']}
  onSearchSuggestion={(suggestion) => {
    window.location.href = `/portal/results?q=${encodeURIComponent(suggestion)}`;
  }}
  variant="card"
/>
```

### 4. Too Many Requests (429)

```tsx
<ErrorMessage
  statusCode={429}
  message="Demasiados intentos de consulta."
  suggestion="Por favor, espera unos segundos antes de intentar de nuevo."
  variant="card"
/>
```

### 5. Server Error with Multiple Failures (500)

```tsx
<ErrorMessage
  statusCode={500}
  message="Hubo un error al procesar tu búsqueda."
  suggestion="Por favor, intenta de nuevo. Si el problema persiste, contáctanos."
  consecutiveFailures={3}
  onRetry={handleRetry}
  variant="card"
/>
```

### 6. Validation Error (400)

```tsx
<ErrorMessage
  statusCode={400}
  message="El nombre del suplemento no es válido."
  suggestion="Verifica que el nombre no esté vacío y no contenga caracteres especiales."
  variant="inline"
/>
```

## Integration with AsyncEnrichmentLoader

The `AsyncEnrichmentLoader` component uses `ErrorMessage` to display errors during the enrichment process:

```tsx
// In AsyncEnrichmentLoader.tsx
if (status === 'error' || status === 'timeout') {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <ErrorMessage
        statusCode={errorStatusCode || undefined}
        message={errorMessage || 'Hubo un problema al procesar tu búsqueda.'}
        suggestion={suggestion}
        consecutiveFailures={retryCount}
        onRetry={showRetryButton ? handleRetry : undefined}
        variant="card"
      />
    </div>
  );
}
```

## Styling

The component automatically applies appropriate styling based on the error category:

- **4xx errors**: Yellow/warning theme (border-yellow-300, bg-yellow-50)
- **5xx errors**: Red/error theme (border-red-300, bg-red-50)
- **Unknown errors**: Gray/neutral theme (border-gray-300, bg-gray-50)

## Accessibility

- Uses semantic HTML with proper ARIA roles (`role="alert"`)
- Includes descriptive titles and messages
- Buttons have clear labels and icons
- Color is not the only indicator (icons and text provide context)

## Best Practices

1. **Always provide a user-friendly message**: Avoid technical jargon or stack traces
2. **Include actionable suggestions**: Tell users what they can do next
3. **Use appropriate status codes**: This determines the visual style and behavior
4. **Track consecutive failures**: Show contact support after 3 failures
5. **Clear errors on retry**: The parent component should reset error state when retry succeeds
6. **Provide search suggestions for 404**: Help users find what they're looking for

## Testing

The component includes comprehensive tests covering all requirements:

```bash
npm test -- ErrorMessage.test.tsx
```

Tests validate:
- Different styles for 4xx vs 5xx errors
- Generic friendly messages for 500 errors (Requirement 5.1)
- Search suggestions for 404 errors (Requirement 5.2)
- Retry button for timeout errors (Requirement 5.3)
- Contact support after multiple failures (Requirement 5.4)
- Proper error titles and suggestions
- Inline and card variants
