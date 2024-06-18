import * as UI from '@@ui';
import React from 'react';

export const TotalCard: React.FC<
  UI.CardProps & {
    title?: string;
    subText?: string;
    value: string | number;
  }
> = ({ title, children, subText, value, ...restProps }) => {
  return (
    <UI.Card
      borderWidth="2px"
      borderColor="purple.500"
      borderRadius="md"
      textAlign="center"
      {...restProps}
    >
      <UI.CardBody
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        {title ? <UI.Heading size="md">{title}</UI.Heading> : null}
        <UI.Text fontSize="48px" lineHeight="52px" fontWeight="light">
          {value}
        </UI.Text>
        <UI.Text fontWeight="bold" color="green.500">
          {subText}
        </UI.Text>
      </UI.CardBody>
      {children}
    </UI.Card>
  );
};
