import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

type RichTextExtensionOptions = {
  placeholder?: string;
  openLinksOnClick?: boolean;
};

export const createRichTextExtensions = ({
  placeholder,
  openLinksOnClick = false,
}: RichTextExtensionOptions = {}) => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Link.configure({
    openOnClick: openLinksOnClick,
    autolink: true,
    defaultProtocol: 'https',
  }),
  Markdown,
  ...(placeholder
    ? [
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
      ]
    : []),
];
