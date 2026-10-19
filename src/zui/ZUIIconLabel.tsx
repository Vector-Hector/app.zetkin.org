import { FC } from 'react';
import { Box, Typography } from '@mui/material';

import useIsMobile from 'utils/hooks/useIsMobile';

export interface ZUIIconLabelProps {
  icon: JSX.Element;
  label: string | JSX.Element;
  color?: 'error' | 'secondary';
  size?: 'sm' | 'md' | 'xs';
}

const FONT_SIZES = {
  md: '1.1em',
  sm: '1em',
  xs: '0.7em',
} as const;

const MOBILE_FONT_SIZES = {
  md: '1em',
  sm: '0.8em',
  xs: '0.5em',
} as const;

const ZUIIconLabel: FC<ZUIIconLabelProps> = ({
  icon,
  label,
  color,
  size = 'md',
}) => {
  const isMobile = useIsMobile();

  return (
    <Box
      alignItems="center"
      color={color}
      display="flex"
      fontSize={(isMobile ? MOBILE_FONT_SIZES : FONT_SIZES)[size]}
      gap={1}
    >
      {icon}
      <Typography color={color ? color : 'inherit'} fontSize="inherit">
        {label}
      </Typography>
    </Box>
  );
};

export default ZUIIconLabel;
