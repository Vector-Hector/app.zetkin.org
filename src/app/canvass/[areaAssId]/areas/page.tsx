import { redirect } from 'next/navigation';
import React from 'react';

interface PageProps {
  params: {
    areaAssId: number;
  };
}

const AreasPage: React.FC<PageProps> = ({ params }) => {
  redirect(`/canvass/${params.areaAssId}`);
  return null;
};

export default AreasPage;
