import { Provider, MODELS } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ProviderBadge from './ProviderBadge';
import { Cpu } from 'lucide-react';

interface ModelSelectorProps {
  selectedProvider: Provider;
  selectedModel: string;
  onProviderChange: (provider: Provider) => void;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  ollama: 'Ollama (Local)',
  openrouter: 'OpenRouter'
};

const ModelSelector = ({ 
  selectedProvider, 
  selectedModel, 
  onProviderChange, 
  onModelChange,
  disabled = false
}: ModelSelectorProps) => {
  const models = MODELS[selectedProvider];
  const selectedModelData = models.find(m => m.value === selectedModel);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          <Cpu className="w-4 h-4 inline mr-1" />
          AI Provider
        </label>
        <Select 
          value={selectedProvider} 
          onValueChange={(value) => {
            onProviderChange(value as Provider);
            // Auto-select first model of new provider
            const firstModel = MODELS[value as Provider][0];
            onModelChange(firstModel.value);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {(Object.keys(MODELS) as Provider[]).map(provider => {
              const badge = MODELS[provider][0].badge;
              return (
                <SelectItem key={provider} value={provider}>
                  <div className="flex items-center space-x-2">
                    <span>{PROVIDER_LABELS[provider]}</span>
                    <ProviderBadge type={badge} />
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Model
        </label>
        <Select value={selectedModel} onValueChange={onModelChange} disabled={disabled}>
          <SelectTrigger className="w-full bg-card">
            <div className="flex items-center justify-between w-full">
              <SelectValue />
              {selectedModelData && <ProviderBadge type={selectedModelData.badge} />}
            </div>
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {models.map(model => (
              <SelectItem key={model.value} value={model.value}>
                <div className="flex items-center justify-between w-full">
                  <span>{model.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ModelSelector;
