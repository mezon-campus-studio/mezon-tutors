import { isBlogHtmlContent, plainTextToBlogHtml, BLOG_PROSE_CLASS } from "@/lib/blog-content";
import { cn } from "@/lib/utils";

type BlogContentHtmlProps = {
  content: string;
  className?: string;
};

export function BlogContentHtml({ content, className }: BlogContentHtmlProps) {
  if (isBlogHtmlContent(content)) {
    return (
      <div
        className={cn(BLOG_PROSE_CLASS, className)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className={cn(BLOG_PROSE_CLASS, className)}>
      {content.split(/\n{2,}/).map((paragraph, index) => (
        <p key={`paragraph-${index}`} className="mb-4 whitespace-pre-wrap text-base text-slate-700">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export { plainTextToBlogHtml };
