import { useActivityLogs, actionLabels, entityLabels, type ActionType, type EntityType } from '@/hooks/useActivityLogs';
import { useProfiles } from '@/hooks/useProfiles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Activity, 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Ban,
  FileText,
  PenTool,
  ArrowRightLeft,
  LogIn,
  LogOut as LogOutIcon
} from 'lucide-react';

const actionIcons: Record<ActionType, React.ReactNode> = {
  create: <Plus className="h-3 w-3" />,
  update: <Pencil className="h-3 w-3" />,
  delete: <Trash2 className="h-3 w-3" />,
  approve: <CheckCircle className="h-3 w-3" />,
  reject: <XCircle className="h-3 w-3" />,
  cancel: <Ban className="h-3 w-3" />,
  generate_pdf: <FileText className="h-3 w-3" />,
  sign: <PenTool className="h-3 w-3" />,
  convert: <ArrowRightLeft className="h-3 w-3" />,
  login: <LogIn className="h-3 w-3" />,
  logout: <LogOutIcon className="h-3 w-3" />,
};

const actionColors: Record<ActionType, string> = {
  create: 'bg-success/10 text-success border-success/20',
  update: 'bg-info/10 text-info border-info/20',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  approve: 'bg-success/10 text-success border-success/20',
  reject: 'bg-destructive/10 text-destructive border-destructive/20',
  cancel: 'bg-warning/10 text-warning border-warning/20',
  generate_pdf: 'bg-primary/10 text-primary border-primary/20',
  sign: 'bg-primary/10 text-primary border-primary/20',
  convert: 'bg-success/10 text-success border-success/20',
  login: 'bg-muted text-muted-foreground border-border',
  logout: 'bg-muted text-muted-foreground border-border',
};

interface ActivityFeedProps {
  limit?: number;
  entityType?: EntityType;
  entityId?: string;
  showHeader?: boolean;
  maxHeight?: string;
}

export function ActivityFeed({ 
  limit = 20, 
  entityType,
  entityId,
  showHeader = true,
  maxHeight = '400px'
}: ActivityFeedProps) {
  const { data: logs = [], isLoading } = useActivityLogs({ limit, entityType, entityId });
  const { data: profiles = [] } = useProfiles();

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Sistema';
    const profile = profiles.find(p => p.id === userId);
    return profile?.name || 'Usuário';
  };

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividades Recentes
          </CardTitle>
          <CardDescription>
            Histórico de ações realizadas no sistema
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma atividade registrada</p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-3 pr-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-1.5 rounded-full border ${actionColors[log.action as ActionType] || 'bg-muted'}`}>
                    {actionIcons[log.action as ActionType] || <Activity className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {getUserName(log.user_id)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {actionLabels[log.action as ActionType] || log.action}
                      </Badge>
                      {log.entity_type && (
                        <span className="text-xs text-muted-foreground">
                          {entityLabels[log.entity_type as EntityType] || log.entity_type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {log.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
