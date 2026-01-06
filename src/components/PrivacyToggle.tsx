import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { cn } from '@/lib/utils';

interface PrivacyToggleProps {
  className?: string;
}

export function PrivacyToggle({ className }: PrivacyToggleProps) {
  const { privacyMode, togglePrivacyMode } = usePrivacy();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePrivacyMode}
          className={cn(
            'h-9 w-9 transition-colors',
            privacyMode && 'bg-warning/20 text-warning hover:bg-warning/30',
            className
          )}
        >
          {privacyMode ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {privacyMode ? 'Mostrar informações sensíveis' : 'Ocultar informações sensíveis'}
      </TooltipContent>
    </Tooltip>
  );
}
