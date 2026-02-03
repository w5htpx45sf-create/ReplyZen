# ReplyZen — Dossier produit et architecture

## 0) Hypothèses explicites
- MVP orienté indépendants et TPE (0–5 personnes), usage quotidien modéré.
- L’utilisateur valide toujours les brouillons : aucune réponse envoyée automatiquement.
- OAuth Gmail + Outlook avec permissions minimales (lecture + création de brouillons).
- IA externe via un moteur LLM abstrait, optimisé par résumés et cache.

## 1) Architecture technique complète
### 1.1 Frontend (Next.js / React)
- Pages : Auth, Inbox, Détail email, Historique, Réglages (tons, préférences).
- UI en mode « inbox » simple : liste d’emails + panneau de réponse.
- Intégration API sécurisée via cookies HttpOnly, CSRF token.

### 1.2 Backend (FastAPI)
- API REST + webhooks.
- Modules : Auth, Email Connectors, Drafts, Client Memory, Analytics, Billing.
- Workers asynchrones pour : sync emails, résumé mémoire, génération IA, scoring d’urgence.

### 1.3 Data (PostgreSQL + Redis)
- PostgreSQL : source de vérité (utilisateurs, emails, drafts, mémoire).
- Redis : cache de résumés, files de jobs, throttling.

### 1.4 IA (LLM abstrait)
- Moteur LLM encapsulé (OpenAI, Azure, etc.) avec fallback.
- Pré-traitement : nettoyage, extraction d’intentions, détection de sensibilité.
- Post-traitement : vérifications relationnelles et tonalité.

## 2) Flux détaillés
### 2.1 Connexion Gmail/Outlook
1. L’utilisateur clique « Connecter Gmail ».
2. Redirection OAuth (Google/Microsoft).
3. Consentement minimal (lecture + brouillons).
4. Récupération des tokens, stockage chiffré.
5. Webhook ou poll pour synchroniser les emails.

### 2.2 Réception et tri
1. Ingestion email entrant via sync.
2. Classifier urgence/émotion/type.
3. Enrichir avec mémoire client résumée.
4. Générer un brouillon adapté au ton.
5. Afficher le brouillon dans l’inbox.

### 2.3 Génération de brouillon
1. Extraction du message, contexte et historique résumés.
2. Sélection du ton préféré.
3. Appel LLM via prompt système.
4. Vérification relationnelle (sensibilité, risques).
5. Stockage du brouillon, jamais envoyé.

## 3) Schéma logique des composants
- Frontend Next.js
  - Auth UI
  - Inbox UI
  - Draft Editor
- API FastAPI
  - Auth Service
  - Email Connector Service (Gmail/Outlook)
  - Draft Service
  - Memory Service
- Workers
  - Email Sync Worker
  - Summarization Worker
  - Draft Generation Worker
- Data Stores
  - PostgreSQL (primary)
  - Redis (cache + queues)

## 4) Modèle logique des tables (haut niveau)
- users
- oauth_connections
- emails
- drafts
- clients
- client_memory_short
- client_memory_long
- tone_preferences
- audit_logs

## 5) Points critiques sécurité & conformité
- Tokens OAuth chiffrés au repos (KMS + rotation).
- Minimise scopes, jamais « full mailbox access ».
- Journaliser les accès (audit logs).
- Purge automatique (RGPD) et export sur demande.
- Isolation tenant par utilisateur.

## 6) Roadmap technique (3 phases)
### MVP
- Connexion Gmail + Inbox basique.
- Génération de brouillons IA.
- Historique simple.

### V1
- Ajout Outlook.
- Mémoire client résumée.
- Scoring urgence + tonalité.

### V2
- Résumés longue durée.
- Gestion multi-comptes.
- Optimisation des coûts IA.

## 7) Erreurs techniques fréquentes
- Utiliser des scopes OAuth trop larges.
- Stocker les emails bruts sans besoin.
- Génération IA sans résumé (coût élevé).
- Envoyer automatiquement des emails.

## 8) Flux Gmail détaillé
### OAuth
- Endpoint : `https://accounts.google.com/o/oauth2/v2/auth`.
- Scopes recommandés :
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.compose`
- Consentement explicite + refresh token.

### Récupération emails
- API `users.messages.list` puis `users.messages.get`.
- Filtrer par `INBOX` + date.
- Stocker un résumé + métadonnées, pas le brut intégral.

### Création de brouillons
- API `users.drafts.create`.
- Corps généré par LLM, jamais envoyé sans action explicite.

### Gestion tokens
- Refresh token chiffré.
- Rotation périodique, invalidation sur déconnexion.

### Gestion erreurs
- Quotas API Gmail.
- Expiration token (401 → refresh).
- Réessai exponentiel sur erreurs 429/5xx.

## 9) Mémoire client longue durée
- Mémoire courte (résumés des 3–5 derniers échanges).
- Mémoire longue (résumé cumulatif évolutif).
- Mise à jour après chaque interaction :
  - Résumé court → synthèse
  - Résumé long → extension contrôlée (max tokens)
- Stocker uniquement des résumés, pas les emails bruts.

## 10) Montée en charge (simulation)
### 100 utilisateurs
- 10–20 emails/jour chacun.
- 1 worker suffit.

### 1 000 utilisateurs
- 15 000 emails/jour.
- 2–3 workers + Redis queue.

### 10 000 utilisateurs
- 150 000 emails/jour.
- Partitionnement par utilisateur + files dédiées.
- Cache agressif des résumés.

## 11) Proposition de valeur centrale
- Répondre vite sans perdre le ton professionnel.
- Réduire la charge mentale.
- Garder le contrôle sur chaque message.

## 12) Offre & pricing
| Plan | Prix/mois | Usage clé |
|------|-----------|-----------|
| Starter | 19€ | Réponses assistées + historique limité |
| Pro | 39€ | Gmail/Outlook + mémoire client | 
| Premium | 69€ | Priorisation + support prioritaire |

Justification : 1–2h gagnées/mois = ROI immédiat pour indépendants.

## 13) Upsells possibles
- Pack multi-comptes.
- Ton personnalisé par client.
- Export CRM léger.

## 14) À ne pas inclure au début
- Envoi automatique.
- CRM complet.
- Intégrations multiples complexes.

## 15) Prompts IA
### Prompt système principal
"""
Vous êtes un assistant de communication professionnelle. Votre objectif est de faire gagner du temps, préserver la relation client et protéger la posture professionnelle de l’utilisateur. Répondez toujours en français, avec un ton clair, respectueux et humain. Ne soyez jamais passif-agressif. Ne donnez jamais de conseils juridiques sauf demande explicite. Fournissez toujours une réponse prête à envoyer.
Vous adaptez la réponse selon le message reçu, l’historique résumée, le ton préféré, et le contexte émotionnel détecté. Si le message est sensible, proposez une alternative plus sécurisée et signalez les risques relationnels.
"""

### Prompts par situation
- Annulation : "Présentez des excuses, proposez une alternative et confirmez la flexibilité."
- Conflit : "Reconnaissez l’émotion, reformulez sans défendre, proposez une solution."
- Retard : "Présentez des excuses, donnez un délai précis, rassurez."
- Relance : "Relancez poliment, proposez un rappel simple."
- Cadre : "Rappelez les règles avec tact et proposez une option."

### Règles de sécurité relationnelle
- Toujours éviter les formulations accusatrices.
- Bannir les phrases culpabilisantes.
- Proposer une option de sortie quand c’est sensible.

### Mécanismes d’alerte
- Si émotion négative détectée : inclure une phrase apaisante.
- Si risque d’escalade : proposer une alternative plus neutre.

## 16) Analyse DPO (RGPD)
- Base légale : consentement explicite.
- Droit d’accès, rectification, suppression.
- Minimisation : stockage de résumés, pas d’email brut.
- Chiffrement des tokens et logs d’accès.
- Mentions légales : finalité, durée de conservation, sous-traitants IA.
