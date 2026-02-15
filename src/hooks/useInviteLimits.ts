import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface InviteLimits {
  role: string;
  client_limit: number;
  client_used: number;
  pt_limit: number;
  pt_used: number;
  user_limit: number;
  user_used: number;
}

export function useInviteLimits() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<InviteLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLimits = useCallback(async () => {
    if (!user) {
      setLimits(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc('get_invite_limits', { _user_id: user.id });
    if (!error && data) {
      setLimits(data as unknown as InviteLimits);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  return { limits, loading, refetch: fetchLimits };
}
