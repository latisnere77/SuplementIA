/**
 * Dynamic Supplement Detail Page
 * 
 * This page fetches and displays the scientific studies that support a specific
 * supplement for a given health benefit. It leverages the vector search Lambda
 * backend to provide real-time, evidence-based results.
 */
'use client'; // This page will fetch data on the client side

import { useSearchParams, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, AlertTriangle } from 'lucide-react';

// Define a type for the study results for clarity
interface Study {
  title: string;
  summary: string;
  url: string;
  // Add other fields as returned by your vector search API
}

export default function SupplementDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const slug = params.slug as string;
  const benefit = searchParams.get('benefit') || '';

  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supplementName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const benefitName = benefit.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  useEffect(() => {
    if (!slug || !benefit) return;

    const fetchStudies = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // This endpoint is already configured to make a secure, signed request to AWS
        const response = await fetch(`/api/portal/studies?supplementName=${slug}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch studies: ${errorText}`);
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.studies)) {
          setStudies(data.studies);
        } else {
          throw new Error('Invalid data format received from API.');
        }

      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        console.error("Fetch studies error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudies();
  }, [slug, benefit]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href={`/portal/category/${benefit}`} className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a {benefitName}
      </Link>
      
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        Evidencia Científica para <span className="text-blue-600">{supplementName}</span>
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Resultados de la búsqueda para: "{benefitName}"
      </p>

      {isLoading && (
        <div className="flex justify-center items-center py-16">
          <LoaderCircle className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="ml-4 text-lg text-gray-600">Buscando en la literatura científica...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-6 h-6 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Error al Cargar Estudios</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {!isLoading && !error && studies.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-800">No se encontraron estudios</h3>
          <p className="text-gray-500 mt-2">No pudimos encontrar estudios específicos para "{supplementName}" en relación con "{benefitName}".</p>
        </div>
      )}

      {!isLoading && !error && studies.length > 0 && (
        <div className="space-y-6">
          {studies.map((study, index) => (
            <div key={index} className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{study.title}</h3>
              <p className="text-gray-600 mb-4">{study.summary}</p>
              <a 
                href={study.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline font-medium"
              >
                Leer más en PubMed
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
