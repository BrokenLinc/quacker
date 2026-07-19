import {
  Alert as ChakraAlert,
  Avatar as ChakraAvatar,
  Checkbox as ChakraCheckbox,
  Image as ChakraImage,
  RadioGroup as ChakraRadioGroup,
  Switch as ChakraSwitch,
  Separator,
  type AlertRootProps,
  type AvatarRootProps,
  type CheckboxRootProps,
  type ImageProps,
  type RadioGroupRootProps,
  type SwitchRootProps,
} from '@chakra-ui/react';
import React from 'react';
import { mapV2Props } from './props';

export type AlertProps = AlertRootProps & { status?: AlertRootProps['status'] };

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  function Alert({ children, ...props }, ref) {
    return (
      <ChakraAlert.Root ref={ref} {...mapV2Props(props)}>
        <ChakraAlert.Indicator />
        <ChakraAlert.Content>{children}</ChakraAlert.Content>
      </ChakraAlert.Root>
    );
  }
);

export const AlertTitle = ChakraAlert.Title;
export const AlertDescription = ChakraAlert.Description;

export type AvatarProps = AvatarRootProps & {
  name?: string;
  src?: string;
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  function Avatar({ name, src, children, ...props }, ref) {
    return (
      <ChakraAvatar.Root ref={ref} {...mapV2Props(props)}>
        {src ? <ChakraAvatar.Image src={src} alt={name} /> : null}
        <ChakraAvatar.Fallback name={name}>{children}</ChakraAvatar.Fallback>
      </ChakraAvatar.Root>
    );
  }
);

export type CheckboxProps = Omit<CheckboxRootProps, 'onChange'> & {
  isChecked?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isIndeterminate?: boolean;
  sx?: Record<string, unknown>;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ children, onChange, ...props }, ref) {
    const mapped = mapV2Props(props) as CheckboxRootProps & {
      checked?: boolean;
      indeterminate?: boolean;
    };
    if ('isChecked' in props) mapped.checked = props.isChecked;
    if ('isIndeterminate' in props) mapped.indeterminate = props.isIndeterminate;

    return (
      <ChakraCheckbox.Root {...mapped}>
        <ChakraCheckbox.HiddenInput ref={ref} onChange={onChange} />
        <ChakraCheckbox.Control>
          <ChakraCheckbox.Indicator />
        </ChakraCheckbox.Control>
        {children ? <ChakraCheckbox.Label>{children}</ChakraCheckbox.Label> : null}
      </ChakraCheckbox.Root>
    );
  }
);

export type CheckboxGroupProps = Omit<React.ComponentProps<'div'>, 'onChange'> & {
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  isDisabled?: boolean;
};

export const CheckboxGroup = ({
  value,
  defaultValue,
  onChange,
  children,
  ...rest
}: CheckboxGroupProps) => (
  <ChakraCheckbox.Group
    value={value}
    defaultValue={defaultValue}
    onValueChange={(values) => onChange?.(values)}
    {...mapV2Props(rest)}
  >
    {children}
  </ChakraCheckbox.Group>
);

export type RadioGroupProps = Omit<RadioGroupRootProps, 'onChange'> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  isDisabled?: boolean;
};

export const RadioGroup = ({
  value,
  defaultValue,
  onChange,
  children,
  ...rest
}: RadioGroupProps) => (
  <ChakraRadioGroup.Root
    value={value}
    defaultValue={defaultValue}
    onValueChange={(details) => onChange?.(details.value ?? '')}
    {...mapV2Props(rest)}
  >
    {children}
  </ChakraRadioGroup.Root>
);

export type RadioProps = React.ComponentProps<typeof ChakraRadioGroup.Item> & {
  value: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
};

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  function Radio({ children, value, ...props }, ref) {
    return (
      <ChakraRadioGroup.Item value={value} {...mapV2Props(props)}>
        <ChakraRadioGroup.ItemHiddenInput ref={ref} />
        <ChakraRadioGroup.ItemIndicator />
        {children ? (
          <ChakraRadioGroup.ItemText>{children}</ChakraRadioGroup.ItemText>
        ) : null}
      </ChakraRadioGroup.Item>
    );
  }
);

export type SwitchProps = Omit<SwitchRootProps, 'onChange'> & {
  isChecked?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  function Switch({ onChange, ...props }, ref) {
    const mapped = mapV2Props(props) as SwitchRootProps & { checked?: boolean };
    if ('isChecked' in props) mapped.checked = props.isChecked;
    return (
      <ChakraSwitch.Root {...mapped}>
        <ChakraSwitch.HiddenInput ref={ref} onChange={onChange} />
        <ChakraSwitch.Control>
          <ChakraSwitch.Thumb />
        </ChakraSwitch.Control>
      </ChakraSwitch.Root>
    );
  }
);

export { ChakraImage as Image };
export type { ImageProps };

export { Separator as MenuDivider };

export function useToken(_category: string, token: string | string[]) {
  return Array.isArray(token) ? token[0] : token;
}

export type UseToastOptions = {
  id?: string;
  title?: string;
  description?: string;
  status?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number | null;
  isClosable?: boolean;
};
