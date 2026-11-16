import { Cloud, Lock } from 'lucide-react';
import { Badge } from './ui/badge';

interface ProviderBadgeProps {
  type: 'cloud' | 'local';
  className?: string;
}

const ProviderBadge = ({ type, className = '' }: ProviderBadgeProps) => {
  if (type === 'cloud') {
    return (
      <Badge variant="outline" className={`bg-primary/10 text-primary border-primary/20 ${className}`}>
        <Cloud className="w-3 h-3 mr-1" />
        Cloud
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className={`bg-secondary/10 text-secondary border-secondary/20 ${className}`}>
      <Lock className="w-3 h-3 mr-1" />
      Local
    </Badge>
  );
};

export default ProviderBadge;
