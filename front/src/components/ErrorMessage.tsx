import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';

interface ErrorMessageProps {
  type: 'validation' | 'llm' | 'execution' | 'network';
  message: string;
  details?: string;
  onRetry?: () => void;
}

const ERROR_TITLES = {
  validation: 'Validation Error',
  llm: 'LLM Generation Error',
  execution: 'SQL Execution Error',
  network: 'Network Error'
};

const ErrorMessage = ({ type, message, details, onRetry }: ErrorMessageProps) => {
  return (
    <Alert variant="destructive" className="animate-fade-in">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-semibold">{ERROR_TITLES[type]}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="font-medium">{message}</p>
        {details && (
          <p className="text-sm mt-2 text-destructive/80">{details}</p>
        )}
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="mt-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ErrorMessage;
