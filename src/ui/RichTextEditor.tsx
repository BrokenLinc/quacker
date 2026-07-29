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
  const extensions = React.useMemo(
    () => createRichTextExtensions({ placeholder, maxLength }),
    [placeholder, maxLength],
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
  });

  React.useEffect(() => {
    if (!editor) return;

    if (value === '' && !editor.isEmpty) {
      editor.commands.clearContent(false);
    }
  }, [editor, value]);

  if (!editor) return null;

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
      <UI.HStack px={2} py={1} spacing={1}>
        <IconButton
          aria-label="Bold"
          size="xs"
          variant={editor.isActive('bold') ? 'solid' : 'ghost'}
          colorScheme={editor.isActive('bold') ? 'action' : undefined}
          icon={faBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <IconButton
          aria-label="Italic"
          size="xs"
          variant={editor.isActive('italic') ? 'solid' : 'ghost'}
          colorScheme={editor.isActive('italic') ? 'action' : undefined}
          icon={faItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
      </UI.HStack>
      <UI.Box
        px={3}
        py={2}
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
