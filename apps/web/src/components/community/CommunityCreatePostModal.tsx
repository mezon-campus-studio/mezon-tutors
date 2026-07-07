'use client';

import {
  CLOUDINARY_FOLDER,
  COMMUNITY_CONTENT_LIMITS,
  type CommunityPostType,
  type CreateCommunityPostPayload,
  type CommunityExerciseType,
  type CommunityExerciseDifficulty,
} from '@mezon-tutors/shared';
import { useAtomValue } from 'jotai';
import { Hash, ImagePlus, Loader2, Trash2, Vote, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  CommunityExerciseBuilder,
  buildExercisePayload,
  createEmptyExerciseDraft,
  type ExerciseDraftData,
} from '@/components/community/CommunityExerciseBuilder';
import {
  CommunityTagPicker,
  communityTagsToPayload,
  type CommunityTagDraft,
} from '@/components/community/CommunityTagPicker';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { cloudinaryService, useCreateCommunityPost } from '@/services';
import type { AuthUser } from '@/store';
import { userAtom } from '@/store';

const MODAL_POST_TYPES: CommunityPostType[] = ['POST', 'QUESTION', 'EXERCISE'];
const MAX_IMAGES = 10;

type CommunityCreatePostModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: CommunityPostType;
};

function getDisplayName(user: AuthUser | null) {
  if (!user) return '';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.username || 'User';
}

function getAvatarFallback(user: AuthUser | null) {
  const name = getDisplayName(user);
  return name.slice(0, 1).toUpperCase() || 'U';
}

export function CommunityCreatePostModal({ open, onOpenChange, defaultType = 'POST' }: CommunityCreatePostModalProps) {
  const t = useTranslations('Community.create');
  const tp = useTranslations('Community.postTypes');
  const tex = useTranslations('Community.exerciseTypes');
  const tdiff = useTranslations('Community.difficulty');
  const user = useAtomValue(userAtom);
  const createPost = useCreateCommunityPost();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const [type, setType] = useState<CommunityPostType>(defaultType);
  const handleTypeChange = (newType: CommunityPostType) => {
    setType(newType);
    setShowErrors(false);
  };
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<CommunityTagDraft[]>([]);
  const [imageList, setImageList] = useState<{ url: string | null; uploading: boolean }[]>([]);
  const [showTags, setShowTags] = useState(false);
  const [showPool, setShowPool] = useState(false);
  const [exerciseType, setExerciseType] = useState<CommunityExerciseType>('MULTIPLE_CHOICE');
  const handleExerciseTypeChange = (value: CommunityExerciseType) => {
    setExerciseType(value);
    setShowErrors(false);
  };
  const [difficulty, setDifficulty] = useState<CommunityExerciseDifficulty>('INTERMEDIATE');
  const [explanation, setExplanation] = useState('');
  const [exerciseDraft, setExerciseDraft] = useState<ExerciseDraftData>(createEmptyExerciseDraft);
  const [showErrors, setShowErrors] = useState(false);

  const displayName = getDisplayName(user);

  const resetForm = () => {
    setType('POST');
    setContent('');
    setTags([]);
    setImageList([]);
    setShowTags(false);
    setShowPool(false);
    setExerciseType('MULTIPLE_CHOICE');
    setDifficulty('INTERMEDIATE');
    setExplanation('');
    setExerciseDraft(createEmptyExerciseDraft());
    setShowErrors(false);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    } else {
      setType(defaultType);
      setShowErrors(false);
    }
  }, [open, defaultType]);

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error(t('errors.contentRequired'));
      return;
    }

    let exercisePayload: CreateCommunityPostPayload['exercise'];
    if (type === 'EXERCISE') {
      const built = buildExercisePayload(exerciseType, exerciseDraft);
      if (!built) {
        setShowErrors(true);
        toast.error(t('errors.exerciseRequired'));
        return;
      }
      exercisePayload = {
        exerciseType,
        difficulty,
        ...(explanation ? { explanation } : {}),
        payload: built.payload,
        correctAnswer: built.correctAnswer,
      };
    }

    const payload: CreateCommunityPostPayload = {
      type,
      content: content.trim(),
      ...communityTagsToPayload(tags),
      media: imageList.map((item, index) => ({
        type: 'IMAGE' as const,
        url: item.url!,
        sortOrder: index,
      })),
      ...(exercisePayload ? { exercise: exercisePayload } : {}),
    };

    createPost.mutate(payload, {
      onSuccess: () => {
        toast.success(t('success'));
        onOpenChange(false);
      },
      onError: () => toast.error(t('failed')),
    });
  };

  const handleImageUpload = async (files: FileList) => {
    const remaining = MAX_IMAGES - imageList.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    const localPreviews = toUpload.map((file) => ({
      url: URL.createObjectURL(file),
      uploading: true,
    }));
    setImageList((prev) => [...prev, ...localPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const results = await Promise.allSettled(
      toUpload.map((file) =>
        cloudinaryService.uploadFileWithSignature(file, CLOUDINARY_FOLDER.BLOG, 'image'),
      ),
    );

    setImageList((prev) => {
      const next = [...prev];
      let settledIndex = 0;
      for (let i = next.length - toUpload.length; i < next.length; i++) {
        const result = results[settledIndex++];
        if (result.status === 'fulfilled') {
          URL.revokeObjectURL(next[i].url!);
          next[i] = { url: result.value.secureUrl, uploading: false };
        } else {
          next.splice(i, 1);
          i--;
        }
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-sm"
        className={cn(
          'flex max-h-[85vh] flex-col gap-0 rounded-2xl border-0 p-0 shadow-xl',
          type === 'EXERCISE' ? 'sm:max-w-[720px]' : 'sm:max-w-[480px]',
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-4">
            {MODAL_POST_TYPES.map((postType) => (
              <button
                key={postType}
                type="button"
                onClick={() => handleTypeChange(postType)}
                disabled={createPost.isPending}
                className={cn(
                  'relative cursor-pointer pb-2 text-sm font-medium transition-colors',
                  type === postType
                    ? 'text-primary'
                    : 'text-neutral-400 hover:text-primary',
                )}
              >
                {tp(postType)}
                {type === postType ? (
                  <span
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
              </button>
            ))}
          </div>

          <DialogClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-neutral-500 hover:text-neutral-800"
                disabled={createPost.isPending}
              />
            }
          >
            <X className="size-5" />
            <span className="sr-only">{t('modal.close')}</span>
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={user?.avatar ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-amber-300 text-sm font-semibold text-white">
                  {getAvatarFallback(user)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[15px] font-semibold text-neutral-900">{displayName}</span>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                autoResizeTextarea();
              }}
              placeholder={type === 'POST' ? t('modal.placeholderPost') : type === 'QUESTION' ? t('modal.placeholderQuestion') : t('modal.placeholderExercise')}
              rows={3}
              maxLength={COMMUNITY_CONTENT_LIMITS.content}
              disabled={createPost.isPending}
              className="mt-4 w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-7 text-neutral-800 outline-none placeholder:text-neutral-400"
            />

            {showTags ? (
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <CommunityTagPicker value={tags} onChange={setTags} disabled={createPost.isPending} />
              </div>
            ) : null}

            {imageList.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {imageList.map((item, index) => (
                  <div key={index} className="group relative size-20 overflow-hidden rounded-xl border border-violet-100">
                    <img
                      src={item.url ?? ''}
                      alt=""
                      className={cn(
                        'size-full object-cover transition-all duration-300',
                        item.uploading && 'blur-sm brightness-75',
                      )}
                    />
                    {item.uploading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="size-5 animate-spin text-white" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => setImageList((prev) => prev.filter((_, i) => i !== index))}
                        disabled={createPost.isPending}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {type === 'EXERCISE' ? (
            <div className="space-y-4 border-t border-neutral-200 px-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-neutral-500">{t('exercise.type')}</Label>
                  <Select
                    value={exerciseType}
                    onValueChange={(value) => handleExerciseTypeChange(value as CommunityExerciseType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{tex(exerciseType)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MULTIPLE_CHOICE">{tex('MULTIPLE_CHOICE')}</SelectItem>
                      <SelectItem value="FILL_IN_BLANK">{tex('FILL_IN_BLANK')}</SelectItem>
                      <SelectItem value="READING">{tex('READING')}</SelectItem>
                      <SelectItem value="LISTENING">{tex('LISTENING')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-neutral-500">{t('exercise.difficulty')}</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(value) => setDifficulty(value as CommunityExerciseDifficulty)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{tdiff(difficulty)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEGINNER">{tdiff('BEGINNER')}</SelectItem>
                      <SelectItem value="INTERMEDIATE">{tdiff('INTERMEDIATE')}</SelectItem>
                      <SelectItem value="ADVANCED">{tdiff('ADVANCED')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <CommunityExerciseBuilder
                exerciseType={exerciseType}
                draft={exerciseDraft}
                onChange={setExerciseDraft}
                disabled={createPost.isPending}
                showErrors={showErrors}
              />

              <div>
                <Label className="mb-1.5 block text-xs font-medium text-neutral-500">{t('exercise.explanation')}</Label>
                <Textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder={t('exercise.explanationPlaceholder')}
                  rows={3}
                  disabled={createPost.isPending}
                />
              </div>
            </div>
          ) : null}

          {showPool ? (
            <div className="border-t border-neutral-200 px-5 py-4">
              <p className="text-sm text-neutral-500">Pool creation coming soon</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) void handleImageUpload(files);
              }}
            />
            {imageList.length < MAX_IMAGES ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-neutral-500 hover:text-neutral-800"
                onClick={() => fileInputRef.current?.click()}
                disabled={createPost.isPending}
                aria-label={t('fields.images')}
              >
                <ImagePlus className="size-5" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(
                'text-neutral-500 hover:text-neutral-800',
                showTags && 'bg-neutral-100 text-neutral-900',
              )}
              onClick={() => setShowTags((prev) => !prev)}
              disabled={createPost.isPending}
              aria-label={t('fields.tags')}
            >
              <Hash className="size-5" />
            </Button>
            {type === 'POST' ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(
                  'text-neutral-500 hover:text-neutral-800',
                  showPool && 'bg-neutral-100 text-neutral-900',
                )}
                onClick={() => setShowPool((prev) => !prev)}
                disabled={createPost.isPending}
                aria-label="Create pool"
              >
                <Vote className="size-5" />
              </Button>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            variant="gradient"
            className="h-9 rounded-full px-5 text-sm font-medium"
            size="lg"
          >
            {createPost.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              t('modal.submit')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
