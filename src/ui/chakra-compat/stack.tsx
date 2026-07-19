import {
  Stack as ChakraStack,
  HStack as ChakraHStack,
  VStack as ChakraVStack,
  type StackProps,
} from '@chakra-ui/react';
import React from 'react';
import { mapV2Props } from './props';

export type StackPropsWithSpacing = StackProps & { spacing?: StackProps['gap'] };

export const Stack = React.forwardRef<HTMLDivElement, StackPropsWithSpacing>(
  function Stack(props, ref) {
    return <ChakraStack ref={ref} {...mapV2Props(props)} />;
  }
);

export const HStack = React.forwardRef<HTMLDivElement, StackPropsWithSpacing>(
  function HStack(props, ref) {
    return <ChakraHStack ref={ref} {...mapV2Props(props)} />;
  }
);

export const VStack = React.forwardRef<HTMLDivElement, StackPropsWithSpacing>(
  function VStack(props, ref) {
    return <ChakraVStack ref={ref} {...mapV2Props(props)} />;
  }
);
