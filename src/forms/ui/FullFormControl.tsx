import * as UI from '@chakra-ui/react';
import { faPencil, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { FormFieldErrorMessage } from './FormFieldErrorMessage';
import { useFormGridContext } from './FormGrid';

/* Renders a form-control, label, helper-text, children, and error message */
/* Must be placed inside a form-grid-context-provider */
export type FullFormControlProps = UI.FormControlProps & {
  label?: string;
  labelTooltip?: string;
  labelDisplay?: 'visible' | 'hidden' | 'none';
  requiredStyling?: boolean;
  collapsible?: boolean;
  tools?: React.ReactNode;
  name?: string;
  helperText?: React.ReactNode;
  errorMessage?: string;
  errorDisplay?: 'visible' | 'hidden' | 'none';
  span?: 'sm' | 'md' | 'lg' | 'xl';
};
export const FullFormControl: React.FC<FullFormControlProps> = ({
  label,
  labelTooltip,
  labelDisplay = 'visible',
  requiredStyling: required,
  collapsible,
  tools,
  name,
  children,
  helperText,
  errorMessage,
  errorDisplay = 'visible',
  span = 'md',
  ...restProps
}) => {
  const [collapsed, setCollapsed] = React.useState(collapsible);
  const gridProps = useFormGridContext();
  const spanColumns = Math.min(
    {
      sm: 1,
      md: 2,
      lg: 4,
      xl: 8,
    }[span],
    gridProps.columns || 1
  );

  return (
    <UI.FormControl gridColumn={`span ${spanColumns}`} {...restProps}>
      {label ? (
        <UI.Flex alignItems="flex-end">
          {labelTooltip ? (
            <UI.Box color="purple.500" fontSize="sm" mb={1} mr={1}>
              <UI.Tooltip label={labelTooltip}>
                <FontAwesomeIcon icon={faQuestionCircle} />
              </UI.Tooltip>
            </UI.Box>
          ) : null}
          {labelDisplay === 'none' ? null : (
            <UI.FormLabel
              htmlFor={name}
              flex={1}
              visibility={labelDisplay}
              // Trim invisible labels to ellipsis
              {...(labelDisplay === 'hidden'
                ? {
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }
                : null)}
            >
              {label}{' '}
              {required ? (
                <UI.Text as="span" color="red.500">
                  *
                </UI.Text>
              ) : null}
            </UI.FormLabel>
          )}
          {collapsible && !collapsed ? (
            <UI.Button size="xs" mb={2} onClick={() => setCollapsed(true)}>
              Collapse
            </UI.Button>
          ) : null}
          {tools}
        </UI.Flex>
      ) : null}

      {collapsed ? (
        <UI.Button size="sm" onClick={() => setCollapsed(false)}>
          <FontAwesomeIcon icon={faPencil} />
          <UI.Text ml={2}>Expand to Edit</UI.Text>
        </UI.Button>
      ) : (
        children
      )}
      {helperText ? <UI.FormHelperText>{helperText}</UI.FormHelperText> : null}
      {errorDisplay === 'none' ? null : (
        <FormFieldErrorMessage visibility={errorDisplay}>
          {errorMessage}
        </FormFieldErrorMessage>
      )}
    </UI.FormControl>
  );
};
