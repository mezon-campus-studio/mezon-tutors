'use client';

import { CLOUDINARY_FOLDER, MAX_IMAGE_SIZE_MB } from '@mezon-tutors/shared';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  BookOpen,
  Code2,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Underline,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  Heading1,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui';
import { plainTextToBlogHtml } from '@/lib/blog-content';
import { cn } from '@/lib/utils';
import { cloudinaryService } from '@/services';

type BlogRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  label?: string;
};

async function uploadBlogImage(file: File): Promise<string> {
  const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
  }

  const result = await cloudinaryService.uploadFileWithSignature(
    file,
    CLOUDINARY_FOLDER.BLOG,
    'image'
  );
  return result.secureUrl;
}

function insertImageFile(editor: Editor, file: File, onUploading: (v: boolean) => void) {
  onUploading(true);
  void uploadBlogImage(file)
    .then((url) => {
      editor.chain().focus().setImage({ src: url }).run();
    })
    .catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    })
    .finally(() => {
      onUploading(false);
    });
}

export function BlogRichTextEditor({ value, onChange, disabled, label }: BlogRichTextEditorProps) {
  const t = useTranslations('Blogs.create.editor');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const editorRef = useRef<Editor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialContent = useRef(plainTextToBlogHtml(value));
  const skipUpdateRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-violet-700 underline',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'block mx-auto my-8 rounded-xl border border-violet-100',
        },
      }),
      Placeholder.configure({
        placeholder: t('placeholder'),
      }),
    ],
    content: initialContent.current,
    editable: !disabled,
    onCreate: ({ editor: createdEditor }) => {
      editorRef.current = createdEditor;
    },
    onUpdate: ({ editor: updatedEditor }) => {
      if (skipUpdateRef.current) return;
      onChange(updatedEditor.getHTML());
      setWordCount(countWords(updatedEditor.getHTML()));
    },
    editorProps: {
      attributes: {
        class:
          'tiptap min-h-[320px] max-h-[600px] overflow-y-auto px-4 py-3 text-sm leading-7 text-slate-800 focus:outline-none',
      },
      handlePaste: (_view, event) => {
        const editorInstance = editorRef.current;
        if (!editorInstance || disabled) return false;

        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));
        if (!imageItem) return false;

        const file = imageItem.getAsFile();
        if (!file) return false;

        event.preventDefault();
        insertImageFile(editorInstance, file, setUploadingImage);
        return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        const editorInstance = editorRef.current;
        if (!editorInstance || disabled || moved) return false;

        const file = Array.from(event.dataTransfer?.files ?? []).find((item) =>
          item.type.startsWith('image/')
        );
        if (!file) return false;

        event.preventDefault();
        insertImageFile(editorInstance, file, setUploadingImage);
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    setWordCount(countWords(editor.getHTML()));
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const nextContent = plainTextToBlogHtml(value);
    if (nextContent === editor.getHTML()) return;

    skipUpdateRef.current = true;
    editor.commands.setContent(nextContent, { emitUpdate: false });
    skipUpdateRef.current = false;
  }, [editor, value]);

  const runCommand = (command: () => void) => {
    if (disabled) return;
    command();
  };

  return (
    <div className="space-y-2">
      {label ? <Label>{label}</Label> : null}

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm',
          disabled && 'opacity-60'
        )}
      >
        <div className="flex flex-wrap items-center gap-1 border-b border-violet-100 bg-violet-50/40 px-2 py-1.5">
          <ToolbarButton
            active={editor?.isActive('bold')}
            disabled={disabled}
            label={t('bold')}
            onClick={() => runCommand(() => editor?.chain().focus().toggleBold().run())}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('italic')}
            disabled={disabled}
            label={t('italic')}
            onClick={() => runCommand(() => editor?.chain().focus().toggleItalic().run())}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('underline')}
            disabled={disabled}
            label={t('underline')}
            onClick={() => runCommand(() => editor?.chain().focus().toggleUnderline().run())}
          >
            <Underline className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('heading', { level: 2 })}
            disabled={disabled}
            label={t('heading1')}
            onClick={() =>
              runCommand(() => editor?.chain().focus().toggleHeading({ level: 1 }).run())
            }
          >
            <Heading1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('heading', { level: 2 })}
            disabled={disabled}
            label={t('heading2')}
            onClick={() =>
              runCommand(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())
            }
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('heading', { level: 3 })}
            disabled={disabled}
            label={t('heading3')}
            onClick={() =>
              runCommand(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())
            }
          >
            <Heading3 className="size-4" />
          </ToolbarButton>
          <span className="mx-0.5 h-5 w-px bg-violet-100" />
          <ToolbarButton
            active={editor?.isActive('bulletList')}
            disabled={disabled}
            label={t('bulletList')}
            onClick={() => runCommand(() => editor?.chain().focus().toggleBulletList().run())}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('orderedList')}
            disabled={disabled}
            label={t('orderedList')}
            onClick={() => runCommand(() => editor?.chain().focus().toggleOrderedList().run())}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('strike')}
            disabled={disabled}
            label={t('strike')}
            onClick={() => runCommand(() => editor?.chain().focus().toggleStrike().run())}
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('blockquote')}
            disabled={disabled}
            label={t('blockquote')}
            onClick={() => runCommand(() => editor?.chain().focus().toggleBlockquote().run())}
          >
            <Quote className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('codeBlock')}
            disabled={disabled}
            label={t('codeBlock')}
            onClick={() => runCommand(() => editor?.chain().focus().toggleCodeBlock().run())}
          >
            <Code2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled}
            label={t('horizontalRule')}
            onClick={() => runCommand(() => editor?.chain().focus().setHorizontalRule().run())}
          >
            <Minus className="size-4" />
          </ToolbarButton>
          <span className="mx-0.5 h-5 w-px bg-violet-100" />
          <ToolbarButton
            active={editor?.isActive('link')}
            disabled={disabled}
            label={t('link')}
            onClick={() => {
              if (!editor || disabled) return;
              const previousUrl = editor.getAttributes('link').href as string | undefined;
              const url = window.prompt(t('linkPrompt'), previousUrl ?? 'https://');
              if (url === null) return;
              if (url === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                return;
              }
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }}
          >
            <Link2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled || uploadingImage}
            label={t('image')}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingImage ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImageIcon className="size-4" />
            )}
          </ToolbarButton>
          <span className="mx-0.5 h-5 w-px bg-violet-100" />
          <ToolbarButton
            disabled={disabled}
            label={t('undo')}
            onClick={() => runCommand(() => editor?.chain().focus().undo().run())}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled}
            label={t('redo')}
            onClick={() => runCommand(() => editor?.chain().focus().redo().run())}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploadingImage}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file || !editor) return;
              insertImageFile(editor, file, setUploadingImage);
              event.target.value = '';
            }}
          />
        </div>

        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400">{t('pasteHint')}</p>
        {wordCount > 0 ? (
          <p className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <BookOpen className="size-3" />
            <span>
              {t('words', { count: wordCount })} ·{' '}
              {t('readTime', { minutes: estimateReadingTime(wordCount) })}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}

function countWords(html: string): number {
  const text = stripHtml(html).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

function ToolbarButton({
  children,
  active,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'cursor-pointer inline-flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors',
        active ? 'bg-violet-100 text-violet-700' : 'hover:bg-violet-50 hover:text-violet-700',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {children}
    </button>
  );
}
