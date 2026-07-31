import * as UI from '@chakra-ui/react';
import { faBold, faItalic } from '@fortawesome/free-solid-svg-icons';
import { EditorContent, useEditor } from '@tiptap/react';
import React from 'react';

import { createRichTextExtensions } from './richText/extensions';
import { IconButton } from './IconButton';

export type RichTextEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  /** Called on Enter (Shift+Enter inserts a newline). */
  onSubmit?: () => void;
  placeholder?: string;
  minH?: UI.BoxProps['minH'];
  /** Soft limit enforced by TipTap CharacterCount. */
  maxLength?: number;
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Say something!',
  minH = 10,
  maxLength,
}) => {
  const placeholderColor = UI.useColorModeValue('gray.400', 'gray.500');
  const isMobile = UI.useBreakpointValue({ base: true, md: false }) ?? false;
  const [focused, setFocused] = React.useState(false);
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

  if (!editor) return null;

  const showToolbar = !isMobile || focused;
  const keepFocus = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <UI.Box
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
      {showToolbar ? (
        <UI.HStack px={2} pt={2} spacing={1}>
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
        </UI.HStack>
      ) : null}
      <UI.Box
        px={3}
        py={3}
        pr={14}
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
    </UI.Box>
  );
};
