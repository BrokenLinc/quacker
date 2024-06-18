import * as UI from '@@ui';
import _ from 'lodash';
import React from 'react';

export type ThemeExample = {
  title: string;
  description?: string;
  render: () => React.ReactNode;
};

export const ThemeExampleListItem: React.FC<
  React.PropsWithChildren<
    { title: string; description?: string } & UI.SimpleGridProps
  >
> = ({ children, title, description, ...restProps }) => {
  return (
    <UI.SimpleGrid columns={2} {...restProps}>
      <UI.VStack alignItems="start" p={4}>
        <UI.Heading size="md">{title}</UI.Heading>
        {description && <UI.Text>{description}</UI.Text>}
      </UI.VStack>
      <UI.VStack
        p={4}
        border="2px solid"
        borderColor="purple.500"
        borderRadius="md"
      >
        {children}
      </UI.VStack>
    </UI.SimpleGrid>
  );
};

export const ThemeExampleList: React.FC<
  React.PropsWithChildren<{ componentExamples: ThemeExample[] }>
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
        <UI.VStack spacing={0} alignItems="stretch" maxW="980px" flex="1">
          {componentExamples.map(({ title, description, render }, i) => (
            <ThemeExampleListItem
              key={title}
              as="section"
              p={4}
              id={_.kebabCase(title)}
              title={title}
              description={description}
            >
              {render()}
            </ThemeExampleListItem>
          ))}
        </UI.VStack>
      </UI.HStack>
    </React.Fragment>
  );
};
