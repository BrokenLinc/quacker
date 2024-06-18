import { getMetaFieldName } from '@@helpers/getMetaFieldName';
import { subtypeMetas } from '@@helpers/subtypeMetas';
import * as UI from '@chakra-ui/react';
import _ from 'lodash';
import React from 'react';
import {
  CheckboxGroupWithOptions,
  CheckboxGroupWithOptionsProps,
} from './CheckboxGroupWithOptions';
import { CheckboxInput, CheckboxInputProps } from './CheckboxInput';
import { ComboboxInput, ComboboxInputProps } from './ComboboxInput';
import {
  ComboboxPaginatedInput,
  ComboboxPaginatedInputProps,
} from './ComboboxPaginatedInput';
import {
  DateOnlyPartsInput,
  DateOnlyPartsInputProps,
} from './DateOnlyPartsInput';
import { DatePartsInput, DatePartsInputProps } from './DatePartsInput';
import {
  DateTimePartsInput,
  DateTimePartsInputProps,
} from './DateTimePartsInput';
import { FileInput, FileInputProps } from './FileInput';
import { ImageFileInput, ImageFileInputProps } from './ImageFileInput';
import { MaskedInput, MaskedInputProps } from './MaskedInput';
import { MoneyInput, MoneyInputProps } from './MoneyInput';
import { NumberInput, NumberInputProps } from './NumberInput';
import { RadioWithOptions, RadioWithOptionsProps } from './RadioWithOptions';
import { SelectWithOptions, SelectWithOptionsProps } from './SelectWithOptions';
import { SwitchInput, SwitchInputProps } from './SwitchInput';
import {
  TimeOnlyPartsInput,
  TimeOnlyPartsInputProps,
} from './TimeOnlyPartsInput';

/* Renders a different input depending on type */
/* Must be placed inside a form-context-provider */
export type BaseInputByTypeProps =
  | {
      type: 'checkboxGroup';
      /**
       * Supports all props of [@chakra-ui/checkbox-group](https://chakra-ui.com/docs/form/checkbox/usage#checkboxgroup)
       * */
      input: CheckboxGroupWithOptionsProps;
    }
  | {
      type: 'checkbox';
      /**
       * Supports all props of [@chakra-ui/checkbox](https://chakra-ui.com/docs/form/checkbox)
       * */
      input?: CheckboxInputProps;
    }
  | {
      type: 'switch';
      /**
       * Supports all props of [@chakra-ui/switch](https://chakra-ui.com/docs/form/switch)
       * */
      input?: SwitchInputProps;
    }
  | {
      type: 'combobox';
      /**
       * Supports all props of [chakra-react-select/AsyncSelect](https://www.npmjs.com/package/chakra-react-select), and by extension [react-select/async](https://react-select.com/async)
       */
      input?: ComboboxInputProps;
    }
  | {
      type: 'combobox-paginated';
      /**
       * Supports... TBD
       */
      input: ComboboxPaginatedInputProps;
    }
  | {
      type: 'radio';
      /**
       * Supports all props of [@chakra-ui/radiogroup](https://chakra-ui.com/docs/form/radio)
       */
      input: RadioWithOptionsProps;
    }
  | {
      type: 'select';
      /**
       * Supports all props of [@chakra-ui/select](https://chakra-ui.com/docs/form/select)
       */
      input: SelectWithOptionsProps;
    }
  | {
      type: 'dateparts';
      /**
       * Supports all props of [@chakra-ui/input](https://chakra-ui.com/docs/form/input), but with a value type of Date
       * */
      input?: DatePartsInputProps;
    }
  | {
      type: 'dateonlyparts';
      /**
       * Supports all props of [@chakra-ui/input](https://chakra-ui.com/docs/form/input)
       */
      input?: Partial<DateOnlyPartsInputProps>;
    }
  | {
      type: 'datetimeparts';
      /**
       * Supports all props of [@chakra-ui/input](https://chakra-ui.com/docs/form/input)
       */
      input?: Partial<DateTimePartsInputProps>;
    }
  | {
      type: 'file';
      /**
       * Supports all props of [@chakra-ui/input](https://chakra-ui.com/docs/form/input)
       */
      input?: Partial<FileInputProps>;
    }
  | {
      type: 'image-file';
      /**
       * Supports all props of [@chakra-ui/input](https://chakra-ui.com/docs/form/input)
       */
      input?: Partial<ImageFileInputProps>;
    }
  | {
      type: 'money';
      /**
       * Supports all props of [react-currency-input-field](https://www.npmjs.com/package/react-currency-input-field)
       */
      input?: Partial<MoneyInputProps>;
    }
  | {
      type: 'number' | 'integer';
      /**
       * Supports all props of [react-number-format/NumericFormat](https://www.npmjs.com/package/react-number-format)
       */
      input?: Partial<NumberInputProps> & { asString?: boolean };
    }
  | {
      type: 'textarea';
      /**
       * Supports all props of [@chakra-ui/textarea](https://chakra-ui.com/docs/form/textarea)
       * */
      input?: UI.TextareaProps;
    }
  | {
      type: 'businessPhone' | 'phone' | 'zip';
      input?: Partial<MaskedInputProps>;
    }
  | {
      type?: 'email' | 'password' | 'text';
      /**
       * Supports all props of [@chakra-ui/input](https://chakra-ui.com/docs/form/input)
       * */
      input?: UI.InputProps;
    }
  | {
      type: 'timeonlyparts';
      /**
       * Supports all props of [@chakra-ui/input](https://chakra-ui.com/docs/form/input)
       */
      input?: Partial<TimeOnlyPartsInputProps>;
    };

export type ControllerFieldProps = {
  name: string;
  value?: any;
  onChange: (...event: any[]) => void;
  onBlur?: () => void;
  /**
   * refs will help React hook form with field value synchronization.
   * But in some oddball cases (eg. Family Account Statuses) it breaks the form.
   * IMPORTANT: If you use this, make sure to set a default boolean value for the field.
   */
  disableInputRef?: boolean;
};

export type BaseInputProps = BaseInputByTypeProps & ControllerFieldProps & {};

const renderBaseInputWithRef = (
  { name, value, disableInputRef, onChange, type, input }: BaseInputProps,
  ref: React.Ref<HTMLInputElement>
) => {
  if (type === 'money') {
    return (
      <MoneyInput {...input} id={name} value={value} onChange={onChange} />
    );
  }

  if (type === 'switch') {
    return (
      <SwitchInput
        {...input}
        ref={input?.isDisabled || disableInputRef ? undefined : ref}
        isChecked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (type === 'checkbox') {
    return (
      <CheckboxInput
        {...input}
        ref={input?.isDisabled || disableInputRef ? undefined : ref}
        isChecked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (type === 'checkboxGroup') {
    return (
      <CheckboxGroupWithOptions {...input} value={value} onChange={onChange} />
    );
  }

  if (type === 'dateparts') {
    return <DatePartsInput {...input} value={value} onChange={onChange} />;
  }

  if (type === 'dateonlyparts') {
    return <DateOnlyPartsInput {...input} value={value} onChange={onChange} />;
  }

  if (type === 'datetimeparts') {
    return <DateTimePartsInput {...input} value={value} onChange={onChange} />;
  }

  if (type === 'file') {
    return <FileInput {...input} value={value} onChange={onChange} />;
  }

  if (type === 'image-file') {
    return <ImageFileInput {...input} value={value} onChange={onChange} />;
  }

  if (type === 'combobox') {
    return (
      <ComboboxInput
        {...input}
        inputId={name}
        onChange={(option) => {
          // Stash the label in the meta field
          // This is especially useful when the form state is saved (eg. in searchParams or sessionStorage)
          const labelFieldName = getMetaFieldName(name, 'comboboxLabel');
          const metaValues = labelFieldName
            ? { [labelFieldName]: option?.label }
            : undefined;
          // Option will be null if the user clears the input
          onChange(option?.value || option, metaValues);
        }}
        // Note: We let the component set the value.label internally
        value={value}
      />
    );
  }

  if (type === 'combobox-paginated') {
    return (
      <ComboboxPaginatedInput
        {...input}
        inputId={name}
        onChange={(option: { value: any; label: string }) => {
          // Stash the label in the meta field
          // This is especially useful when the form state is saved (eg. in searchParams or sessionStorage)
          const labelFieldName = getMetaFieldName(name, 'comboboxLabel');
          const metaValues = labelFieldName
            ? { [labelFieldName]: option?.label }
            : undefined;
          // Option will be null if the user clears the input
          onChange(option?.value || option, metaValues);
        }}
        // Note: We let the component set the value.label internally
        value={value}
      />
    );
  }

  if (type === 'radio') {
    return <RadioWithOptions {...input} value={value} onChange={onChange} />;
  }

  if (type === 'select') {
    return (
      <SelectWithOptions
        {...input}
        id={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === 'number' || type === 'integer') {
    return (
      <NumberInput
        decimalScale={type === 'integer' ? 0 : undefined}
        {..._.omit(input, 'asString')}
        id={name}
        value={input?.asString ? value : parseFloat(value)}
        onValueChange={(values) => {
          const castedValue = input?.asString
            ? values.value
            : values.floatValue;
          onChange(castedValue ?? null);
        }}
      />
    );
  }

  if (type === 'textarea') {
    return (
      <UI.Textarea
        {...input}
        id={name}
        value={value ?? ''}
        onChange={(e) => {
          // Assist validation in identifying empty strings as undefined.
          onChange(e.target.value);
        }}
      />
    );
  }

  if (type === 'businessPhone' || type === 'phone' || type === 'zip') {
    const mask = subtypeMetas[type].mask;
    return (
      <MaskedInput
        data-lpignore="true"
        {...input}
        type={type === 'phone' ? 'tel' : undefined}
        id={name}
        maskGenerator={mask}
        value={value ?? ''}
        onChange={(value) => {
          // Assist validation in identifying empty strings as undefined.
          onChange(value);
        }}
      />
    );
  }

  if (
    type === 'email' ||
    type === 'password' ||
    type === 'text' ||
    type === undefined
  ) {
    return (
      <UI.Input
        type={type}
        data-lpignore="true"
        {...input}
        id={name}
        value={value ?? ''}
        onChange={(e) => {
          // Assist validation in identifying empty strings as undefined.
          onChange(e.target.value || null);
        }}
      />
    );
  }

  if (type === 'timeonlyparts') {
    return <TimeOnlyPartsInput {...input} value={value} onChange={onChange} />;
  }

  return null;
};
export const BaseInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  renderBaseInputWithRef
);
