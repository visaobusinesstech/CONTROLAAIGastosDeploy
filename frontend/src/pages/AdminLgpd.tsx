/**
 * Cadastro de campos sensíveis LGPD — máscara por nível de usuário.
 *
 * Papel no sistema: Página React Router — UI autenticada consumindo api.ts e auth.tsx.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
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
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: caps } = useCapabilities();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  const canEdit = Boolean(caps?.isAdmin);
  const [entity, setEntity] = useState("users");
  const [fieldName, setFieldName] = useState("");
  const [label, setLabel] = useState("");
  const [hideOperator, setHideOperator] = useState(false);
  const [hideViewer, setHideViewer] = useState(true);
  // Consulta à API com cache (React Query)
  const query = useQuery({
    queryKey: ["lgpd-fields", token],
    queryFn: () => apiGetLgpdFields(token!),
    enabled: Boolean(token),
  });
  // Mutação na API (criar/editar/excluir)
  const patchMut = useMutation({
    mutationFn: (payload: { id: string; body: { hideFromOperator?: boolean; hideFromViewer?: boolean; isActive?: boolean } }) =>
      apiPatchLgpdField(token!, payload.id, payload.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lgpd-fields"] });
      // Exibe notificação temporária (toast) na tela
      toast.success("Campo LGPD atualizado");
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  // Mutação na API (criar/editar/excluir)
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
      // Exibe notificação temporária (toast) na tela
      toast.success("Campo cadastrado");
      setFieldName("");
      setLabel("");
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    // Tag HTML na interface
    <div className="space-y-6">
      // Tag HTML na interface
      <div>
        // Tag HTML na interface
        <h1 className="text-2xl font-bold">Campos LGPD</h1>
        // Tag HTML na interface
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre campos sensíveis para ocultar o conteúdo de operadores e visualizadores
        // Tag HTML na interface
        </p>
      // Tag HTML na interface
      </div>
      {canEdit && (
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader>
            // Elemento/componente React na tela
            <CardTitle>Novo campo</CardTitle>
          // Elemento/componente React na tela
          </CardHeader>
          // Elemento/componente React na tela
          <CardContent>
            // Tag HTML na interface
            <form
              // Classes CSS Tailwind — controla aparência visual
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
              // Envia formulário quando usuário pressiona Enter ou botão
              onSubmit={(e) => {
                e.preventDefault();
                if (!fieldName.trim() || !label.trim()) {
                  // Exibe notificação temporária (toast) na tela
                  toast.error("Preencha entidade, campo e rótulo");
                  return;
                }
                createMut.mutate();
              }}
            >
              // Tag HTML na interface
              <div className="space-y-1">
                // Elemento/componente React na tela
                <Label htmlFor="lgpd-entity">Entidade</Label>
                // Elemento/componente React na tela
                <Input id="lgpd-entity" value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="users" />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="space-y-1">
                // Elemento/componente React na tela
                <Label htmlFor="lgpd-field">Campo</Label>
                // Elemento/componente React na tela
                <Input id="lgpd-field" value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="email" />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="space-y-1">
                // Elemento/componente React na tela
                <Label htmlFor="lgpd-label">Rótulo</Label>
                // Elemento/componente React na tela
                <Input id="lgpd-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="E-mail" />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="flex items-end gap-4">
                // Tag HTML na interface
                <label className="flex items-center gap-2 text-sm">
                  // Elemento/componente React na tela
                  <Switch checked={hideOperator} onCheckedChange={setHideOperator} />
                  Ocultar operador
                // Tag HTML na interface
                </label>
                // Tag HTML na interface
                <label className="flex items-center gap-2 text-sm">
                  // Elemento/componente React na tela
                  <Switch checked={hideViewer} onCheckedChange={setHideViewer} />
                  Ocultar visualizador
                // Tag HTML na interface
                </label>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="flex items-end">
                // Elemento/componente React na tela
                <Button type="submit" disabled={createMut.isPending}>
                  Cadastrar
                // Elemento/componente React na tela
                </Button>
              // Tag HTML na interface
              </div>
            // Tag HTML na interface
            </form>
          // Elemento/componente React na tela
          </CardContent>
        // Elemento/componente React na tela
        </Card>
      )}
      // Elemento/componente React na tela
      <Card>
        // Elemento/componente React na tela
        <CardHeader>
          // Elemento/componente React na tela
          <CardTitle>Campos cadastrados</CardTitle>
        // Elemento/componente React na tela
        </CardHeader>
        // Elemento/componente React na tela
        <CardContent className="overflow-x-auto p-0">
          {query.isLoading ? (
            // Tag HTML na interface
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            // Elemento/componente React na tela
            <Table>
              // Elemento/componente React na tela
              <TableHeader>
                // Elemento/componente React na tela
                <TableRow>
                  // Elemento/componente React na tela
                  <TableHead>Entidade</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Campo</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Rótulo</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Operador</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Visualizador</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Ativo</TableHead>
                // Elemento/componente React na tela
                </TableRow>
              // Elemento/componente React na tela
              </TableHeader>
              // Elemento/componente React na tela
              <TableBody>
                // Percorre lista e renderiza um item para cada elemento
                {(query.data?.fields ?? []).map((field) => (
                  // Elemento/componente React na tela
                  <TableRow key={field.id}>
                    // Elemento/componente React na tela
                    <TableCell className="font-mono text-xs">{field.entity}</TableCell>
                    // Elemento/componente React na tela
                    <TableCell className="font-mono text-xs">{field.fieldName}</TableCell>
                    // Elemento/componente React na tela
                    <TableCell>{field.label}</TableCell>
                    // Elemento/componente React na tela
                    <TableCell>
                      // Elemento/componente React na tela
                      <Switch
                        checked={field.hideFromOperator}
                        // Desabilita botão/campo (ex.: durante envio)
                        disabled={!canEdit || patchMut.isPending}
                        onCheckedChange={(v) => patchMut.mutate({ id: field.id, body: { hideFromOperator: v } })}
                      />
                    // Elemento/componente React na tela
                    </TableCell>
                    // Elemento/componente React na tela
                    <TableCell>
                      // Elemento/componente React na tela
                      <Switch
                        checked={field.hideFromViewer}
                        // Desabilita botão/campo (ex.: durante envio)
                        disabled={!canEdit || patchMut.isPending}
                        onCheckedChange={(v) => patchMut.mutate({ id: field.id, body: { hideFromViewer: v } })}
                      />
                    // Elemento/componente React na tela
                    </TableCell>
                    // Elemento/componente React na tela
                    <TableCell>
                      // Elemento/componente React na tela
                      <Switch
                        checked={field.isActive}
                        // Desabilita botão/campo (ex.: durante envio)
                        disabled={!canEdit || patchMut.isPending}
                        onCheckedChange={(v) => patchMut.mutate({ id: field.id, body: { isActive: v } })}
                      />
                    // Elemento/componente React na tela
                    </TableCell>
                  // Elemento/componente React na tela
                  </TableRow>
                ))}
              // Elemento/componente React na tela
              </TableBody>
            // Elemento/componente React na tela
            </Table>
          )}
        // Elemento/componente React na tela
        </CardContent>
      // Elemento/componente React na tela
      </Card>
    // Tag HTML na interface
    </div>
  );
}
