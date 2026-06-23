'use client';

import {
  CLOUDINARY_FOLDER,
  MAX_IMAGE_SIZE_MB,
  ROUTES,
  type CreateBlogPayload,
} from '@mezon-tutors/shared';
import { useAtomValue } from 'jotai';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Input, Label, Spinner, Textarea } from '@/components/ui';
import { BlogRichTextEditor } from '@/components/blogs/BlogRichTextEditor';
import {
  BlogTagPicker,
  blogTagsToDrafts,
  tagsToPayload,
  type BlogTagDraft,
} from '@/components/blogs/BlogTagPicker';
import UploadFile from '@/components/common/UploadFile';
import { isEditorContentEmpty } from '@/lib/blog-content';
import { cloudinaryService, useCreateBlog, useMyBlogSubmission, useUpdateBlog } from '@/services';
import { isAuthenticatedAtom, isLoadingAtom, userAtom } from '@/store';

type CreateBlogViewProps = {
  blogId?: string;
};

export default function CreateBlogView({ blogId }: CreateBlogViewProps = {}) {
  const isEditMode = Boolean(blogId);
  const t = useTranslations('Blogs.create');
  const tEdit = useTranslations('Blogs.create.edit');
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const createBlog = useCreateBlog();
  const updateBlog = useUpdateBlog();
  const isLoggedIn = isAuthenticated || Boolean(user);
  const { data: existingPost, isLoading: isLoadingPost } = useMyBlogSubmission(
    blogId ?? '',
    isEditMode && !isAuthLoading && isLoggedIn
  );
  const isPublished = existingPost?.publishStatus === 'PUBLISHED';
  const isClosed = existingPost?.publishStatus === 'CLOSED';
  const isLocked = isClosed;
  const hasPendingUpdate = existingPost?.updateReviewStatus === 'PENDING';
  const isSubmitting = createBlog.isPending || updateBlog.isPending;
  const [formInitialized, setFormInitialized] = useState(!isEditMode);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<BlogTagDraft[]>([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      const nextPath = isEditMode && blogId ? ROUTES.BLOGS.EDIT(blogId) : ROUTES.BLOGS.CREATE;
      router.replace(`/?login=required&next=${encodeURIComponent(nextPath)}`);
    }
  }, [isAuthLoading, isLoggedIn, router, isEditMode, blogId]);

  useEffect(() => {
    if (slugManuallyEdited) return;
    setSlug(slugify(title));
  }, [title, slugManuallyEdited]);

  useEffect(() => {
    if (!isEditMode || !existingPost || formInitialized) return;
    setTitle(existingPost.title);
    setSlug(existingPost.slug);
    setSlugManuallyEdited(true);
    setExcerpt(existingPost.excerpt ?? '');
    setContent(existingPost.content);
    setSelectedTags(blogTagsToDrafts(existingPost.tags));
    setSeoTitle(existingPost.seoTitle ?? '');
    setSeoDescription(existingPost.seoDescription ?? '');
    setCoverImageUrl(existingPost.coverImageUrl ?? '');
    setOgImageUrl(existingPost.ogImageUrl ?? '');
    setFormInitialized(true);
  }, [isEditMode, existingPost, formInitialized]);

  const uploadImage = async (file: File) => {
    const result = await cloudinaryService.uploadFileWithSignature(
      file,
      CLOUDINARY_FOLDER.BLOG,
      'image'
    );
    return result.secureUrl;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLocked) return;

    if (!title.trim()) {
      toast.error(t('errors.titleRequired'));
      return;
    }
    if (isEditorContentEmpty(content)) {
      toast.error(t('errors.contentRequired'));
      return;
    }

    const payload: CreateBlogPayload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      content: content.trim(),
      excerpt: excerpt.trim() || undefined,
      coverImageUrl: coverImageUrl || undefined,
      ogImageUrl: ogImageUrl || undefined,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      ...tagsToPayload(selectedTags),
    };

    try {
      if (isEditMode && blogId) {
        await updateBlog.mutateAsync({ id: blogId, payload });
        toast.success(isPublished ? tEdit('updateSubmitted') : tEdit('success'));
        router.push(ROUTES.DASHBOARD.MY_BLOGS);
        return;
      }

      await createBlog.mutateAsync(payload);
      toast.success(t('success'));
      router.push(ROUTES.DASHBOARD.MY_BLOGS);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.submitFailed'));
    }
  };

  if ((isAuthLoading && !isLoggedIn) || (isEditMode && (isLoadingPost || !formInitialized))) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-8 text-violet-600" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,#faf9ff_0%,#ffffff_38%,#f8f6ff_100%)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,58,237,0.14),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl px-6 py-8 sm:py-10 lg:px-8">
        <Link
          href={isEditMode ? ROUTES.DASHBOARD.MY_BLOGS : ROUTES.BLOGS.INDEX}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-violet-700"
        >
          <ArrowLeft className="size-4" />
          {isEditMode ? tEdit('backToList') : t('badge')}
        </Link>

        <header className="mb-8 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
            <BookOpen className="size-3.5" />
            {isEditMode ? tEdit('badge') : t('badge')}
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {isEditMode ? tEdit('title') : t('title')}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              {isEditMode ? tEdit('description') : t('description')}
            </p>
          </div>

          {isEditMode &&
          existingPost?.publishStatus === 'REJECTED' &&
          existingPost.rejectedReason ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3.5 text-xs leading-6 text-rose-800">
              {tEdit('rejectedBanner', { reason: existingPost.rejectedReason })}
            </div>
          ) : null}
          {isEditMode && isPublished ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3.5 text-xs leading-6 text-amber-900">
              {tEdit('publishedEditBanner')}
            </div>
          ) : null}
          {isEditMode && hasPendingUpdate ? (
            <div className="rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-3.5 text-xs leading-6 text-violet-900">
              {tEdit('updatePendingBanner')}
            </div>
          ) : null}
          {isEditMode &&
          existingPost?.updateReviewStatus === 'REJECTED' &&
          existingPost.updateRejectedReason ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3.5 text-xs leading-6 text-rose-800">
              {tEdit('updateRejectedBanner', {
                reason: existingPost.updateRejectedReason,
              })}
            </div>
          ) : null}
          {isEditMode && isClosed ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs leading-6 text-slate-700">
              {tEdit('closedBanner')}
            </div>
          ) : null}
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          <section className="space-y-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">{t('sections.basic')}</h2>
            <div className="space-y-2">
              <Label htmlFor="title">{t('fields.title')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLocked}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{t('fields.slug')}</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                disabled={isLocked}
                placeholder={slugify(title)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt">{t('fields.excerpt')}</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                disabled={isLocked}
                rows={3}
              />
            </div>
            <BlogTagPicker
              value={selectedTags}
              onChange={setSelectedTags}
              disabled={isLocked}
            />
            <div className="space-y-2">
              <Label>{t('fields.coverImage')}</Label>
              <UploadFile
                variant="image"
                accept="image/*"
                previewUrl={coverImageUrl}
                isUploading={uploadingCover}
                onFile={async (file) => {
                  setUploadingCover(true);
                  try {
                    setCoverImageUrl(await uploadImage(file));
                  } finally {
                    setUploadingCover(false);
                  }
                }}
                uploadLabel={t('actions.upload')}
                uploadingLabel={t('actions.uploading')}
                hint={t('uploadHint', { maxMb: MAX_IMAGE_SIZE_MB })}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">{t('sections.content')}</h2>
            <BlogRichTextEditor
              label={t('fields.content')}
              value={content}
              onChange={setContent}
              disabled={isLocked}
            />
          </section>

          <section className="space-y-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">{t('sections.seo')}</h2>
            <div className="space-y-2">
              <Label htmlFor="seoTitle">{t('fields.seoTitle')}</Label>
              <Input
                id="seoTitle"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seoDescription">{t('fields.seoDescription')}</Label>
              <Textarea
                id="seoDescription"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                disabled={isLocked}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('fields.ogImage')}</Label>
              <UploadFile
                variant="image"
                accept="image/*"
                previewUrl={ogImageUrl}
                isUploading={uploadingOg}
                onFile={async (file) => {
                  setUploadingOg(true);
                  try {
                    setOgImageUrl(await uploadImage(file));
                  } finally {
                    setUploadingOg(false);
                  }
                }}
                uploadLabel={t('actions.upload')}
                uploadingLabel={t('actions.uploading')}
                hint={t('uploadHint', { maxMb: MAX_IMAGE_SIZE_MB })}
              />
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLocked || isSubmitting}
              className="h-11 rounded-full px-8 text-sm font-semibold"
              variant="gradient"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('actions.submitting')}
                </>
              ) : isEditMode ? (
                isPublished ? (
                  tEdit('submitUpdate')
                ) : (
                  tEdit('submit')
                )
              ) : (
                t('actions.submit')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function slugify(str: string): string {
  return (
    str
      .normalize('NFD')
      // biome-ignore lint/suspicious/noMisleadingCharacterClass: remove combining diacritical marks
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200)
  );
}
