import { ZetkinEvent } from 'utils/types/zetkin';
import useEventsByOrgs from './useEventsByOrgs';
import {
  ErrorFuture,
  IFuture,
  LoadingFuture,
  ResolvedFuture,
} from 'core/caching/futures';

export default function useFindEventById(
  eventId: number
): IFuture<ZetkinEvent | null> {
  const eventsFuture = useEventsByOrgs();

  if (eventsFuture.isLoading) {
    return new LoadingFuture();
  } else if (eventsFuture.error) {
    return new ErrorFuture(eventsFuture.error);
  } else {
    return new ResolvedFuture(
      (eventsFuture.data || []).find((event) => event.id === eventId) || null
    );
  }
}
