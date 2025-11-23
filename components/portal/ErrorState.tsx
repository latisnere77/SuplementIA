/**
 * Enhanced Error State Component
 * Provides clear error messages with actionable suggestions
 */

'use client';

import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  suggestions = [] 
}: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Error Icon & Message */}
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-xl font-semibold text-red-900 mb-2">
                No pudimos encontrar información
              </h3>
              <p className="text-sm text-red-700 whitespace-pre-line">
                {error}
              </p>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-red-900 text-center">
                  ¿Quizás buscabas alguno de estos?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/portal/results?q=${encodeURIComponent(suggestion)}`;
                      }}
                      className="bg-white hover:bg-red-100 border-red-300"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={onRetry} 
                variant="default"
                className="bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar de Nuevo
              </Button>
              <Button 
                onClick={() => window.location.href = '/portal'} 
                variant="outline"
                className="border-red-300 hover:bg-red-100"
              >
                <Search className="w-4 h-4 mr-2" />
                Nueva Búsqueda
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-xs text-red-600 bg-white rounded-lg p-3 border border-red-200">
              <p className="font-medium mb-1">💡 Consejos de búsqueda:</p>
              <ul className="text-left space-y-1 max-w-md mx-auto">
                <li>• Verifica la ortografía del suplemento</li>
                <li>• Intenta con el nombre científico (ej: "Withania somnifera" en vez de "ashwagandha")</li>
                <li>• Usa términos en inglés si es posible</li>
                <li>• Evita nombres comerciales o marcas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
