import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useIsTrainer() {
  const { user } = useAuth();
  const [isTrainer, setIsTrainer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsTrainer(false);
      setLoading(false);
      return;
    }

    supabase
      .rpc('is_personal_trainer', { _user_id: user.id })
      .then(({ data, error }) => {
        if (!error) setIsTrainer(!!data);
        setLoading(false);
      });
  }, [user]);

  return { isTrainer, loading };
}
