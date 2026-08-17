/**
 * Cadastro de campos sensíveis LGPD — máscara por nível de usuário.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCapabilities } from "@/hooks/use-capabilities";
import { apiGetLgpdFields, apiPatchLgpdField, apiPostLgpdField } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLgpdPage() {
  const { token } = useAuth();
  const { data: caps } = useCapabilities();
  const qc = useQueryClient();
  const canEdit = Boolean(caps?.isAdmin);
  const [entity, setEntity] = useState("users");
  const [fieldName, setFieldName] = useState("");
  const [label, setLabel] = useState("");
  const [hideOperator, setHideOperator] = useState(false);
  const [hideViewer, setHideViewer] = useState(true);

  const query = useQuery({
    queryKey: ["lgpd-fields", token],
    queryFn: () => apiGetLgpdFields(token!),
    enabled: Boolean(token),
  });

  const patchMut = useMutation({
    mutationFn: (payload: { id: string; body: { hideFromOperator?: boolean; hideFromViewer?: boolean; isActive?: boolean } }) =>
      apiPatchLgpdField(token!, payload.id, payload.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lgpd-fields"] });
      toast.success("Campo LGPD atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiPostLgpdField(token!, {
        entity,
        fieldName,
        label,
        hideFromOperator: hideOperator,
        hideFromViewer: hideViewer,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lgpd-fields"] });
      toast.success("Campo cadastrado");
      setFieldName("");
      setLabel("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campos LGPD</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre campos sensíveis para ocultar o conteúdo de operadores e visualizadores
        </p>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Novo campo</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!fieldName.trim() || !label.trim()) {
                  toast.error("Preencha entidade, campo e rótulo");
                  return;
                }
                createMut.mutate();
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="lgpd-entity">Entidade</Label>
                <Input id="lgpd-entity" value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="users" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lgpd-field">Campo</Label>
                <Input id="lgpd-field" value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lgpd-label">Rótulo</Label>
                <Input id="lgpd-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="E-mail" />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={hideOperator} onCheckedChange={setHideOperator} />
                  Ocultar operador
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={hideViewer} onCheckedChange={setHideViewer} />
                  Ocultar visualizador
                </label>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createMut.isPending}>
                  Cadastrar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Campos cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {query.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>Rótulo</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Visualizador</TableHead>
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.fields ?? []).map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-mono text-xs">{field.entity}</TableCell>
                    <TableCell className="font-mono text-xs">{field.fieldName}</TableCell>
                    <TableCell>{field.label}</TableCell>
                    <TableCell>
                      <Switch
                        checked={field.hideFromOperator}
                        disabled={!canEdit || patchMut.isPending}
                        onCheckedChange={(v) => patchMut.mutate({ id: field.id, body: { hideFromOperator: v } })}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={field.hideFromViewer}
                        disabled={!canEdit || patchMut.isPending}
                        onCheckedChange={(v) => patchMut.mutate({ id: field.id, body: { hideFromViewer: v } })}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={field.isActive}
                        disabled={!canEdit || patchMut.isPending}
                        onCheckedChange={(v) => patchMut.mutate({ id: field.id, body: { isActive: v } })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
