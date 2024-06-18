import { SearchResultMeta } from '@@api/types';
import * as UI from '@@ui';
import { faArrowDown, faSearch } from '@fortawesome/free-solid-svg-icons';
import {
  MenuProps,
  SelectInstance,
  useChakraSelectProps,
} from 'chakra-react-select';
import _ from 'lodash';
import React from 'react';
import { AsyncPaginate, AsyncPaginateProps } from 'react-select-async-paginate';

/**
 * A wrapper for the AsyncSelect component that provides default props.
 */
export type ComboboxPaginatedInputProps = Omit<
  AsyncPaginateProps<any, any, any, any>,
  'loadOptions'
> & {
  loadOptions: (
    q: string,
    page: number
  ) => Promise<{
    options: { value: any; label: string }[];
    meta: Pick<SearchResultMeta, 'hasNextPage'>;
  }>;
};
export const ComboboxPaginatedInput = React.forwardRef<
  SelectInstance,
  ComboboxPaginatedInputProps
>(({ chakraStyles, value, defaultValue, loadOptions, ...restProps }, ref) => {
  const [resetCount, setResetCount] = React.useState(0);
  const [focused, setFocused] = React.useState(false);
  const [hasMoreOptions, setHasMoreOptions] = React.useState(false);

  // When the value changes to nil, clear the input
  React.useEffect(() => {
    if (!value) {
      setResetCount((c) => c + 1);
    }
  }, [value]);

  // Use chakra-react-select's utility method to get override props
  let chakraSelectProps = useChakraSelectProps({
    ...restProps,
    chakraStyles: {
      ...chakraStyles,
      container: (p) => ({
        ...p,
        flex: 'auto',
        ...chakraStyles?.container,
      }),
      menu: (p) => ({
        ...p,
        zIndex: 3,
        ...chakraStyles?.menu,
      }),
      noOptionsMessage: (p) => ({
        ...p,
        color: undefined,
        fontWeight: '500',
        fontSize: 'lg',
        ...chakraStyles?.noOptionsMessage,
      }),
      singleValue: (p) => ({
        ...p,
        bg: focused ? 'blue.100' : 'transparent',
        ...chakraStyles?.singleValue,
      }),
    },
  });

  // Remove the components that async-paginate provides
  chakraSelectProps = _.omit(chakraSelectProps, [
    'components.Menu',
    'components.MenuList',
  ]);

  const loadPagedOptions = React.useCallback(
    async (
      q: string,
      prevOptions: any,
      additional?: {
        page: number;
      }
    ) => {
      const page = additional?.page || 1;
      const { options, meta } = await loadOptions(q, page);
      const hasMore = meta.hasNextPage;
      setHasMoreOptions(hasMore);

      return {
        options,
        hasMore,
        additional: hasMore ? { page: page + 1 } : undefined,
      };
    },
    [loadOptions]
  );

  return (
    <UI.Box
      w="full"
      sx={{
        '.has-more-options': {
          display: hasMoreOptions ? 'block' : 'none',
        },
      }}
    >
      <AsyncPaginate
        selectRef={ref}
        key={resetCount}
        useBasicStyles
        isClearable
        backspaceRemovesValue
        openMenuOnFocus
        noOptionsMessage={({ inputValue }) =>
          inputValue ? (
            <UI.Text size="lg" fontSize="lg">
              No results found.
            </UI.Text>
          ) : (
            <UI.Text size="lg" fontSize="lg">
              <UI.Icon mr={2} icon={faSearch} />
              Type to search...
            </UI.Text>
          )
        }
        {...restProps}
        {...chakraSelectProps}
        components={{
          ...chakraSelectProps.components,
          ClearIndicator: restProps.isReadOnly
            ? () => null
            : chakraSelectProps.components?.ClearIndicator,
          DropdownIndicator: restProps.isReadOnly
            ? () => null
            : chakraSelectProps.components?.DropdownIndicator,
          Menu: MenuComponent,
        }}
        // Only display defaultValue if the current value matches
        defaultValue={value === defaultValue?.value ? defaultValue : undefined}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        onMenuClose={() => {
          setHasMoreOptions(false);
        }}
        loadOptions={loadPagedOptions}
      />
    </UI.Box>
  );
});

const MenuComponent: React.FC<MenuProps> = (props) => {
  const { children, innerRef, innerProps } = props;
  return (
    <UI.Box
      ref={innerRef}
      position="absolute"
      w="full"
      zIndex={3}
      bg="white"
      shadow="lg"
      borderRadius="md"
      overflow="hidden"
      my={1}
      {...innerProps}
    >
      {children}
      <UI.Box
        bg="purple.100"
        color="purple.500"
        textAlign="center"
        p={2}
        className="has-more-options"
      >
        Scroll to load more <UI.Icon icon={faArrowDown} />
      </UI.Box>
    </UI.Box>
  );
};
