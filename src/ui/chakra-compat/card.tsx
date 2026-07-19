import {
  Card as ChakraCard,
  type CardRootProps,
  type CardBodyProps,
} from '@chakra-ui/react';
import React from 'react';
import { mapV2Props } from './props';

export type CardProps = CardRootProps;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  props,
  ref
) {
  return <ChakraCard.Root ref={ref} {...mapV2Props(props)} />;
});

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  function CardBody(props, ref) {
    return <ChakraCard.Body ref={ref} {...mapV2Props(props)} />;
  }
);

export const CardHeader = ChakraCard.Header;
export const CardFooter = ChakraCard.Footer;
