/**
 * Normalização e resolução de categorias do parser para o banco — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { categories } from "../src/db/schema.js";
import { getOpenAI, getOpenAIModel, isOpenAIConfigured } from "./openai-client.js";

/** Mapa de aliases de despesa → nome canônico do sistema. */
const EXPENSE_ALIASES: Record<string, string> = {
  outros: "Outros gastos",
  "outros gastos": "Outros gastos",
  alimentacao: "Alimentação",
  alimentação: "Alimentação",
  comida: "Alimentação",
  mercado: "Alimentação",
  restaurante: "Alimentação",
  cafe: "Alimentação",
  café: "Alimentação",
  cafeteria: "Alimentação",
  lanchonete: "Alimentação",
  ifood: "Alimentação",
  delivery: "Alimentação",
  transporte: "Transporte",
  uber: "Transporte",
  gasolina: "Transporte",
  combustivel: "Transporte",
  combustível: "Transporte",
  moradia: "Moradia",
  aluguel: "Moradia",
  internet: "Moradia",
  luz: "Moradia",
  agua: "Moradia",
  água: "Moradia",
  saude: "Saúde",
  saúde: "Saúde",
  farmacia: "Saúde",
  farmácia: "Saúde",
  educacao: "Educação",
  educação: "Educação",
  lazer: "Lazer",
  roupas: "Roupas",
  tecnologia: "Tecnologia",
  servicos: "Serviços",
  serviços: "Serviços",
  assinaturas: "Serviços",
};

/** Regex → categoria canônica inferida a partir da descrição completa da mensagem. */
const DESCRIPTION_KEYWORDS: Array<[RegExp, string]> = [
  [/pizza|hamb[uú]rguer|lanche|almo[çc]o|jantar|caf[eé]|cafeteria|restaurante|mercado|supermercado|feira|ifood|delivery|a[cç][uú]car|padaria|sorvete|churrasco|carne|a[cç]ougue|peixe|frango/i, "Alimentação"],
  [/uber|99|taxi|t[aá]xi|gasolina|combust[ií]vel|[oô]nibus|metr[oô]|estacionamento|ped[aá]gio/i, "Transporte"],
  [/aluguel|condom[ií]nio|iptu|mob[ií]lia/i, "Moradia"],
  [/internet|luz|[aá]gua|g[aá]s|energia el[eé]trica/i, "Moradia"],
  [/farm[aá]cia|m[eé]dico|consulta|hospital|rem[eé]dio|plano de sa[uú]de|dentista/i, "Saúde"],
  [/livro|curso|faculdade|escola|universidade|matr[ií]cula|apostila|aula|udemy|certifica/i, "Educação"],
  [/cinema|filme|filmes|ingresso|netflix|spotify|streaming|disney|hbo|prime video|bar|balada|show|viagem|hotel|passeio|jogo|game|teatro|s[eé]rie/i, "Lazer"],
  [/camisa|cal[çc]a|t[eê]nis|sapato|roupa|loja de roupa|shein|zara/i, "Roupas"],
  [/celular|notebook|computador|software|apple|samsung|tecnologia|gadget/i, "Tecnologia"],
  [/sal[aá]rio|folha|clt|emprego|empresa\s+pagou/i, "Salário"],
  [/freela|freelance|cliente|honor[aá]rio|bico|servi[cç]o\s+prestado/i, "Freelance"],
  [/dividendo|rendimento|investimento|fii|a[cç][oõ]es|juros/i, "Investimentos"],
];

/** Mapa de aliases de receita → nome canônico do sistema. */
const INCOME_ALIASES: Record<string, string> = {
  outros: "Outras receitas",
  "outras receitas": "Outras receitas",
  salario: "Salário",
  salário: "Salário",
  freelance: "Freelance",
  investimentos: "Investimentos",
};

/** Remove acentos para comparação case-insensitive de aliases. */
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, ""); // NFD decompõe acentos; \p{M} remove marcas
}

/** Infere categoria a partir do texto da descrição (keywords) — retorna null se não encontrar. */
export function inferCategoryFromDescription(
  description: string | undefined,
  type: "expense" | "income",
): string | null {
  if (!description?.trim()) return null; // Sem descrição — não infere
  const lower = description.toLowerCase(); // Normaliza para matching
  for (const [re, cat] of DESCRIPTION_KEYWORDS) {
    if (!re.test(lower)) continue; // Regex não bateu — próxima keyword
    if (type === "income" && !["Salário", "Freelance", "Investimentos"].includes(cat)) continue;
    if (type === "expense" && ["Salário", "Freelance", "Investimentos"].includes(cat)) continue;
    return cat; // Primeira keyword compatível com o tipo
  }
  return null; // Nenhuma keyword encontrada
}

/** Normaliza label bruto do parser para nome canônico (aliases + fallback Outros). */
export function normalizeCategoryLabel(raw: string | undefined, type: "expense" | "income"): string {
  if (!raw?.trim()) {
    return type === "income" ? "Outras receitas" : "Outros gastos"; // Fallback quando parser não informou categoria
  }

  const key = stripAccents(raw.trim().toLowerCase()); // Chave normalizada para lookup
  const map = type === "income" ? INCOME_ALIASES : EXPENSE_ALIASES; // Escolhe mapa pelo tipo
  if (map[key]) return map[key]; // Match exato no alias

  for (const [alias, canonical] of Object.entries(map)) {
    if (key.includes(alias) || alias.includes(key)) return canonical; // Match parcial (substring)
  }

  return raw.trim(); // Mantém label original se não houver alias
}

/** Lista nomes de categorias disponíveis para o usuário (globais + personalizadas). */
export async function listAvailableCategories(
  userId: string,
  type: "expense" | "income",
): Promise<string[]> {
  const rows = await db
    .select({ name: categories.name })
    .from(categories)
    .where(and(or(isNull(categories.userId), eq(categories.userId, userId)), eq(categories.type, type))) // Globais (userId null) + do usuário
    .orderBy(categories.name); // Ordem alfabética

  return rows.map((r) => r.name);
}

/** Classifica categoria via OpenAI — entende contexto (filme→Lazer, carne→Alimentação). */
export async function resolveCategoryWithAi(
  description: string,
  type: "expense" | "income",
  availableCategories: string[],
): Promise<string | null> {
  if (!isOpenAIConfigured() || !description.trim()) return null;

  const cats = availableCategories.length
    ? availableCategories.join(", ")
    : type === "income"
      ? "Salário, Freelance, Investimentos, Outras receitas"
      : "Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Roupas, Tecnologia, Serviços, Outros gastos";

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Classifique a categoria financeira em português brasileiro.
Retorne JSON: {"category": "nome exato"}
Use APENAS um destes nomes: ${cats}
REGRAS:
- filme, cinema, ingresso, streaming → Lazer (NUNCA Moradia)
- carne, mercado, almoço, restaurante → Alimentação
- uber, gasolina → Transporte
- aluguel, luz, internet → Moradia
- Analise o SIGNIFICADO do gasto, não palavras soltas como "em" ou "um".`,
        },
        { role: "user", content: description },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { category?: string };
    return raw.category?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Resolve categoryId — IA + keywords; descrição prevalece. */
export async function findCategoryId(
  userId: string,
  categoryName: string,
  type: "expense" | "income",
  description?: string,
): Promise<{ id: string | null; resolvedName: string }> {
  const fallbackDefault = type === "income" ? "Outras receitas" : "Outros gastos";
  const text = description?.trim() || categoryName?.trim() || "";

  const available = (await listAvailableCategories(userId, type));
  const fromAi = text ? await resolveCategoryWithAi(text, type, available) : null;
  const fromDescription = inferCategoryFromDescription(text, type);
  const normalizedParser = normalizeCategoryLabel(categoryName, type);

  let resolvedName = fromAi ?? fromDescription ?? normalizedParser;
  if (resolvedName === fallbackDefault && fromDescription) resolvedName = fromDescription;
  if (fromAi && available.some((c) => c.toLowerCase() === fromAi.toLowerCase())) {
    resolvedName = available.find((c) => c.toLowerCase() === fromAi.toLowerCase()) ?? fromAi;
  }

  const [exact] = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      and(
        or(isNull(categories.userId), eq(categories.userId, userId)),
        ilike(categories.name, resolvedName), // Busca case-insensitive
        eq(categories.type, type),
      ),
    )
    .limit(1);

  if (exact) return { id: exact.id, resolvedName: exact.name }; // Match exato encontrado

  const fallbackName = type === "income" ? "Outras receitas" : "Outros gastos";
  const [fallback] = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      and(
        or(isNull(categories.userId), eq(categories.userId, userId)),
        ilike(categories.name, fallbackName), // Busca categoria fallback
        eq(categories.type, type),
      ),
    )
    .limit(1);

  return { id: fallback?.id ?? null, resolvedName: fallback?.name ?? resolvedName }; // Fallback ou nome resolvido sem id
}
