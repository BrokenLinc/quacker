import * as UI from './chakra-compat';
import { Icon } from './Icon';
import {
  faBold,
  faHeading,
  faItalic,
  faLink,
} from '@fortawesome/free-solid-svg-icons';
import { EditorContent, useEditor } from '@tiptap/react';
import React from 'react';
import { createRichTextExtensions } from './richText/extensions';

export type RichTextEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minH?: UI.BoxProps['minH'];
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Say something!',
  minH = 10,
}) => {
  const borderColor = UI.useColorModeValue('gray.200', 'gray.600');
  const toolbarBg = UI.useColorModeValue('gray.50', 'gray.700');
  const placeholderColor = UI.useColorModeValue('gray.400', 'gray.500');
  const extensions = React.useMemo(
    () => createRichTextExtensions({ placeholder }),
    [placeholder],
  );

  const editor = useEditor({
    extensions,
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        'aria-label': placeholder,
        'data-testid': 'message-editor',
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

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previousUrl ?? 'https://');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!editor) return null;

  return (
    <UI.Box
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      overflow="hidden"
      bg="chakra-body-bg"
    >
      <UI.HStack
        px={2}
        py={1}
        spacing={1}
        bg={toolbarBg}
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <UI.IconButton
          aria-label="Bold"
          size="xs"
          variant={editor.isActive('bold') ? 'solid' : 'ghost'}
          colorScheme={editor.isActive('bold') ? 'green' : undefined}
          icon={<Icon icon={faBold} />}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <UI.IconButton
          aria-label="Italic"
          size="xs"
          variant={editor.isActive('italic') ? 'solid' : 'ghost'}
          colorScheme={editor.isActive('italic') ? 'green' : undefined}
          icon={<Icon icon={faItalic} />}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <UI.IconButton
          aria-label="Heading"
          size="xs"
          variant={editor.isActive('heading', { level: 1 }) ? 'solid' : 'ghost'}
          colorScheme={
            editor.isActive('heading', { level: 1 }) ? 'green' : undefined
          }
          icon={<Icon icon={faHeading} />}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        />
        <UI.IconButton
          aria-label="Link"
          size="xs"
          variant={editor.isActive('link') ? 'solid' : 'ghost'}
          colorScheme={editor.isActive('link') ? 'green' : undefined}
          icon={<Icon icon={faLink} />}
          onClick={setLink}
        />
      </UI.HStack>
      <UI.SxBox
        px={3}
        py={2}
        pr={24}
        minH={minH}
        sx={{
          '.ProseMirror': {
            outline: 'none',
            minH: '1.5rem',
            '& p': { margin: 0 },
            '& p + p': { mt: 2 },
            '& h1': { fontSize: 'lg', fontWeight: 'bold', lineHeight: 'short' },
            '& a': { color: 'var(--chakra-colors-purple-500)', textDecoration: 'underline' },
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
      </UI.SxBox>
    </UI.Box>
  );
};
