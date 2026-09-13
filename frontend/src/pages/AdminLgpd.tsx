/**
 * Cadastro de campos sensíveis LGPD — máscara por nível de usuário.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useState } from "react";
// Importa funções/componentes de @tanstack/react-query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Importa funções/componentes de sonner
import { toast } from "sonner";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/hooks/use-capabilities
import { useCapabilities } from "@/hooks/use-capabilities";
// Importa funções/componentes de @/lib/api
import { apiGetLgpdFields, apiPatchLgpdField, apiPostLgpdField } from "@/lib/api";
// Importa funções/componentes de @/components/ui/card
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Importa funções/componentes de @/components/ui/table
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Importa funções/componentes de @/components/ui/switch
import { Switch } from "@/components/ui/switch";
// Importa funções/componentes de @/components/ui/button
import { Button } from "@/components/ui/button";
// Importa funções/componentes de @/components/ui/input
import { Input } from "@/components/ui/input";
// Importa funções/componentes de @/components/ui/label
import { Label } from "@/components/ui/label";

// Exporta como padrão do módulo (import default)
export default function AdminLgpdPage() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: caps } = useCapabilities();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  // Constante local
  const canEdit = Boolean(caps?.isAdmin);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [entity, setEntity] = useState("users");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [fieldName, setFieldName] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [label, setLabel] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [hideOperator, setHideOperator] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [hideViewer, setHideViewer] = useState(true);

  // Consulta à API com cache (React Query)
  const query = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["lgpd-fields", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetLgpdFields(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
  });

  // Mutação na API (criar/editar/excluir)
  const patchMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: (payload: { id: string; body: { hideFromOperator?: boolean; hideFromViewer?: boolean; isActive?: boolean } }) =>
      // Instrução do fluxo — parte da lógica de negócio ou interface
      apiPatchLgpdField(token!, payload.id, payload.body),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["lgpd-fields"] });
      // Exibe notificação temporária (toast) na tela
      toast.success("Campo LGPD atualizado");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutação na API (criar/editar/excluir)
  const createMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: () =>
      // Instrução do fluxo — parte da lógica de negócio ou interface
      apiPostLgpdField(token!, {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        entity,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        fieldName,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        label,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        hideFromOperator: hideOperator,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        hideFromViewer: hideViewer,
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      }),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["lgpd-fields"] });
      // Exibe notificação temporária (toast) na tela
      toast.success("Campo cadastrado");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setFieldName("");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setLabel("");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="space-y-6">
      // Tag HTML na interface
      <div>
        // Tag HTML na interface
        <h1 className="text-2xl font-bold">Campos LGPD</h1>
        // Tag HTML na interface
        <p className="mt-1 text-sm text-muted-foreground">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Cadastre campos sensíveis para ocultar o conteúdo de operadores e visualizadores
        // Tag HTML na interface
        </p>
      // Tag HTML na interface
      </div>

      // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                e.preventDefault();
                // Condição — executa bloco só se verdadeira
                if (!fieldName.trim() || !label.trim()) {
                  // Exibe notificação temporária (toast) na tela
                  toast.error("Preencha entidade, campo e rótulo");
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  return;
                }
                // Instrução do fluxo — parte da lógica de negócio ou interface
                createMut.mutate();
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              }}
            // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Ocultar operador
                // Tag HTML na interface
                </label>
                // Tag HTML na interface
                <label className="flex items-center gap-2 text-sm">
                  // Elemento/componente React na tela
                  <Switch checked={hideViewer} onCheckedChange={setHideViewer} />
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Ocultar visualizador
                // Tag HTML na interface
                </label>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="flex items-end">
                // Elemento/componente React na tela
                <Button type="submit" disabled={createMut.isPending}>
                  // Instrução do fluxo — parte da lógica de negócio ou interface
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
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {query.isLoading ? (
            // Tag HTML na interface
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        checked={field.hideFromOperator}
                        // Desabilita botão/campo (ex.: durante envio)
                        disabled={!canEdit || patchMut.isPending}
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        onCheckedChange={(v) => patchMut.mutate({ id: field.id, body: { hideFromOperator: v } })}
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      />
                    // Elemento/componente React na tela
                    </TableCell>
                    // Elemento/componente React na tela
                    <TableCell>
                      // Elemento/componente React na tela
                      <Switch
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        checked={field.hideFromViewer}
                        // Desabilita botão/campo (ex.: durante envio)
                        disabled={!canEdit || patchMut.isPending}
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        onCheckedChange={(v) => patchMut.mutate({ id: field.id, body: { hideFromViewer: v } })}
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      />
                    // Elemento/componente React na tela
                    </TableCell>
                    // Elemento/componente React na tela
                    <TableCell>
                      // Elemento/componente React na tela
                      <Switch
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        checked={field.isActive}
                        // Desabilita botão/campo (ex.: durante envio)
                        disabled={!canEdit || patchMut.isPending}
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        onCheckedChange={(v) => patchMut.mutate({ id: field.id, body: { isActive: v } })}
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      />
                    // Elemento/componente React na tela
                    </TableCell>
                  // Elemento/componente React na tela
                  </TableRow>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                ))}
              // Elemento/componente React na tela
              </TableBody>
            // Elemento/componente React na tela
            </Table>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}
        // Elemento/componente React na tela
        </CardContent>
      // Elemento/componente React na tela
      </Card>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
