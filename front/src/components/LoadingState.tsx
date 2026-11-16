import { Loader2 } from 'lucide-react';
import { Card } from './ui/card';

interface LoadingStateProps {
  message?: string;
}

const LoadingState = ({ message = 'Generating SQL...' }: LoadingStateProps) => {
  return (
    <Card className="p-8 text-center animate-fade-in">
      <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
      <p className="text-lg font-medium text-foreground mb-2">{message}</p>
      <p className="text-sm text-muted-foreground">
        This may take a few seconds depending on the model
      </p>
    </Card>
  );
};

export default LoadingState;
