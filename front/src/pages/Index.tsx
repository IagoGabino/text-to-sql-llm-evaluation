import { useState } from 'react';
import { Provider, MODELS } from '@/types';
import { useQuery } from '@/hooks/useQuery';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ModelSelector from '@/components/ModelSelector';
import QuestionInput from '@/components/QuestionInput';
import ExampleQuestions from '@/components/ExampleQuestions';
import SQLCodeDisplay from '@/components/SQLCodeDisplay';
import MetadataCard from '@/components/MetadataCard';
import ResultsTable from '@/components/ResultsTable';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingState from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

const Index = () => {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openrouter');
  const [selectedModel, setSelectedModel] = useState('');
  const [question, setQuestion] = useState('');
  
  const { executeQuery, result, isLoading, error, reset } = useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (question.length < 10) return;

    await executeQuery({
      question,
      model: selectedModel,
      provider: selectedProvider
    });
  };

  const handleExampleSelect = (exampleQuestion: string) => {
    setQuestion(exampleQuestion);
  };

  const selectedModelData = MODELS[selectedProvider].find(m => m.value === selectedModel);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <HeroSection />

          {/* Query Form */}
          <Card className="p-6 mb-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <ModelSelector
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onProviderChange={setSelectedProvider}
                onModelChange={setSelectedModel}
                disabled={isLoading}
              />

              <QuestionInput
                value={question}
                onChange={setQuestion}
                disabled={isLoading}
              />

              <ExampleQuestions
                onSelect={handleExampleSelect}
                disabled={isLoading}
              />

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-glow"
                size="lg"
                disabled={isLoading || question.length < 10 || !selectedModel}
              >
                {isLoading ? (
                  <>Generating SQL...</>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate SQL
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Loading State */}
          {isLoading && <LoadingState />}

          {/* Error State */}
          {error && !isLoading && (
            <ErrorMessage
              type="network"
              message={error}
              onRetry={reset}
            />
          )}

          {/* Results Display */}
          {result && !isLoading && !error && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SQLCodeDisplay
                    sql={result.generatedSQL}
                    isValid={result.success}
                  />
                </div>
                <div className="lg:col-span-1">
                  <MetadataCard
                    model={result.metadata.model}
                    provider={selectedProvider}
                    responseTime={result.metadata.responseTime || result.executionTime}
                    executionTime={result.executionTime}
                    costEstimate={result.metadata.costEstimate}
                    isValid={result.success}
                    rowCount={result.rowCount}
                    badge={selectedModelData?.badge || 'cloud'}
                    retryAttempt={result.metadata.retryAttempt}
                    wasRetried={result.metadata.wasRetried}
                  />
                </div>
              </div>

              {result.executionResults && result.executionResults.length > 0 && (
                <ResultsTable
                  data={result.executionResults}
                  columns={Object.keys(result.executionResults[0])}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
