import * as UI from '@chakra-ui/react';
import { EditorContent, useEditor } from '@tiptap/react';
import React from 'react';
import { createRichTextExtensions } from './richText/extensions';

export type RichTextContentProps = {
  content: string;
  emptyFallback?: React.ReactNode;
  /**
   * Rendered in the same text flow after the markdown (e.g. muted
   * “(edited)”). Uses inline layout so a short suffix sits on the last line.
   */
  trailing?: React.ReactNode;
};

const RichTextDocument: React.FC<{
  markdown: string;
  trailing?: React.ReactNode;
}> = ({ markdown, trailing }) => {
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
      display={trailing ? 'inline' : undefined}
      sx={{
        '.ProseMirror': {
          outline: 'none',
          ...(trailing
            ? {
                display: 'inline',
                '& > *:last-child': { display: 'inline' },
              }
            : {}),
          '& p': { margin: 0 },
          '& p + p': { mt: 2, display: trailing ? 'block' : undefined },
          '& h1': { fontSize: 'lg', fontWeight: 'bold', lineHeight: 'short' },
          '& h2, & h3': { fontSize: 'md', fontWeight: 'semibold', lineHeight: 'short' },
            '& a': {
              color: 'var(--chakra-colors-action-600)',
              textDecoration: 'underline',
            },
            '& code': {
              fontFamily: 'mono',
              fontSize: '0.875em',
              px: 1,
              py: 0.5,
              borderRadius: 'sm',
              bg: 'var(--chakra-colors-surface-sunken)',
            },
        },
      }}
    >
      <EditorContent editor={editor} />
      {trailing ? (
        <>
          {'\u00a0'}
          {trailing}
        </>
      ) : null}
    </UI.Box>
  );
};

export const RichTextContent: React.FC<RichTextContentProps> = ({
  content,
  emptyFallback = '🤔',
  trailing,
}) => {
  const markdown = content.trim();

  if (!markdown) {
    return (
      <UI.Text>
        {emptyFallback}
        {trailing ? (
          <>
            {'\u00a0'}
            {trailing}
          </>
        ) : null}
      </UI.Text>
    );
  }

  return <RichTextDocument markdown={markdown} trailing={trailing} />;
};
