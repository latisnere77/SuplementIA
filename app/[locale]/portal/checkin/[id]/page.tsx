/**
 * Portal Check-In Page
 * Week 4 & 8 engagement surveys
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import CheckInForm from '@/components/portal/CheckInForm';

export default function CheckInPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recommendationId = params.id as string;
  const weekNumber = parseInt(searchParams.get('week') || '4') as 4 | 8;

  const handleSubmit = async (data: {
    rating: number;
    notes: string;
    efficacy_score?: number;
    satisfaction?: number;
    side_effects?: string[];
  }) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/portal/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: recommendationId,
          week_number: weekNumber,
          ...data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Show success message and redirect
        alert(`Thank you for your feedback! Your Week ${weekNumber} check-in has been recorded.`);
        router.push(`/portal/results?id=${recommendationId}`);
      } else {
        alert(`Error: ${result.error || 'Failed to submit check-in'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <CheckInForm
          recommendationId={recommendationId}
          weekNumber={weekNumber}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}

