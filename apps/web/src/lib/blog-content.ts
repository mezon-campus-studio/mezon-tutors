const HTML_CONTENT_PATTERN = /<[a-z][\s\S]*>/i;

export function isBlogHtmlContent(content: string): boolean {
  return HTML_CONTENT_PATTERN.test(content.trim());
}

export function plainTextToBlogHtml(content: string): string {
  if (isBlogHtmlContent(content)) {
    return content;
  }

  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const BLOG_PROSE_CLASS =
  'blog-content prose prose-slate max-w-none prose-p:leading-8 prose-headings:font-bold prose-a:text-violet-700 prose-a:underline-offset-2 prose-blockquote:border-l-violet-400 prose-blockquote:text-slate-600 prose-img:rounded-2xl prose-img:border prose-img:border-violet-100 prose-img:shadow-sm prose-code:rounded-lg prose-code:bg-violet-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-violet-800 prose-code:font-normal prose-code:text-xs prose-pre:rounded-2xl prose-pre:border prose-pre:border-violet-100 prose-pre:bg-slate-950';

export function isEditorContentEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const hasImage = /<img\b/i.test(html);
  return !text && !hasImage;
}
