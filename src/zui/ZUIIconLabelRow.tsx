import { Box } from '@mui/material';
import { FC } from 'react';

import ZUIIconLabel, { ZUIIconLabelProps } from './ZUIIconLabel';
import useIsMobile from 'utils/hooks/useIsMobile';

interface ZUIIconLabelRowProps {
  color?: ZUIIconLabelProps['color'];
  iconLabels: ZUIIconLabelProps[];
  size?: ZUIIconLabelProps['size'];
}

const ZUIIconLabelRow: FC<ZUIIconLabelRowProps> = ({
  iconLabels,
  ...restProps
}) => {
  const isMobile = useIsMobile();

  return (
    <Box
      display="flex"
      flexDirection={isMobile ? 'column' : 'row'}
      flexShrink="0"
      flexWrap="wrap"
      gap={2}
    >
      {iconLabels.map((props, index) => (
        <ZUIIconLabel key={index} {...restProps} {...props} />
      ))}
    </Box>
  );
};

export default ZUIIconLabelRow;
