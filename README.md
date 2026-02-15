# GymApp

Applicazione web per la gestione di allenamenti in palestra, sviluppata con React, Vite, TypeScript, Tailwind CSS e shadcn/ui.

## Funzionalità Principali

### 🏋️ Gestione Allenamenti
- Creazione e modifica di schede di allenamento personalizzate
- Supporto per esercizi singoli e superset
- Gestione di serie, ripetizioni, peso target e tempi di recupero
- Note personalizzate per ogni esercizio

### 📊 Tracking Progressi
- Registrazione dei progressi per ogni sessione di allenamento
- Storico completo delle sessioni con riepilogo dettagliato
- Grafici di distribuzione muscolare (PieChart) con tooltip interattivi
- Monitoraggio del peso corporeo con grafici temporali

### 👤 Profilo Utente
- Gestione del profilo personale (nome, email)
- Sistema di autenticazione con email e password
- Verifica email obbligatoria alla registrazione

### 🎓 Dashboard Personal Trainer
- Gestione clienti con inviti via email
- Creazione di schede personalizzate per ogni cliente
- Monitoraggio progressi e attività dei clienti
- Notifiche email automatiche (nuova scheda, allenamento completato)
- Piani abbonamento: Starter (5 clienti), Pro (15 clienti), Elite (40 clienti)

### 🏢 Dashboard Palestra
- Gestione centralizzata di utenti e personal trainer
- Monitoraggio sessioni settimanali e tassi di retention
- Analisi attività dei trainer (clienti e schede create)
- Piani abbonamento: Starter (3 PT + 50 utenti), Pro (10 PT + 150 utenti), Elite (25 PT + 500 utenti)

### ⚖️ Monitoraggio Peso Corporeo
- Inserimento peso giornaliero
- Grafici temporali dell'andamento del peso
- Calcolo variazioni e trend

### 📱 PWA (Progressive Web App)
- Installabile su dispositivi mobili
- Funzionamento offline
- Esperienza nativa su smartphone

## Tecnologie Utilizzate

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui, Lucide Icons
- **State Management**: React Context, TanStack React Query
- **Routing**: React Router DOM
- **Form**: React Hook Form, Zod
- **Grafici**: Recharts
- **Backend**: Lovable Cloud (Database, Auth, Edge Functions, Storage)
- **Email**: SMTP Gmail per notifiche automatiche

## Struttura Ruoli

| Ruolo | Prezzo/anno | Limiti |
|-------|-------------|--------|
| Utente | €10 | - |
| PT Starter | €49 | 5 clienti |
| PT Pro | €89 | 15 clienti |
| PT Elite | €149 | 40 clienti |
| Palestra Starter | €199 | 3 PT + 50 utenti |
| Palestra Pro | €399 | 10 PT + 150 utenti |
| Palestra Elite | €699 | 25 PT + 500 utenti |
