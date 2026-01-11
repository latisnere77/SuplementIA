/**
 * Streaming Test Page
 * 
 * Test page for Server-Sent Events implementation
 * Demonstrates real-time progress updates
 */

'use client';

import { useState } from 'react';
import { StreamingResults } from '@/components/portal/StreamingResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function StreamTestPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
      setResult(null);
    }
  };

  const handleComplete = (data: any) => {
    console.log('Search complete:', data);
    setResult(data);
  };

  const handleError = (error: string) => {
    console.error('Search error:', error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Streaming Search Test</h1>
          <p className="text-muted-foreground">
            Real-time progress updates with Server-Sent Events
          </p>
        </div>

        {/* Search Box */}
        <Card>
          <CardHeader>
            <CardTitle>Search for a Supplement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., saw palmetto, astragalus, rhodiola..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Streaming Results */}
        {activeSearch && (
          <StreamingResults
            supplementName={activeSearch}
            onComplete={handleComplete}
            onError={handleError}
          />
        )}

        {/* Debug Info */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
