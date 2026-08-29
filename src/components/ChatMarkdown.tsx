/**
 * The small slice of Markdown the assistant actually emits, rendered as React
 * nodes.
 *
 * Chat replies come back with `**bold**`, `- ` bullets and `1. ` numbered
 * lists — 146 bold spans in the canned replies alone. The message body used to
 * print the raw string inside `whitespace-pre-line`, so every one of those
 * showed on screen as literal asterisks.
 *
 * Two deliberate limits:
 *
 *   - This is not a Markdown implementation. It handles bold, italic, inline
 *     code, bullet lists (one nesting level), numbered lists and paragraphs.
 *     Anything else falls through as plain text, which is the right failure for
 *     chat: an unsupported construct reads as slightly odd prose rather than
 *     breaking the layout.
 *   - It returns React elements, never `dangerouslySetInnerHTML`. Model output
 *     is untrusted text; building nodes means a reply containing HTML can never
 *     execute, with no sanitiser to keep in step.
 */

import React from 'react';

/**
 * Whether a Markdown link may become an actual anchor.
 *
 * Assistant text is untrusted — it is model output, and the model was handed a
 * context block fetched over the network. So the scheme is checked (no
 * `javascript:`, no `data:`) and so is the host: the two places the assistant
 * has any business linking to are its own deployment and the Wikipedia article
 * whose URL we put in the context ourselves. Anything else renders as the link
 * text with the URL dropped, which loses nothing a reader wanted.
 */
function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const host = url.hostname.toLowerCase();
    const ok =
      host === 'wikipedia.org' ||
      host.endsWith('.wikipedia.org') ||
      host === 'visgo-project.web.app' ||
      host === 'visgo-project.firebaseapp.com';
    return ok ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Splits one line into link / bold / italic / code / plain runs. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Links first, so `[**text**](url)` is a link and not a stray bracket. Bold
  // before italic: a single `*` rule would eat the halves of `**`.
  const pattern = /(\[[^\]\n]+\]\([^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-i${i++}`;
    if (tok.startsWith('[')) {
      const split = tok.indexOf('](');
      const label = tok.slice(1, split);
      const href = safeHref(tok.slice(split + 2, -1));
      out.push(
        href ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[#A82323] underline underline-offset-2 hover:text-[#8C1818]"
          >
            {label}
          </a>
        ) : (
          <React.Fragment key={key}>{label}</React.Fragment>
        ),
      );
    } else if (tok.startsWith('**')) {
      // Recursive, because emphasis wraps links as often as the other way
      // round: `*Nguồn: [Wikipedia](…)*` matches the italic rule first, and
      // without recursing, the link inside it stayed raw brackets on screen.
      out.push(
        <strong key={key} className="font-bold">
          {renderInline(tok.slice(2, -2), key)}
        </strong>,
      );
    } else if (tok.startsWith('`')) {
      out.push(
        <code key={key} className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.9em] text-stone-800">
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      out.push(
        <em key={key} className="italic">
          {renderInline(tok.slice(1, -1), key)}
        </em>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: { text: string; nested: boolean }[] };

/** Groups lines into paragraphs and runs of list items. */
function toBlocks(src: string): Block[] {
  const blocks: Block[] = [];

  for (const raw of src.split('\n')) {
    const indented = /^\s{2,}/.test(raw);
    const line = raw.trim();

    if (!line) {
      // A blank line closes whatever block is open.
      blocks.push({ kind: 'p', lines: [] });
      continue;
    }

    const bullet = /^[-•*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const kind = bullet ? 'ul' : numbered ? 'ol' : null;

    if (kind) {
      const tail = blocks[blocks.length - 1];
      const item = { text: (bullet ?? numbered)![1], nested: indented };
      if (tail && tail.kind === kind) tail.items.push(item);
      else blocks.push({ kind, items: [item] });
      continue;
    }

    const tail = blocks[blocks.length - 1];
    if (tail && tail.kind === 'p' && tail.lines.length) tail.lines.push(line);
    else blocks.push({ kind: 'p', lines: [line] });
  }

  return blocks.filter((b) => (b.kind === 'p' ? b.lines.length > 0 : b.items.length > 0));
}

/**
 * Regional-indicator flag emoji. The model volunteers these ("ViS-Go 🇻🇳") and
 * Windows ships no glyph for them, so they land as two blank boxes mid-sentence.
 * Stripped here rather than in the prompt: prompts are advice, this is not.
 */
const FLAG_EMOJI = /[\u{1F1E6}-\u{1F1FF}]{2}\s*/gu;

export const ChatMarkdown: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const blocks = React.useMemo(() => toBlocks(text.replace(FLAG_EMOJI, '')), [text]);

  return (
    <div className={className}>
      {blocks.map((b, bi) => {
        if (b.kind === 'p') {
          return (
            <p key={bi} className={bi > 0 ? 'mt-2' : undefined}>
              {b.lines.map((l, li) => (
                <React.Fragment key={li}>
                  {li > 0 && <br />}
                  {renderInline(l, `${bi}-${li}`)}
                </React.Fragment>
              ))}
            </p>
          );
        }

        const List = b.kind === 'ul' ? 'ul' : 'ol';
        return (
          <List
            key={bi}
            className={`${bi > 0 ? 'mt-2 ' : ''}space-y-1 ${
              b.kind === 'ul' ? 'list-disc' : 'list-decimal'
            } pl-5 marker:text-stone-400`}
          >
            {b.items.map((it, ii) => (
              <li key={ii} className={it.nested ? 'ml-4 list-[circle]' : undefined}>
                {renderInline(it.text, `${bi}-${ii}`)}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
};
