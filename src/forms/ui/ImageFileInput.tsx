import * as UI from '@@ui';
import { FileInput, FileInputProps } from './FileInput';

export type ImageFileInputProps = Omit<FileInputProps, 'value' | 'onChange'> & {
  value?: File | null;
  onChange?: (files?: File | null) => any;
};

/**
 * A file input that is tailored for the app's image management system.
 */
export const ImageFileInput = ({
  value,
  onChange,
  ...restProps
}: ImageFileInputProps) => {
  return (
    <UI.VStack>
      <UI.InputGroup>
        <FileInput
          multiple={false}
          value={value}
          onChange={(newValue) => onChange?.(newValue as File)}
          {...restProps}
        />
      </UI.InputGroup>
      {value ? (
        <UI.Image
          borderRadius="md"
          src={URL.createObjectURL(value)}
          alt="image preview"
        />
      ) : null}
    </UI.VStack>
  );
};
