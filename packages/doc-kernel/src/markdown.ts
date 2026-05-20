import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token';
import type { SlideSpec } from './types';

export const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

type HeadingTag = 'h1' | 'h2' | 'h3';

export function markdownToHtml(markdown: string): string {
  return md.render(markdown || '');
}

function isHeadingTag(tag: string): tag is HeadingTag {
  return tag === 'h1' || tag === 'h2' || tag === 'h3';
}

function isHeadingOpen(token: Token): token is Token & { tag: HeadingTag } {
  return token.type === 'heading_open' && isHeadingTag(token.tag);
}

export function markdownToSlides(markdown: string): { coverTitle?: string; slides: SlideSpec[] } {
  const tokens = md.parse(markdown || '', {});
  let coverTitle: string | undefined;
  const slides: SlideSpec[] = [];
  let current: SlideSpec | null = null;
  let pendingHeadingText: string | null = null;
  let lastHeadingLevel: HeadingTag | null = null;

  function commit() {
    if (current && (current.title || current.bullets.length)) slides.push(current);
    current = null;
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (isHeadingOpen(token)) {
      pendingHeadingText = null;
      lastHeadingLevel = token.tag;
      continue;
    }
    if (token.type === 'inline' && lastHeadingLevel && pendingHeadingText === null) {
      const headingText = (token.content || '').trim();
      pendingHeadingText = headingText;
      if (lastHeadingLevel === 'h1' && !coverTitle) {
        coverTitle = headingText;
      } else {
        commit();
        current = { title: headingText || 'قسم', bullets: [] };
      }
      continue;
    }
    if (token.type === 'heading_close') {
      pendingHeadingText = null;
      lastHeadingLevel = null;
      continue;
    }
    if (token.type === 'inline' && tokens[i - 1]?.type === 'paragraph_open' && tokens[i - 2]?.type === 'list_item_open') {
      if (!current) current = { title: 'نقاط رئيسية', bullets: [] };
      const text = (token.content || '').trim();
      if (text) current.bullets.push(text);
    }
  }

  commit();
  return { coverTitle, slides };
}
