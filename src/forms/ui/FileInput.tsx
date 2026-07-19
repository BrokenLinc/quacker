import * as UI from '@@ui';
import { useRef } from 'react';

export type FileInputProps = Omit<UI.InputProps, 'value' | 'onChange'> & {
  value?: FileList | File | null;
  onChange?: (files?: FileList | File | null) => any;
  isDisabled?: boolean;
  isReadOnly?: boolean;
};

/**
 * A file input that masks the raw HTML5 input[type=file] with
 * Chakra UI's Input component.
 * It expects a FileList as its value, and emits a FileList.
 */
export const FileInput = (props: FileInputProps) => {
  const {
    children,
    accept,
    multiple,
    value,
    onChange,
    isDisabled,
    isReadOnly,
    ...restProps
  } = props;
  const isEditable = !isDisabled && !isReadOnly;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleBrowseClick = () => {
    inputRef.current?.click();
  };

  const handleClearClick = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    props.onChange?.();
  };

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files?.length) {
      onChange?.(multiple ? e.target.files : e.target.files[0]);
    }
  };

  return (
    <UI.InputGroup
      endElement={
        value && isEditable ? (
          <UI.CloseButton aria-label="Remove file" onClick={handleClearClick} />
        ) : undefined
      }
    >
      <UI.Input
        cursor="pointer"
        onClick={handleBrowseClick}
        placeholder="Browse..."
        value={getFilesLabel(value)}
        textOverflow="ellipsis"
        readOnly
        disabled={isDisabled}
        {...restProps}
      />

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      {children}
    </UI.InputGroup>
  );
};

function getFilesLabel(value?: FileList | File | null) {
  if (!value) return '';
  if (value instanceof File) return value.name;
  return Array.from(value)
    .map((file) => file.name)
    .join(', ');
}
