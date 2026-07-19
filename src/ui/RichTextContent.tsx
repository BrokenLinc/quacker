import * as UI from '@chakra-ui/react';
import { EditorContent, useEditor } from '@tiptap/react';
import React from 'react';
import { createRichTextExtensions } from './richText/extensions';

export type RichTextContentProps = {
  content: string;
  emptyFallback?: React.ReactNode;
};

const RichTextDocument: React.FC<{ markdown: string }> = ({ markdown }) => {
  const extensions = React.useMemo(
    () => createRichTextExtensions({ openLinksOnClick: true }),
    [],
  );

  const editor = useEditor({
    extensions,
    content: markdown,
    contentType: 'markdown',
    editable: false,
  });

  React.useEffect(() => {
    if (!editor) return;

    editor.commands.setContent(markdown, { contentType: 'markdown' });
  }, [editor, markdown]);

  if (!editor) return null;

  return (
    <UI.Box
      sx={{
        '.ProseMirror': {
          outline: 'none',
          '& p': { margin: 0 },
          '& p + p': { mt: 2 },
          '& h1': { fontSize: 'lg', fontWeight: 'bold', lineHeight: 'short' },
          '& h2, & h3': { fontSize: 'md', fontWeight: 'semibold', lineHeight: 'short' },
          '& a': { color: 'var(--chakra-colors-purple-500)', textDecoration: 'underline' },
        },
      }}
    >
      <EditorContent editor={editor} />
    </UI.Box>
  );
};

export const RichTextContent: React.FC<RichTextContentProps> = ({
  content,
  emptyFallback = '🤔',
}) => {
  const markdown = content.trim();

  if (!markdown) {
    return <UI.Text>{emptyFallback}</UI.Text>;
  }

  return <RichTextDocument markdown={markdown} />;
};
