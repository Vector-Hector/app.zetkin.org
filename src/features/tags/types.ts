import { ZetkinQuery } from 'features/smartSearch/components/types';

export interface ZetkinSmartTag {
  color: string | null;
  description: string | null;
  group_id: number | null;
  id: number;
  organization_id: number;
  query_id: number;
  title: string;
}

export type SmartTagInput = Pick<
  ZetkinSmartTag,
  'color' | 'description' | 'group_id' | 'query_id' | 'title'
>;

export type SmartTagFormData = Omit<SmartTagInput, 'query_id'> & {
  group?: { title: string };
};

export type SubmitSmartTag = (
  data: SmartTagFormData,
  filterSpec?: ZetkinQuery['filter_spec']
) => Promise<unknown>;
