import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useIsGym() {
  const { user } = useAuth();
  const [isGym, setIsGym] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsGym(false);
      setLoading(false);
      return;
    }

    supabase
      .rpc('is_gym', { _user_id: user.id })
      .then(({ data, error }) => {
        if (!error) setIsGym(!!data);
        setLoading(false);
      });
  }, [user]);

  return { isGym, loading };
}
