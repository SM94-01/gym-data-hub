import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    supabase
      .rpc('is_admin', { _user_id: user.id })
      .then(({ data, error }) => {
        if (!error) setIsAdmin(!!data);
        setLoading(false);
      });
  }, [user]);

  return { isAdmin, loading };
}
