import { Textarea } from './ui/textarea';
import { MessageSquare } from 'lucide-react';

interface QuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const MAX_CHARS = 500;
const MIN_CHARS = 10;

const QuestionInput = ({ value, onChange, disabled }: QuestionInputProps) => {
  const charCount = value.length;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        <MessageSquare className="w-4 h-4 inline mr-1" />
        Your Question
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Digite sua pergunta em linguagem natural... Ex: Quais são os 10 clientes que mais compraram este ano?"
        className="min-h-[120px] resize-none bg-card"
        maxLength={MAX_CHARS}
      />
      <div className="flex justify-between items-center text-xs">
        <span className={charCount < MIN_CHARS ? 'text-warning' : 'text-muted-foreground'}>
          {charCount < MIN_CHARS && `Minimum ${MIN_CHARS} characters required`}
        </span>
        <span className={charCount > MAX_CHARS * 0.9 ? 'text-warning' : 'text-muted-foreground'}>
          {charCount}/{MAX_CHARS}
        </span>
      </div>
    </div>
  );
};

export default QuestionInput;
