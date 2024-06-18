import {
  Box,
  Flex,
  FlexProps,
  Grid,
  GridProps,
  useTheme,
} from '@chakra-ui/react';

type ColorPaletteProps = FlexProps & { color?: string; title?: string };

export const ColorPalette = (props: ColorPaletteProps) => {
  const { color, title, ...rest } = props;

  const theme = useTheme();
  let colorCode = color;

  if (color) {
    const [shade, hue] = color.split('.');

    if (shade && hue) {
      colorCode = theme.colors[shade][hue];
    }

    if (color in theme.colors && typeof theme.colors[color] === 'string') {
      colorCode = theme.colors[color];
    }
  }

  return (
    <Flex align="center" {...rest}>
      <Box
        borderRadius="md"
        boxSize="3rem"
        // boxShadow="inner"
        mr={3}
        bgColor={color}
      />
      <Box fontSize="sm">
        <Box fontWeight="semibold" textTransform="capitalize">
          {title}
        </Box>
        <Box textTransform="uppercase">{colorCode}</Box>
      </Box>
    </Flex>
  );
};

export const ColorPalettes = (props: { color: string }) => {
  const { color } = props;
  const theme = useTheme();
  const keys = Object.keys(theme.colors[color]);

  return (
    <>
      {keys.map((item) => (
        <ColorPalette
          key={`${color}.${item}`}
          color={`${color}.${item}`}
          title={`${color} ${item}`}
        />
      ))}
    </>
  );
};

export const ColorWrapper = (props: GridProps) => (
  <Grid
    mt={7}
    gap={6}
    templateColumns="repeat( auto-fit, minmax(200px, 1fr) )"
    w="100%"
    {...props}
  />
);
