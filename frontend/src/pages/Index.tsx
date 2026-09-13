/**
 * Landing / redirecionamento inicial — placeholder Lovable (não usado em produção).
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

// Componente temporário gerado pelo Lovable — substituir se precisar de landing page própria
const PlaceholderIndex = () => {
  // Renderiza tela centralizada com imagem placeholder (não aparece em produção normal)
  return (
    // Container ocupa tela inteira e centraliza conteúdo vertical/horizontalmente
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#fcfbf8' }}>
      {/* Imagem SVG de placeholder — indicador de que a página ainda não foi customizada */}
      <img data-lovable-blank-page-placeholder="REMOVE_THIS" src="/placeholder.svg" alt="Your app will live here!" />
    </div>
  );
};

// Alias — export default usa o mesmo componente placeholder
const Index = PlaceholderIndex;

export default Index;
