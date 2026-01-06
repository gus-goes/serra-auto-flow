import { usePrivacy } from '@/contexts/PrivacyContext';
import { cn } from '@/lib/utils';

interface PrivacyMaskProps {
  children: React.ReactNode;
  type?: 'blur' | 'hide' | 'placeholder';
  placeholder?: string;
  className?: string;
}

export function PrivacyMask({ 
  children, 
  type = 'blur', 
  placeholder = '•••••',
  className 
}: PrivacyMaskProps) {
  const { privacyMode } = usePrivacy();

  if (!privacyMode) {
    return <>{children}</>;
  }

  if (type === 'hide') {
    return <span className={cn('text-muted-foreground', className)}>{placeholder}</span>;
  }

  if (type === 'placeholder') {
    return <span className={cn('text-muted-foreground italic', className)}>{placeholder}</span>;
  }

  // blur type
  return (
    <span className={cn('blur-sm select-none', className)}>
      {children}
    </span>
  );
}

export function PrivacyCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const { privacyMode } = usePrivacy();

  if (!privacyMode) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative', className)}>
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Modo privacidade ativo</p>
        </div>
      </div>
    </div>
  );
}
