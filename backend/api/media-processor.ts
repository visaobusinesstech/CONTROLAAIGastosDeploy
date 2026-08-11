/**
 * Processamento de mídia — Whisper (áudio) e extração de PDF — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { createReadStream, writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs"; // I/O temporário para áudio
import { join } from "node:path"; // Montagem de caminho do arquivo .ogg
import { tmpdir } from "node:os"; // Diretório temporário do SO
import { randomUUID } from "node:crypto"; // Nome único para arquivo temporário
import { getOpenAI, getWhisperModel, isOpenAIConfigured } from "./openai-client.js"; // Cliente OpenAI e modelo Whisper
import { logAiOperation } from "./logger.js"; // Auditoria em ai_logs

/** Transcreve buffer de áudio OGG via Whisper — retorna texto em português ou string vazia. */
export async function transcribeAudio(buffer: Buffer, userId?: string): Promise<string> {
  if (!isOpenAIConfigured()) {
    return ""; // Sem API key — não transcreve
  }

  const start = Date.now(); // Marca início para latência em ai_logs
  const dir = join(tmpdir(), "controla-ai"); // Pasta temporária dedicada ao Controla.ai
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); // Cria pasta se não existir
  const filePath = join(dir, `${randomUUID()}.ogg`); // Arquivo único .ogg para a API Whisper
  writeFileSync(filePath, buffer); // Grava buffer em disco (Whisper exige file stream)

  try {
    const openai = getOpenAI(); // Singleton OpenAI
    const model = getWhisperModel(); // whisper-1 por padrão
    const transcription = await openai.audio.transcriptions.create({
      model,
      file: createReadStream(filePath), // Stream do arquivo temporário
      language: "pt", // Força português brasileiro
    });

    await logAiOperation({
      userId,
      source: "whatsapp",
      operation: "transcribe",
      response: transcription.text, // Texto transcrito
      model,
      processingMs: Date.now() - start, // Latência total
    });

    return transcription.text; // Texto para o parser financeiro
  } catch (err) {
    await logAiOperation({
      userId,
      source: "whatsapp",
      operation: "transcribe",
      status: "error",
      errorMessage: err instanceof Error ? err.message : String(err), // Mensagem de erro
      processingMs: Date.now() - start,
    });
    return ""; // Falha silenciosa — handler WhatsApp trata texto vazio
  } finally {
    try {
      unlinkSync(filePath); // Remove arquivo temporário
    } catch {
      /* ignore */ // Falha ao deletar não bloqueia fluxo
    }
  }
}

/** Extrai texto bruto de PDF via pdf-parse — usado antes do parser de documentos. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default; // Import dinâmico (ESM)
    const data = await pdfParse(buffer); // Parse do buffer PDF
    return data.text ?? ""; // Texto extraído ou vazio
  } catch {
    return ""; // PDF inválido ou biblioteca falhou
  }
}
