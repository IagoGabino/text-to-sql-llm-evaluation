import { EXAMPLE_QUESTIONS } from '@/types';
import { Button } from './ui/button';
import { Lightbulb } from 'lucide-react';

interface ExampleQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

const ExampleQuestions = ({ onSelect, disabled = false }: ExampleQuestionsProps) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        <Lightbulb className="w-4 h-4 inline mr-1" />
        Example Questions
      </label>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(question)}
            disabled={disabled}
            className="text-xs hover:border-primary hover:text-primary transition-smooth"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ExampleQuestions;
