'use client';

import { FC } from 'react';

import useMemberships from 'features/organizations/hooks/useMemberships';

const Page: FC = () => {
  const mem = useMemberships();

  if (!mem) {
    return null;
  }

  return (
    <div>
      {mem.data?.map((m, index) => {
        return (
          <div key={index}>
            <p>
              {m.organization.title} is {m.role}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default Page;
