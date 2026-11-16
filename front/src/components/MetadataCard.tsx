import { Card } from './ui/card';
import { Zap, Settings, Database, DollarSign, Lock, AlertTriangle, Clock } from 'lucide-react';
import ProviderBadge from './ProviderBadge';
import { Provider } from '@/types';

interface MetadataCardProps {
  model: string;
  provider: Provider;
  responseTime: number;
  executionTime?: number;
  costEstimate?: number;
  isValid: boolean;
  rowCount?: number;
  badge: 'cloud' | 'local';
  retryAttempt?: number;
  wasRetried?: boolean;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  openrouter: 'OpenRouter',
  ollama: 'Ollama'
};

const MetadataCard = ({
  model,
  provider,
  responseTime,
  executionTime,
  costEstimate,
  rowCount,
  badge,
  retryAttempt,
  wasRetried
}: MetadataCardProps) => {
  return (
    <Card className="p-6 space-y-6 animate-fade-in lg:sticky lg:top-24">
      {/* Model Info */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Model Information</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Provider</span>
            <span className="text-sm font-medium text-foreground">{PROVIDER_LABELS[provider]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Model</span>
            <span className="text-sm font-medium text-foreground">{model}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Type</span>
            <ProviderBadge type={badge} />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Performance Metrics</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Response Time</p>
              <p className="text-sm font-semibold text-foreground">{responseTime}ms</p>
            </div>
          </div>

          {executionTime !== undefined && (
            <div className="flex items-center space-x-3">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Clock className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Execution Time</p>
                <p className="text-sm font-semibold text-foreground">{executionTime}ms</p>
              </div>
            </div>
          )}

          {rowCount !== undefined && (
            <div className="flex items-center space-x-3">
              <div className="bg-secondary/10 p-2 rounded-lg">
                <Database className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Rows Returned</p>
                <p className="text-sm font-semibold text-foreground">{rowCount}</p>
              </div>
            </div>
          )}

          {wasRetried && retryAttempt && (
            <div className="flex items-center space-x-3">
              <div className="bg-warning/10 p-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Generation Attempts</p>
                <p className="text-sm font-semibold text-foreground">{retryAttempt} attempt{retryAttempt > 1 ? 's' : ''}</p>
                <p className="text-xs text-warning mt-0.5">Succeeded after retry</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cost & Privacy */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Cost & Privacy</h3>
        <div className="space-y-3">
          {badge === 'cloud' ? (
            <>
              {costEstimate !== undefined && (
                <div className="flex items-center space-x-3">
                  <div className="bg-warning/10 p-2 rounded-lg">
                    <DollarSign className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Estimated Cost</p>
                    <p className="text-sm font-semibold text-foreground">${costEstimate.toFixed(7)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="bg-destructive/10 p-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Privacy</p>
                  <p className="text-xs text-destructive">Data sent to cloud</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="bg-secondary/10 p-2 rounded-lg">
                <Lock className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Privacy</p>
                <p className="text-sm font-semibold text-secondary">100% Private</p>
                <p className="text-xs text-muted-foreground mt-1">All processing local</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MetadataCard;
