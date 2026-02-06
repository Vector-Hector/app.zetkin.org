import { createContext } from 'react';

export type ResolvedParams = Record<string, string | number>;

export const ResolvedParamsContext = createContext<ResolvedParams>({});
