import {
  Box,
  Flex,
  FlexProps,
  Grid,
  GridProps,
  useTheme,
} from '@@ui';

type ColorPaletteProps = FlexProps & { color?: string; title?: string };

export const ColorPalette = (props: ColorPaletteProps) => {
  const { color, title, ...rest } = props;

  const theme = useTheme();
  let colorCode = color;

  if (color) {
    const [shade, hue] = color.split('.');
    const shadeColors = theme.colors[shade];

    if (shade && hue && typeof shadeColors === 'object' && shadeColors !== null) {
      colorCode = shadeColors[hue];
    }

    const namedColor = theme.colors[color];
    if (typeof namedColor === 'string') {
      colorCode = namedColor;
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
  const palette = theme.colors[color];
  const keys =
    typeof palette === 'object' && palette !== null ? Object.keys(palette) : [];

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
