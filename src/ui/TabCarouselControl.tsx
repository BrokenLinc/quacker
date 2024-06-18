import React from 'react';
import * as UI from '@chakra-ui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { usePrevious, useToggle } from 'react-use';
import * as icons from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';

export interface TabCarouselControlProps extends UI.BoxProps {
  children?: React.ReactNode | React.ReactNode[];
  mode: 'top' | 'bottom';
}

/**
 * A component that consumes Chakra Tab context,
 *   and provides a carousel-style control to navigate through them.
 */
export const TabCarouselControl: React.FC<TabCarouselControlProps> = ({
  children,
  mode,
  ...boxProps
}) => {
  const tabContext = UI.useTabsContext();
  const { selectedIndex, setSelectedIndex } = tabContext;
  const previousSelectedIndex = usePrevious(selectedIndex);
  const [dirty, toggleDirty] = useToggle(false);

  const elementRef = React.useRef<HTMLDivElement>(null);

  // After first tab selection, scroll to top whenever selected tab changes again
  React.useEffect(() => {
    if (selectedIndex !== previousSelectedIndex) {
      if (dirty) {
        if (mode === 'top') {
          elementRef.current?.scrollIntoView();
        }
      } else {
        toggleDirty(true);
      }
    }
  }, [
    selectedIndex,
    previousSelectedIndex,
    dirty,
    elementRef,
    toggleDirty,
    mode,
  ]);

  // Find selected tab content by index
  const tabContents = _.isArray(children) ? children : [children];
  const selectedContent = _.get(tabContents, selectedIndex);

  // Disable buttons when at the end of the range
  const prevButtonDisabled = selectedIndex <= 0;
  const nextButtonDisabled = selectedIndex >= tabContents.length - 1;

  const handlePreviousClick = () => {
    setSelectedIndex(selectedIndex - 1);
  };
  const handleNextClick = () => {
    setSelectedIndex(selectedIndex + 1);
  };

  return (
    <UI.Box
      ref={elementRef}
      borderStyle="solid"
      borderColor="gray.200"
      borderBottomWidth={mode === 'top' ? '2px' : ''}
      borderTopWidth={mode === 'bottom' ? '1px' : ''}
      py={2}
      px={3}
      {...boxProps}
    >
      {mode === 'top' ? (
        <CarouselDots
          count={tabContents.length}
          selectedIndex={selectedIndex}
          mt={3}
          mb={1}
        />
      ) : null}
      <UI.Flex alignItems="center">
        <UI.Button
          onClick={handlePreviousClick}
          disabled={prevButtonDisabled}
          flex={0}
          color="blue.600"
        >
          <FontAwesomeIcon icon={icons.faChevronLeft} />
        </UI.Button>
        {mode === 'top' ? (
          <UI.Box flex={1} textAlign="center" fontWeight="bold">
            {selectedContent}
          </UI.Box>
        ) : (
          <CarouselDots
            count={tabContents.length}
            selectedIndex={selectedIndex}
          />
        )}
        <UI.Button
          onClick={handleNextClick}
          disabled={nextButtonDisabled}
          flex={0}
          color="blue.600"
        >
          <FontAwesomeIcon icon={icons.faChevronRight} />
        </UI.Button>
      </UI.Flex>
    </UI.Box>
  );
};

export interface CarouselDotsProps extends UI.StackProps {
  count: number;
  selectedIndex: number;
}

export const CarouselDots: React.FC<CarouselDotsProps> = ({
  count,
  selectedIndex,
  ...stackProps
}) => {
  return (
    <UI.Stack
      spacing="10px"
      direction="row"
      justifyContent="center"
      flex={1}
      {...stackProps}
    >
      {_.times(count, (i) => {
        const selected = i === selectedIndex;
        return (
          <UI.Box
            key={i}
            w="10px"
            h="10px"
            borderRadius="50%"
            bg="blue.600"
            opacity={selected ? 1 : 0.3}
          />
        );
      })}
    </UI.Stack>
  );
};

export default TabCarouselControl;
