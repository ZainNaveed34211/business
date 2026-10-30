import { useCallback, useEffect, useState } from 'react';
import { dbDel, dbGetAll, dbPut } from './db';
import { emptyData, type BusinessData } from './data';

export function useBusinessData(): { data: BusinessData; loaded: boolean; save: (store: string, value: unknown) => Promise<void>; remove: (store: string, id: string) => Promise<void> } {
  const [data, setData] = useState<BusinessData>(emptyData());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const profileRows = await dbGetAll<{ id: string }>('profile');
    const profile = (profileRows as unknown[]).length > 0 ? (profileRows[0] as BusinessData['profile']) : null;
    const keywords = await dbGetAll('keywords');
    const competitors = await dbGetAll('competitors');
    const reviews = await dbGetAll('reviews');
    const calendar = await dbGetAll('calendar');
    const contents = await dbGetAll('contents');
    const campaigns = await dbGetAll('campaigns');
    const strategies = await dbGetAll('strategies');
    const shorts = await dbGetAll('shorts');
    const goals = await dbGetAll('goals');
    const guideDone = await dbGetAll('guideDone');
    const securityRuns = await dbGetAll('securityRuns');
    const scoreHistory = await dbGetAll('scoreHistory');
    const connections = await dbGetAll('connections');
    const socialFigures = await dbGetAll('socialFigures');
    setData({ profile, keywords, competitors, reviews, calendar, contents, campaigns, strategies, shorts, goals, guideDone, securityRuns, scoreHistory, connections, socialFigures } as BusinessData);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (store: string, value: unknown) => {
    await dbPut(store, value);
    await load();
  }, [load]);

  const remove = useCallback(async (store: string, id: string) => {
    await dbDel(store, id);
    await load();
  }, [load]);

  return { data, loaded, save, remove };
}
