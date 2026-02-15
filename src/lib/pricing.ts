export const ROLE_PRICING: Record<string, number> = {
  'Utente': 10,
  'Personal Trainer Starter': 49,
  'Personal Trainer Pro': 89,
  'Personal Trainer Elite': 149,
  'Palestra Starter': 199,
  'Palestra Pro': 399,
  'Palestra Elite': 699,
  'Admin': 0,
};

export const ROLE_LIMITS: Record<string, { clients?: number; pts?: number; users?: number }> = {
  'Personal Trainer Starter': { clients: 5 },
  'Personal Trainer Pro': { clients: 15 },
  'Personal Trainer Elite': { clients: 40 },
  'Palestra Starter': { pts: 3, users: 50 },
  'Palestra Pro': { pts: 10, users: 150 },
  'Palestra Elite': { pts: 25, users: 500 },
};
