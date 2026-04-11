import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { fetchFollowsForFollower, type FollowListRow } from '@/lib/follows';

export function useFollows(followerId: string | null) {
  const [follows, setFollows] = useState<FollowListRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFollows = useCallback(async () => {
    if (!followerId) {
      setFollows([]);
      return;
    }
    setLoading(true);
    const rows = await fetchFollowsForFollower(followerId);
    setFollows(rows);
    setLoading(false);
  }, [followerId]);

  useEffect(() => {
    void loadFollows();
  }, [loadFollows]);

  useFocusEffect(
    useCallback(() => {
      void loadFollows();
    }, [loadFollows]),
  );

  return { follows, loading };
}
