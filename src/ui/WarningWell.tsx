import * as UI from '@@ui';

export type WarningWellProps = UI.StackProps & {
  heading?: string;
  message?: string;
};

export const WarningWell: React.FC<WarningWellProps> = ({
  heading,
  message,
  children,
  ...restProps
}) => {
  return (
    <UI.VStack
      bg="orange.100"
      borderRadius="lg"
      p={12}
      display="block"
      textAlign="center"
      shadow="inner"
      {...restProps}
    >
      {heading ? <UI.Heading size="sm">{heading}</UI.Heading> : null}
      {message ? <UI.Text>{message}</UI.Text> : null}
      {children}
    </UI.VStack>
  );
};
