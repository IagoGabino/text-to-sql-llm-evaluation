import { useState } from 'react';
import { Button } from './ui/button';
import { Check, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from './ui/card';

interface SQLCodeDisplayProps {
  sql: string;
  isValid: boolean;
}

const SQLCodeDisplay = ({ sql, isValid }: SQLCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between bg-card border-b border-border px-4 py-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-foreground">Generated SQL</span>
          {isValid ? (
            <div className="flex items-center space-x-1 text-success text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Valid</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-destructive text-xs">
              <XCircle className="w-4 h-4" />
              <span>Invalid</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto max-h-[400px] bg-[#282c34]">
        <pre className="m-0 p-4">
          <code className="text-sm font-mono text-[#abb2bf] leading-relaxed block whitespace-pre">
            {sql}
          </code>
        </pre>
      </div>
    </Card>
  );
};

export default SQLCodeDisplay;
