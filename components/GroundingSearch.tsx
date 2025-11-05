
import React, { useState, useCallback } from 'react';
import { groundedSearch } from '../services/geminiService';
import { GroundingResult } from '../types';
import LoadingSpinner from './LoadingSpinner';

// Make TypeScript aware of the 'marked' library loaded from the CDN
declare global {
    interface Window { marked: { parse: (md: string) => string; }; }
}

const GroundingSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [useMaps, setUseMaps] = useState(false);
  const [result, setResult] = useState<GroundingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    let location: GeolocationCoordinates | undefined = undefined;
    if (useMaps) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          });
        });
        location = position.coords;
      } catch (err) {
        setError('Could not get your location. Please enable location services and try again.');
        setIsLoading(false);
        return;
      }
    }

    try {
      const searchResult = await groundedSearch(query, useMaps, location);
      setResult(searchResult);
    } catch (err) {
      setError('An error occurred during the search.');
    } finally {
      setIsLoading(false);
    }
  }, [query, useMaps]);
  
  return (
    <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg w-full">
      <h2 className="text-2xl font-bold text-white mb-2">Web Search</h2>
      <p className="text-slate-400 mb-6">Ask questions about current events or places. The AI will use Google Search or Maps for up-to-date information.</p>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input
          type="text"
          className="flex-grow bg-slate-900/70 border-2 border-slate-700 rounded-lg p-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="e.g., 'Find calming parks near me' or 'Latest research on mindfulness'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !query.trim()}
          className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {isLoading ? <LoadingSpinner /> : 'Search'}
        </button>
      </div>
      
      <div className="flex items-center mb-6">
        <input
          id="use-maps"
          type="checkbox"
          checked={useMaps}
          onChange={(e) => setUseMaps(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
        />
        <label htmlFor="use-maps" className="ml-2 block text-sm text-slate-300">
          Use Google Maps for location-based questions (requires location access)
        </label>
      </div>
      
      <div className="flex-grow bg-slate-900/70 rounded-lg overflow-y-auto p-4 border border-slate-700">
        {isLoading && <div className="flex justify-center items-center h-full"><LoadingSpinner className="w-10 h-10" /></div>}
        {error && <p className="text-red-400">{error}</p>}
        {result && (
          <div>
            <div className="prose-styles" dangerouslySetInnerHTML={{ __html: window.marked.parse(result.text) }} />
            {result.sources.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h4 className="text-lg font-semibold text-cyan-400 mb-2">Sources</h4>
                <ul className="list-disc list-inside space-y-1">
                  {result.sources.map((source, index) => (
                    <li key={index}>
                      <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">
                        {source.title || source.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {!isLoading && !result && !error && (
          <p className="text-slate-500">Search results will appear here.</p>
        )}
      </div>
    </div>
  );
};

export default GroundingSearch;