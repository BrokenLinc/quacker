import * as UI from '@@ui';
import { faClose, faPencil } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

export const FieldSet: React.FC<
  Omit<UI.BoxProps, 'children'> & {
    children: React.ReactNode | React.FC<{ panel: UI.UseDisclosureReturn }>;
    disabled?: boolean;
    isInvalid?: boolean;
    hasValues?: boolean;
    unstyled?: boolean;
    title: React.ReactNode;
    defaultIsOpen?: boolean;
    preview?: React.ReactNode;
    collapsible?: boolean;
  }
> = ({
  title,
  children,
  disabled,
  defaultIsOpen = true,
  unstyled = false,
  isInvalid,
  hasValues,
  preview,
  collapsible,
  ...restProps
}) => {
  const panel = UI.useDisclosure({
    defaultIsOpen,
  });

  const previewElement = preview || (
    <UI.Badge px={3} py={2} my={2}>
      {isInvalid ? (
        <UI.Text>
          This section contains errors.{' '}
          <UI.Link
            onClick={panel.onOpen}
            textDecoration="underline"
            color="chakra-body-text"
          >
            Open
          </UI.Link>
        </UI.Text>
      ) : hasValues ? (
        <UI.Text>
          Some fields in this section are filled out.{' '}
          <UI.Link onClick={panel.onOpen} textDecoration="underline">
            Open
          </UI.Link>
        </UI.Text>
      ) : (
        <UI.Text>
          This section hasn't been filled out.{' '}
          <UI.Link onClick={panel.onOpen} textDecoration="underline">
            Open
          </UI.Link>
        </UI.Text>
      )}
    </UI.Badge>
  );

  return (
    <UI.Box {...restProps}>
      <UI.Box
        as="fieldset"
        disabled={disabled}
        position="relative"
        border={unstyled ? '' : '2px solid'}
        borderColor={isInvalid ? 'red.500' : 'purple.500'}
        borderRadius="md"
        px={unstyled ? '' : '6'}
        py={unstyled ? '' : '3'}
      >
        <UI.Box
          as="legend"
          position="absolute"
          px={2}
          bg="white"
          top="-18px"
          left="14px"
          visibility={unstyled ? 'hidden' : 'visible'}
        >
          <UI.HStack>
            {collapsible ? (
              <UI.Button
                onClick={panel.onToggle}
                size="xs"
                colorScheme={isInvalid ? 'red' : 'purple'}
                w={6}
              >
                <FontAwesomeIcon icon={panel.isOpen ? faClose : faPencil} />
              </UI.Button>
            ) : null}
            <UI.Heading size="md">{title}</UI.Heading>
          </UI.HStack>
        </UI.Box>
        {!collapsible || panel.isOpen ? (
          <UI.Box pb={unstyled ? '' : '3'} pt={unstyled ? '' : '3'}>
            {typeof children === 'function' ? children({ panel }) : children}
          </UI.Box>
        ) : (
          previewElement
        )}
      </UI.Box>
    </UI.Box>
  );
};
