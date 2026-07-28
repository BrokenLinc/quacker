import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

type RichTextExtensionOptions = {
  placeholder?: string;
  openLinksOnClick?: boolean;
  maxLength?: number;
};

export const createRichTextExtensions = ({
  placeholder,
  openLinksOnClick = false,
  maxLength,
}: RichTextExtensionOptions = {}) => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
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
  ...(maxLength != null
    ? [CharacterCount.configure({ limit: maxLength })]
    : []),
];
