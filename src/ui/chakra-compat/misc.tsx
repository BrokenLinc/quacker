import {
  Badge as ChakraBadge,
  Box,
  Button as ChakraButton,
  ButtonGroup as ChakraButtonGroup,
  IconButton as ChakraIconButton,
  Input as ChakraInput,
  InputGroup as ChakraInputGroup,
  List as ChakraList,
  NativeSelect,
  Separator,
  type BadgeProps as ChakraBadgeProps,
  type ButtonGroupProps,
  type ButtonProps as ChakraButtonProps,
  type IconButtonProps as ChakraIconButtonProps,
  type InputGroupProps as ChakraInputGroupProps,
  type InputProps as ChakraInputProps,
  type ListItemProps,
  type ListRootProps,
  type NativeSelectFieldProps,
} from '@chakra-ui/react';
import React from 'react';
import { Tooltip as CompatTooltip } from '../../components/ui/tooltip';
import { mapV2Props } from './props';

export const Divider = Separator;

export type TooltipProps = Omit<
  React.ComponentProps<typeof CompatTooltip>,
  'content'
> & {
  label?: React.ReactNode;
  content?: React.ReactNode;
};

export const Tooltip = ({ label, content, children, ...rest }: TooltipProps) => (
  <CompatTooltip content={content ?? label ?? ''} {...rest}>
    {children}
  </CompatTooltip>
);

export type InputGroupProps = Omit<ChakraInputGroupProps, 'children'> & {
  children?: React.ReactNode;
  startElement?: React.ReactNode;
  endElement?: React.ReactNode;
};

export const InputGroup = ({
  children,
  startElement,
  endElement,
  ...rest
}: InputGroupProps) => {
  let legacyStartElement: React.ReactNode;
  let legacyEndElement: React.ReactNode;
  const inputChildren = React.Children.toArray(children).filter((child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) {
      return true;
    }
    if (child.type === InputLeftElement) {
      legacyStartElement = child.props.children;
      return false;
    }
    if (child.type === InputRightElement) {
      legacyEndElement = child.props.children;
      return false;
    }
    return true;
  });
  const resolvedStartElement = startElement ?? legacyStartElement;
  const resolvedEndElement = endElement ?? legacyEndElement;

  if (resolvedStartElement || resolvedEndElement) {
    return (
      <ChakraInputGroup
        startElement={resolvedStartElement}
        endElement={resolvedEndElement}
        {...mapV2Props(rest)}
      >
        {inputChildren.length === 1 && React.isValidElement(inputChildren[0]) ? (
          inputChildren[0]
        ) : (
          <Box w="full">{inputChildren}</Box>
        )}
      </ChakraInputGroup>
    );
  }

  return <Box {...mapV2Props(rest)}>{children}</Box>;
};

export const InputLeftElement = ({
  children,
}: {
  children?: React.ReactNode;
}) => <>{children}</>;

export const InputRightElement = ({
  children,
}: {
  children?: React.ReactNode;
}) => <>{children}</>;

export type InputProps = ChakraInputProps & {
  isReadOnly?: boolean;
  isDisabled?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(props, ref) {
    return <ChakraInput ref={ref} {...mapV2Props(props)} />;
  }
);

export type ListProps = ListRootProps;

export const List = React.forwardRef<HTMLUListElement, ListProps>(
  function List({ children, ...props }, ref) {
    return (
      <ChakraList.Root ref={ref} {...mapV2Props(props)}>
        {children}
      </ChakraList.Root>
    );
  }
);

export type ListItemPropsCompat = ListItemProps;

export const ListItem = React.forwardRef<HTMLLIElement, ListItemPropsCompat>(
  function ListItem(props, ref) {
    return <ChakraList.Item ref={ref} {...mapV2Props(props)} />;
  }
);

export const ListIcon = ({
  as: Component,
  ...rest
}: { as?: React.ElementType } & Record<string, unknown>) => (
  <ChakraList.Indicator {...mapV2Props(rest)}>
    {Component ? <Box as={Component} /> : null}
  </ChakraList.Indicator>
);

export type SelectProps = NativeSelectFieldProps & {
  placeholder?: string;
  isReadOnly?: boolean;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ placeholder, children, ...rest }, ref) {
    return (
      <NativeSelect.Root>
        <NativeSelect.Field ref={ref} {...mapV2Props(rest)}>
          {placeholder ? <option value="">{placeholder}</option> : null}
          {children}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    );
  }
);

export type ButtonProps = ChakraButtonProps & {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconSpacing?: number;
  isDisabled?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ leftIcon, rightIcon, iconSpacing, children, ...rest }, ref) {
    const mapped = mapV2Props(rest);
    return (
      <ChakraButton ref={ref} gap={iconSpacing ?? mapped.gap} {...mapped}>
        {leftIcon}
        {children}
        {rightIcon}
      </ChakraButton>
    );
  }
);

export type IconButtonProps = ChakraIconButtonProps & {
  icon?: React.ReactNode;
  isDisabled?: boolean;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ icon, children, ...rest }, ref) {
    return (
      <ChakraIconButton ref={ref} {...mapV2Props(rest)}>
        {icon ?? children}
      </ChakraIconButton>
    );
  }
);

export type BadgeProps = ChakraBadgeProps & {
  colorScheme?: string;
  variant?: ChakraBadgeProps['variant'] | 'block';
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(props, ref) {
    return <ChakraBadge ref={ref} {...mapV2Props(props)} />;
  }
);

export const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  ButtonGroupProps & { isAttached?: boolean; isDisabled?: boolean }
>(function ButtonGroup(props, ref) {
  return <ChakraButtonGroup ref={ref} {...mapV2Props(props)} />;
});

export const SxBox = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Box> & {
    sx?: Record<string, unknown>;
    disabled?: boolean;
  }
>(function SxBox(props, ref) {
  return <Box ref={ref} {...mapV2Props(props)} />;
});
