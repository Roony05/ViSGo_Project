/**
 * Gemini through Firebase AI Logic.
 *
 * This is the no-server path. Firebase runs a proxy between the browser and
 * Gemini, so the API key stays on Google's side and never reaches the bundle —
 * the same property our own `/api` routes gave us, without a server to host.
 *
 * Two pieces make that safe:
 *
 *   1. SERVER PROMPT TEMPLATES. The ViS-AI ruleset — who it is, the refusal
 *      script for off-topic questions, and above all the grounding rule that
 *      forbids inventing a tour, a host or a price — lives on Firebase, not
 *      here. The client sends a template id plus variables. Nobody can read the
 *      rules out of the bundle, and they can be edited in the Firebase console
 *      without rebuilding the app.
 *
 *   2. APP CHECK. With no key to steal, the remaining risk is someone calling
 *      the proxy from their own page and spending our free quota. App Check
 *      makes the browser prove it is really this app before the proxy answers.
 *
 * Everything degrades: unconfigured, offline, blocked by App Check or refused
 * by the model all return null, and the caller falls back — first to the /api
 * routes if a server is deployed, then to the offline engine in ragEngine.ts.
 * The chat never dies, it only gets less clever.
 */

import { getFirebase } from '../config/firebase';

const clean = (value: string | undefined): string => {
  const v = (value ?? '').trim();
  if (!v || v.startsWith('your_') || v.startsWith('MY_')) return '';
  return v;
};

/** Template ids, created in Firebase console → AI Logic → Prompt templates. */
const CHAT_TEMPLATE = clean(import.meta.env.VITE_FIREBASE_AI_CHAT_TEMPLATE);
const TRANSLATE_TEMPLATE = clean(import.meta.env.VITE_FIREBASE_AI_TRANSLATE_TEMPLATE);

/** True when this build is set up to talk to Gemini via Firebase. */
export const HAS_FIREBASE_AI = CHAT_TEMPLATE.length > 0 || TRANSLATE_TEMPLATE.length > 0;

type TemplateModel = {
  generateContent(
    templateId: string,
    templateVariables: Record<string, unknown>,
  ): Promise<{ response: { text(): string } }>;
};

let modelPromise: Promise<TemplateModel | null> | null = null;

/**
 * Loads the AI SDK on first use.
 *
 * Behind a dynamic import so that the ~100 kB of `firebase/ai` only downloads
 * for visitors who actually open the assistant, and never at all for builds
 * that have no template configured.
 */
async function getModel(): Promise<TemplateModel | null> {
  if (!HAS_FIREBASE_AI) return null;

  if (!modelPromise) {
    modelPromise = (async () => {
      const fb = await getFirebase();
      if (!fb) return null;

      const { getAI, GoogleAIBackend, getTemplateGenerativeModel } = await import('firebase/ai');
      // GoogleAIBackend is the Gemini Developer API, which is the one with a
      // free tier that needs no billing account. The Vertex AI backend is the
      // other option and it does require one.
      const ai = getAI(fb.app, { backend: new GoogleAIBackend() });
      return getTemplateGenerativeModel(ai) as unknown as TemplateModel;
    })().catch((err: unknown) => {
      console.warn('[ViS-Go AI] Firebase AI Logic unavailable:', err);
      // Reset so a later attempt can retry rather than reusing a poisoned promise.
      modelPromise = null;
      return null;
    });
  }

  return modelPromise;
}

async function runTemplate(
  templateId: string,
  variables: Record<string, unknown>,
): Promise<string | null> {
  const model = await getModel();
  if (!model) return null;

  try {
    const result = await model.generateContent(templateId, variables);
    const text = result.response.text().trim();
    return text.length > 0 ? text : null;
  } catch (err) {
    // App Check rejection, quota exhaustion and a safety block all land here.
    // None of them is worth an error screen: the caller has somewhere to go.
    console.warn(`[ViS-Go AI] Template "${templateId}" did not answer:`, err);
    return null;
  }
}

export interface ChatTurn {
  role: string;
  text: string;
}

/**
 * Asks ViS-AI a question.
 *
 * `context` is the live catalogue the answer must be grounded in — it is data,
 * not instructions, and the template on the server is what tells the model to
 * treat it that way and never to invent a tour that is not in it.
 */
export async function askViSAi(input: {
  message: string;
  context: string;
  history: ChatTurn[];
  language: 'vi' | 'en';
}): Promise<string | null> {
  if (!CHAT_TEMPLATE) return null;

  return runTemplate(CHAT_TEMPLATE, {
    message: input.message,
    context: input.context,
    language: input.language === 'vi' ? 'Tiếng Việt' : 'English',
    history: input.history
      .slice(-8)
      .map((turn) => `${turn.role}: ${turn.text}`)
      .join('\n'),
  });
}

export interface TranslationFields {
  title: string;
  tagline: string;
  description: string;
  included: string;
  meetingPoint: string;
}

/**
 * Translates a host's Vietnamese listing into publish-ready English.
 *
 * The template is asked for JSON. A model can still return prose around it, so
 * the object is dug out rather than assumed — and a malformed answer is treated
 * as "no answer", which is honest, instead of publishing half a translation.
 */
export async function translateListing(input: {
  title: string;
  tagline: string;
  description: string;
  included: string;
  meetingPoint: string;
  city: string;
  category: string;
}): Promise<TranslationFields | null> {
  if (!TRANSLATE_TEMPLATE) return null;

  const raw = await runTemplate(TRANSLATE_TEMPLATE, input as unknown as Record<string, unknown>);
  if (!raw) return null;

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<TranslationFields>;
    const text = (value: unknown): string => (typeof value === 'string' ? value : '');
    const fields: TranslationFields = {
      title: text(parsed.title),
      tagline: text(parsed.tagline),
      description: text(parsed.description),
      included: text(parsed.included),
      meetingPoint: text(parsed.meetingPoint),
    };
    // A translation with no title is not a translation.
    return fields.title ? fields : null;
  } catch {
    return null;
  }
}
