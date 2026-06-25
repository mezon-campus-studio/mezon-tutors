'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { BlogContentHtml } from '@/components/blogs/BlogContentHtml';
import { BlogTableOfContents } from '@/components/blogs/BlogTableOfContents';
import { isBlogHtmlContent, plainTextToBlogHtml } from '@/lib/blog-content';
import { extractTocFromHtml } from '@/lib/blog-toc';
import { cn } from '@/lib/utils';

type BlogContentSectionProps = {
  content: string;
  className?: string;
};

export function BlogContentSection({ content, className }: BlogContentSectionProps) {
  const t = useTranslations('Blogs.detail');
  const [activeId, setActiveId] = useState<string | null>(null);

  const { items, htmlWithIds } = useMemo(() => {
    const html = isBlogHtmlContent(content) ? content : plainTextToBlogHtml(content);
    return extractTocFromHtml(html);
  }, [content]);

  useEffect(() => {
    if (items.length === 0) return;

    const headingIds = items.map((item) => item.id);
    const scrollOffset = 96;

    const getHeadings = () =>
      headingIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);

    const updateActiveId = () => {
      const headings = getHeadings();
      if (headings.length === 0) return;

      let nextActiveId = headings[0].id;

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= scrollOffset) {
          nextActiveId = heading.id;
        } else {
          break;
        }
      }

      setActiveId((current) => (current === nextActiveId ? current : nextActiveId));
    };

    const frame = requestAnimationFrame(updateActiveId);

    window.addEventListener('scroll', updateActiveId, { passive: true });
    window.addEventListener('resize', updateActiveId, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateActiveId);
      window.removeEventListener('resize', updateActiveId);
    };
  }, [items]);

  const handleTocClick = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  if (items.length === 0) {
    return (
      <BlogContentHtml
        content={content}
        className={className}
      />
    );
  }

  return (
    <div className={cn('relative mx-auto max-w-3xl', className)}>
      <BlogTableOfContents
        items={items}
        activeId={activeId}
        onItemClick={handleTocClick}
        title={t('toc')}
      />

      <BlogTableOfContents
        items={items}
        activeId={activeId}
        onItemClick={handleTocClick}
        title={t('toc')}
        variant="mobile"
        className="mb-6 xl:hidden"
      />

      <BlogContentHtml content={htmlWithIds} />
    </div>
  );
}
