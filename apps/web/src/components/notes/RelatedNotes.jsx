import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Link2, Sparkles, Trash2 } from "lucide-react";
import { useDeleteRelation, useRelatedNotes, useUpdateRelation } from '@/api/useRelations';

export default function RelatedNotes({ currentNote }) {
  const { data: relationsResponse = { data: [] } } = useRelatedNotes(currentNote?.id);
  const updateRelationMutation = useUpdateRelation();
  const deleteRelationMutation = useDeleteRelation();
  const relations = relationsResponse?.data || [];

  if (!currentNote || relations.length === 0) {
    return null;
  }

  const explicitRelations = relations.filter((relation) => relation.relationType !== 'semantic_suggested');
  const suggestedRelations = relations.filter((relation) => relation.relationType === 'semantic_suggested');

  return (
    <div className="space-y-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-[#262b3a]">
      {suggestedRelations.length > 0 && (
        <Card className="p-4 bg-white dark:bg-[#31384a] border-amber-200 dark:border-amber-900/70">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100">Sugestoes de relacao</h3>
            <Badge variant="secondary" className="ml-auto">{suggestedRelations.length}</Badge>
          </div>

          <div className="space-y-2">
            {suggestedRelations.map((relation) => (
              <div key={relation.relationId} className="rounded-lg border border-amber-100 dark:border-amber-900/60 p-3 bg-amber-50/60 dark:bg-amber-900/15">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{relation.note?.title || 'Sem titulo'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {relation.context || relation.note?.content || 'Sugestao por proximidade textual'}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{Math.round((relation.strength || 0) * 100)}%</Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRelationMutation.mutate({ id: relation.relationId, data: { relationType: 'semantic' } })}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteRelationMutation.mutate(relation.relationId)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Descartar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {explicitRelations.length > 0 && (
        <Card className="p-4 bg-white dark:bg-[#31384a] border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-indigo-500" />
            <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100">Relacionamentos ativos</h3>
            <Badge variant="secondary" className="ml-auto">{explicitRelations.length}</Badge>
          </div>

          <div className="space-y-2">
            {explicitRelations.map((relation) => (
              <div key={relation.relationId} className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{relation.note?.title || 'Sem titulo'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {relation.relationType} • {Math.round((relation.strength || 0) * 100)}%
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => deleteRelationMutation.mutate(relation.relationId)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
