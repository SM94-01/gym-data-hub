export const ROLE_PRICING: Record<string, number> = {
  'Utente': 10,
  'Personal Trainer Starter': 49,
  'Personal Trainer Pro': 99,
  'Personal Trainer Elite': 179,
  'Palestra Starter': 349,
  'Palestra Pro': 699,
  'Palestra Elite': 1299,
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
