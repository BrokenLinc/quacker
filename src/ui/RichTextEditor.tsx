import * as UI from '@chakra-ui/react';
import {
  faBold,
  faCode,
  faItalic,
  faLink,
} from '@fortawesome/free-solid-svg-icons';
import { EditorContent, useEditor } from '@tiptap/react';
import React from 'react';

import { createRichTextExtensions } from './richText/extensions';
import { IconButton } from './IconButton';
import {
  MorphingPopover,
  MorphingPopoverContent,
} from './MorphingPopover';

export type RichTextEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  /** Called on Enter (Shift+Enter inserts a newline). */
  onSubmit?: () => void;
  placeholder?: string;
  minH?: UI.BoxProps['minH'];
  /** Soft limit enforced by TipTap CharacterCount. */
  maxLength?: number;
  /** Right-side actions in the bottom toolbar (e.g. char count + Send). */
  trailing?: React.ReactNode;
};

const inlineCodeStyles = {
  fontFamily: 'mono',
  fontSize: '0.875em',
  px: 1,
  py: 0.5,
  borderRadius: 'sm',
  bg: 'surface.sunken',
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Say something!',
  minH = 10,
  maxLength,
  trailing,
}) => {
  const placeholderColor = UI.useColorModeValue('gray.400', 'gray.500');
  const isMobile = UI.useBreakpointValue({ base: true, md: false }) ?? false;
  const [focused, setFocused] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const extensions = React.useMemo(
    () => createRichTextExtensions({ placeholder, maxLength }),
    [placeholder, maxLength]
  );

  // Keep the latest onSubmit without re-creating the editor.
  const onSubmitRef = React.useRef(onSubmit);
  React.useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const editor = useEditor({
    extensions,
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        'aria-label': placeholder,
        'data-testid': 'message-editor',
      },
      handleKeyDown: (_view, event) => {
        if (
          event.key === 'Enter' &&
          !event.shiftKey &&
          !event.isComposing &&
          onSubmitRef.current
        ) {
          onSubmitRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getMarkdown());
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });

  React.useEffect(() => {
    if (!editor) return;

    if (value === '' && !editor.isEmpty) {
      editor.commands.clearContent(false);
    }
  }, [editor, value]);

  const openLinkPopover = () => {
    if (!editor) return;
    const existing = editor.getAttributes('link').href as string | undefined;
    setLinkUrl(existing ?? '');
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
    setLinkUrl('');
  };

  if (!editor) return null;

  const showToolbar = !isMobile || focused;
  const keepFocus = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <UI.Box
      position="relative"
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="xl"
      overflow="hidden"
      bg="surface.raised"
      transitionProperty="border-color, box-shadow"
      transitionDuration="150ms"
      _focusWithin={{
        borderColor: 'action.500',
        boxShadow: '0 0 0 1px var(--chakra-colors-action-500)',
      }}
    >
      <UI.Box
        px={3}
        py={3}
        pr={showToolbar ? 3 : 14}
        minH={minH}
        sx={{
          '.ProseMirror': {
            outline: 'none',
            minH: '1.5rem',
            '& p': { margin: 0 },
            '& p + p': { mt: 2 },
            '& h1': { fontSize: 'lg', fontWeight: 'bold', lineHeight: 'short' },
            '& a': {
              color: 'var(--chakra-colors-action-600)',
              textDecoration: 'underline',
            },
            '& code': inlineCodeStyles,
          },
          '.ProseMirror p.is-editor-empty:first-child::before': {
            color: placeholderColor,
            content: 'attr(data-placeholder)',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
          },
        }}
      >
        <EditorContent editor={editor} />
      </UI.Box>
      {showToolbar ? (
        <UI.HStack px={2} pb={2} pt={1} spacing={1} align="center">
          <IconButton
            aria-label="Bold"
            size="xs"
            variant={editor.isActive('bold') ? 'solid' : 'ghost'}
            colorScheme={editor.isActive('bold') ? 'action' : undefined}
            icon={faBold}
            onMouseDown={keepFocus}
            onPointerDown={keepFocus}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <IconButton
            aria-label="Italic"
            size="xs"
            variant={editor.isActive('italic') ? 'solid' : 'ghost'}
            colorScheme={editor.isActive('italic') ? 'action' : undefined}
            icon={faItalic}
            onMouseDown={keepFocus}
            onPointerDown={keepFocus}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <IconButton
            aria-label="Code"
            size="xs"
            variant={editor.isActive('code') ? 'solid' : 'ghost'}
            colorScheme={editor.isActive('code') ? 'action' : undefined}
            icon={faCode}
            onMouseDown={keepFocus}
            onPointerDown={keepFocus}
            onClick={() => editor.chain().focus().toggleCode().run()}
          />
          <MorphingPopover open={linkOpen} onOpenChange={setLinkOpen}>
            <IconButton
              aria-label="Link"
              size="xs"
              variant={editor.isActive('link') ? 'solid' : 'ghost'}
              colorScheme={editor.isActive('link') ? 'action' : undefined}
              icon={faLink}
              onMouseDown={keepFocus}
              onPointerDown={keepFocus}
              onClick={openLinkPopover}
            />
            <MorphingPopoverContent title="Add link" aria-label="Add link">
              <UI.VStack align="stretch" spacing={3} p={1}>
                <UI.Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  aria-label="Link URL"
                  size="sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                />
                <UI.HStack spacing={2} justify="flex-end">
                  <UI.Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLinkOpen(false)}
                  >
                    Cancel
                  </UI.Button>
                  <UI.Button
                    size="sm"
                    colorScheme="action"
                    variant="solid"
                    onClick={applyLink}
                  >
                    Apply
                  </UI.Button>
                </UI.HStack>
              </UI.VStack>
            </MorphingPopoverContent>
          </MorphingPopover>
          <UI.Spacer flex={1} />
          {trailing}
        </UI.HStack>
      ) : trailing ? (
        <UI.HStack
          position="absolute"
          bottom={2}
          right={2}
          spacing={2}
          align="center"
          pointerEvents="auto"
        >
          {trailing}
        </UI.HStack>
      ) : null}
    </UI.Box>
  );
};
