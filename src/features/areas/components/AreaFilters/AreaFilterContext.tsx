import { createContext, FC, PropsWithChildren, useState } from 'react';

import { SafeRecord } from 'utils/types/safeRecord';

type AreaFilterState = {
  activeGroupIds: number[];
  activeTagIdsByGroup: SafeRecord<string, number[]>;
  setActiveGroupIds: (value: number[]) => void;
  setActiveTagIdsByGroup: (value: SafeRecord<string, number[]>) => void;
};

export const areaFilterContext = createContext<AreaFilterState>({
  activeGroupIds: [],
  activeTagIdsByGroup: {},
  setActiveGroupIds: () => undefined,
  setActiveTagIdsByGroup: () => undefined,
});

const AreaFilterProvider: FC<PropsWithChildren> = ({ children }) => {
  const [activeGroupIds, setActiveGroupIds] = useState<number[]>([]);
  const [activeTagIdsByGroup, setActiveTagIdsByGroup] = useState<
    SafeRecord<string, number[]>
  >({});

  return (
    <areaFilterContext.Provider
      value={{
        activeGroupIds,
        activeTagIdsByGroup,
        setActiveGroupIds,
        setActiveTagIdsByGroup,
      }}
    >
      {children}
    </areaFilterContext.Provider>
  );
};

export default AreaFilterProvider;
