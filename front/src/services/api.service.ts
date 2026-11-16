import { QueryRequest, QueryResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async generateAndExecute(request: QueryRequest): Promise<QueryResponse> {
    const response = await fetch(`${this.baseURL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Request failed');
    }

    return response.json();
  }

  async getProviders(): Promise<{
    success: boolean;
    providers: Array<{
      name: string;
      available: boolean;
      models: string[];
    }>;
  }> {
    const response = await fetch(`${this.baseURL}/query/providers`);
    return response.json();
  }

  async getSchema(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseURL}/schema`);
    return response.json();
  }
}

export const apiService = new ApiService(API_BASE_URL);
