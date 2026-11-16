import { useState } from 'react';
import { QueryRequest, QueryResponse } from '@/types';
import { apiService } from '@/services/api.service';

interface UseQueryResult {
  executeQuery: (request: QueryRequest) => Promise<void>;
  result: QueryResponse | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export const useQuery = (): UseQueryResult => {
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async (request: QueryRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.generateAndExecute(request);
      setResult(response);
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)) || 'An error occurred';
      console.error('Query execution failed:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  return { executeQuery, result, isLoading, error, reset };
};
