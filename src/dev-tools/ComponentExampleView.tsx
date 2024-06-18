import * as UI from '@@ui';
import _ from 'lodash';
import React from 'react';

export type ComponentExample = {
  title: string;
  description?: string;
  noBorder?: boolean;
  render: () => React.ReactNode;
};

export const ComponentExampleListItem: React.FC<
  React.PropsWithChildren<
    {
      title: string;
      description?: string;
      noBorder?: boolean;
    } & UI.SimpleGridProps
  >
> = ({ children, title, description, noBorder, ...restProps }) => {
  return (
    <UI.SimpleGrid columns={2} {...restProps}>
      <UI.VStack alignItems="start" p={4}>
        <UI.Heading size="md">{title}</UI.Heading>
        {description && <UI.Text>{description}</UI.Text>}
      </UI.VStack>
      <UI.VStack
        p={4}
        border={noBorder ? '' : '2px solid'}
        borderColor="purple.500"
        borderRadius="md"
      >
        {children}
      </UI.VStack>
    </UI.SimpleGrid>
  );
};

export const ComponentExampleList: React.FC<
  React.PropsWithChildren<{ componentExamples: ComponentExample[] }>
> = ({ componentExamples }) => {
  return (
    <React.Fragment>
      <UI.HStack alignItems="start" spacing={12}>
        <UI.List position="sticky" top={0} bg="white" p={4}>
          {componentExamples.map(({ title }, i) => {
            return (
              <UI.ListItem key={i}>
                <UI.Link href={`#${_.kebabCase(title)}`}>{title}</UI.Link>
              </UI.ListItem>
            );
          })}
        </UI.List>
        <UI.VStack spacing={0} alignItems="stretch" maxW="980px">
          {componentExamples.map(
            ({ title, description, noBorder, render }, i) => (
              <ComponentExampleListItem
                key={title}
                as="section"
                p={4}
                id={_.kebabCase(title)}
                title={title}
                description={description}
                noBorder={noBorder}
              >
                {render()}
              </ComponentExampleListItem>
            )
          )}
        </UI.VStack>
      </UI.HStack>
    </React.Fragment>
  );
};
