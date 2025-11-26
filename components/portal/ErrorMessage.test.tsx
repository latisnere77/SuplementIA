/**
 * Tests for ErrorMessage Component
 * 
 * Validates:
 * - 5.1: Generic friendly message for 500 errors (no technical details)
 * - 5.2: Alternative search suggestions for 404 errors
 * - 5.3: Retry button for timeout errors (408)
 * - 5.4: Contact support after multiple consecutive errors
 * - Different styles for 4xx vs 5xx errors
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage Component', () => {
  describe('Error Categories and Styling', () => {
    it('should display 4xx errors with warning style', () => {
      render(
        <ErrorMessage
          statusCode={404}
          message="Not found"
        />
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-yellow-300', 'bg-yellow-50');
    });

    it('should display 5xx errors with error style', () => {
      render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
        />
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-red-300', 'bg-red-50');
    });

    it('should display unknown errors with neutral style', () => {
      render(
        <ErrorMessage
          message="Unknown error"
        />
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-gray-300', 'bg-gray-50');
    });
  });

  describe('Requirement 5.1: Generic friendly message for 500 errors', () => {
    it('should display user-friendly message for 500 errors', () => {
      render(
        <ErrorMessage
          statusCode={500}
          message="Hubo un error al procesar tu búsqueda."
        />
      );
      
      expect(screen.getByText('Hubo un error al procesar tu búsqueda.')).toBeInTheDocument();
      expect(screen.getByText('Error del servidor')).toBeInTheDocument();
    });

    it('should not display technical details in error message', () => {
      const technicalMessage = 'Hubo un error al procesar tu búsqueda.';
      render(
        <ErrorMessage
          statusCode={500}
          message={technicalMessage}
        />
      );
      
      // Should show friendly message, not technical stack traces or internal errors
      expect(screen.getByText(technicalMessage)).toBeInTheDocument();
      expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/internal error/i)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 5.2: Alternative search suggestions for 404 errors', () => {
    it('should display search suggestions for 404 errors', () => {
      const suggestions = ['Vitamina C', 'Vitamina D', 'Magnesio'];
      const onSearchSuggestion = jest.fn();
      
      render(
        <ErrorMessage
          statusCode={404}
          message="No encontrado"
          searchSuggestions={suggestions}
          onSearchSuggestion={onSearchSuggestion}
        />
      );
      
      expect(screen.getByText('¿Quizás buscabas alguno de estos?')).toBeInTheDocument();
      
      suggestions.forEach(suggestion => {
        expect(screen.getByText(suggestion)).toBeInTheDocument();
      });
    });

    it('should call onSearchSuggestion when suggestion is clicked', () => {
      const suggestions = ['Vitamina C'];
      const onSearchSuggestion = jest.fn();
      
      render(
        <ErrorMessage
          statusCode={404}
          message="No encontrado"
          searchSuggestions={suggestions}
          onSearchSuggestion={onSearchSuggestion}
        />
      );
      
      const suggestionButton = screen.getByText('Vitamina C');
      fireEvent.click(suggestionButton);
      
      expect(onSearchSuggestion).toHaveBeenCalledWith('Vitamina C');
    });

    it('should not display search suggestions for non-404 errors', () => {
      const suggestions = ['Vitamina C'];
      
      render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
          searchSuggestions={suggestions}
        />
      );
      
      expect(screen.queryByText('¿Quizás buscabas alguno de estos?')).not.toBeInTheDocument();
    });

    it('should not display search suggestions section if no suggestions provided', () => {
      render(
        <ErrorMessage
          statusCode={404}
          message="No encontrado"
          searchSuggestions={[]}
        />
      );
      
      expect(screen.queryByText('¿Quizás buscabas alguno de estos?')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 5.3: Retry button for timeout errors', () => {
    it('should display retry button for 408 timeout errors', () => {
      const onRetry = jest.fn();
      
      render(
        <ErrorMessage
          statusCode={408}
          message="Timeout"
          onRetry={onRetry}
        />
      );
      
      const retryButton = screen.getByText('Intentar de nuevo');
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = jest.fn();
      
      render(
        <ErrorMessage
          statusCode={408}
          message="Timeout"
          onRetry={onRetry}
        />
      );
      
      const retryButton = screen.getByText('Intentar de nuevo');
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should display retry button for 5xx errors when onRetry is provided', () => {
      const onRetry = jest.fn();
      
      render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
          onRetry={onRetry}
        />
      );
      
      expect(screen.getByText('Intentar de nuevo')).toBeInTheDocument();
    });

    it('should not display retry button for 4xx errors (except 408)', () => {
      const onRetry = jest.fn();
      
      render(
        <ErrorMessage
          statusCode={400}
          message="Bad request"
          onRetry={onRetry}
        />
      );
      
      expect(screen.queryByText('Intentar de nuevo')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 5.4: Contact support after multiple consecutive errors', () => {
    it('should display contact support button after 3 consecutive failures', () => {
      render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
          consecutiveFailures={3}
        />
      );
      
      expect(screen.getByText('Contactar soporte')).toBeInTheDocument();
      expect(screen.getByText(/múltiples intentos fallidos/i)).toBeInTheDocument();
    });

    it('should not display contact support button with fewer than 3 failures', () => {
      render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
          consecutiveFailures={2}
        />
      );
      
      expect(screen.queryByText('Contactar soporte')).not.toBeInTheDocument();
    });

    it('should not display contact support button with 0 failures', () => {
      render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
          consecutiveFailures={0}
        />
      );
      
      expect(screen.queryByText('Contactar soporte')).not.toBeInTheDocument();
    });
  });

  describe('Error Titles', () => {
    it('should display correct title for 400 Bad Request', () => {
      render(
        <ErrorMessage
          statusCode={400}
          message="Invalid request"
        />
      );
      
      expect(screen.getByText('Solicitud inválida')).toBeInTheDocument();
    });

    it('should display correct title for 404 Not Found', () => {
      render(
        <ErrorMessage
          statusCode={404}
          message="Not found"
        />
      );
      
      expect(screen.getByText('No encontrado')).toBeInTheDocument();
    });

    it('should display correct title for 408 Timeout', () => {
      render(
        <ErrorMessage
          statusCode={408}
          message="Timeout"
        />
      );
      
      expect(screen.getByText('Tiempo de espera agotado')).toBeInTheDocument();
    });

    it('should display correct title for 410 Gone', () => {
      render(
        <ErrorMessage
          statusCode={410}
          message="Expired"
        />
      );
      
      expect(screen.getByText('Proceso expirado')).toBeInTheDocument();
    });

    it('should display correct title for 429 Too Many Requests', () => {
      render(
        <ErrorMessage
          statusCode={429}
          message="Too many requests"
        />
      );
      
      expect(screen.getByText('Demasiados intentos')).toBeInTheDocument();
    });

    it('should display correct title for 500 Internal Server Error', () => {
      render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
        />
      );
      
      expect(screen.getByText('Error del servidor')).toBeInTheDocument();
    });
  });

  describe('Suggestions', () => {
    it('should display actionable suggestion when provided', () => {
      render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
          suggestion="Por favor, intenta de nuevo más tarde."
        />
      );
      
      expect(screen.getByText(/Por favor, intenta de nuevo más tarde/i)).toBeInTheDocument();
    });

    it('should not display suggestion section when not provided', () => {
      render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
        />
      );
      
      // Should only have the main message, no suggestion
      const alert = screen.getByRole('alert');
      expect(alert.textContent).not.toContain('💡');
    });
  });

  describe('Variants', () => {
    it('should render inline variant by default', () => {
      const { container } = render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
        />
      );
      
      // Inline variant should not have the wrapper div with max-w-2xl
      expect(container.querySelector('.max-w-2xl')).not.toBeInTheDocument();
    });

    it('should render card variant with wrapper', () => {
      const { container } = render(
        <ErrorMessage
          statusCode={500}
          message="Server error"
          variant="card"
        />
      );
      
      // Card variant should have the wrapper div with max-w-2xl
      expect(container.querySelector('.max-w-2xl')).toBeInTheDocument();
    });
  });
});
