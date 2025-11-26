/**
 * ErrorMessage Component Examples
 * Visual examples demonstrating different use cases
 * 
 * This file is for documentation purposes and can be used in Storybook or similar tools
 */

import { ErrorMessage } from './ErrorMessage';

export const examples = {
  // Example 1: 408 Timeout Error with Retry
  timeoutError: (
    <ErrorMessage
      statusCode={408}
      message="La búsqueda está tomando más tiempo del esperado."
      suggestion="Por favor, intenta de nuevo en unos momentos."
      onRetry={() => console.log('Retry clicked')}
      variant="card"
    />
  ),

  // Example 2: 410 Job Expired
  expiredError: (
    <ErrorMessage
      statusCode={410}
      message="El proceso de búsqueda tomó demasiado tiempo y expiró."
      suggestion="Intenta buscar de nuevo con un término más específico."
      onRetry={() => console.log('Retry clicked')}
      variant="card"
    />
  ),

  // Example 3: 404 Not Found with Search Suggestions
  notFoundWithSuggestions: (
    <ErrorMessage
      statusCode={404}
      message="No encontramos el suplemento solicitado."
      suggestion="Verifica el nombre o prueba con alguna de estas alternativas."
      searchSuggestions={['Vitamina C', 'Vitamina D', 'Magnesio', 'Omega-3', 'Zinc', 'Hierro']}
      onSearchSuggestion={(suggestion) => {
        console.log('Search suggestion clicked:', suggestion);
        window.location.href = `/portal/results?q=${encodeURIComponent(suggestion)}`;
      }}
      variant="card"
    />
  ),

  // Example 4: 429 Too Many Requests
  tooManyRequests: (
    <ErrorMessage
      statusCode={429}
      message="Demasiados intentos de consulta."
      suggestion="Por favor, espera unos segundos antes de intentar de nuevo."
      variant="card"
    />
  ),

  // Example 5: 500 Server Error with Multiple Failures
  serverErrorWithMultipleFailures: (
    <ErrorMessage
      statusCode={500}
      message="Hubo un error al procesar tu búsqueda."
      suggestion="Por favor, intenta de nuevo. Si el problema persiste, contáctanos."
      consecutiveFailures={3}
      onRetry={() => console.log('Retry clicked')}
      variant="card"
    />
  ),

  // Example 6: 500 Server Error (First Attempt)
  serverErrorFirstAttempt: (
    <ErrorMessage
      statusCode={500}
      message="Hubo un error al procesar tu búsqueda."
      suggestion="Por favor, intenta de nuevo."
      consecutiveFailures={0}
      onRetry={() => console.log('Retry clicked')}
      variant="card"
    />
  ),

  // Example 7: 400 Validation Error
  validationError: (
    <ErrorMessage
      statusCode={400}
      message="El nombre del suplemento no es válido."
      suggestion="Verifica que el nombre no esté vacío y no contenga caracteres especiales."
      variant="inline"
    />
  ),

  // Example 8: 404 Not Found (No Suggestions)
  notFoundNoSuggestions: (
    <ErrorMessage
      statusCode={404}
      message="No encontramos el proceso de búsqueda solicitado."
      suggestion="Verifica el enlace o inicia una nueva búsqueda."
      variant="card"
    />
  ),

  // Example 9: Generic Error (No Status Code)
  genericError: (
    <ErrorMessage
      message="Hubo un problema al procesar tu solicitud."
      suggestion="Por favor, intenta de nuevo más tarde."
      variant="inline"
    />
  ),

  // Example 10: 503 Service Unavailable
  serviceUnavailable: (
    <ErrorMessage
      statusCode={503}
      message="El servicio no está disponible temporalmente."
      suggestion="Por favor, intenta de nuevo en unos minutos."
      onRetry={() => console.log('Retry clicked')}
      variant="card"
    />
  ),
};

// Example usage in a component
export function ErrorMessageShowcase() {
  return (
    <div className="space-y-8 p-8 bg-gray-100">
      <h1 className="text-3xl font-bold mb-8">ErrorMessage Component Examples</h1>
      
      <section>
        <h2 className="text-2xl font-semibold mb-4">1. Timeout Error (408)</h2>
        {examples.timeoutError}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">2. Job Expired (410)</h2>
        {examples.expiredError}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">3. Not Found with Suggestions (404)</h2>
        {examples.notFoundWithSuggestions}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">4. Too Many Requests (429)</h2>
        {examples.tooManyRequests}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">5. Server Error with Multiple Failures (500)</h2>
        {examples.serverErrorWithMultipleFailures}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">6. Server Error - First Attempt (500)</h2>
        {examples.serverErrorFirstAttempt}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">7. Validation Error (400)</h2>
        {examples.validationError}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">8. Not Found - No Suggestions (404)</h2>
        {examples.notFoundNoSuggestions}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">9. Generic Error (No Status Code)</h2>
        {examples.genericError}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">10. Service Unavailable (503)</h2>
        {examples.serviceUnavailable}
      </section>
    </div>
  );
}
