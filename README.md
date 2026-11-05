# HOMEA — Prototype de Dossier Patient Informatisé (DPI)

Prototype d'application web de dossier patient informatisé pour la clinique HOMEA (Abidjan, Côte d'Ivoire). Couvre l'accueil, le dossier patient, les consultations, prescriptions, examens de laboratoire, soins infirmiers, gestion des lits, pharmacie et facturation.

## Stack technique

- **Frontend** : React + TypeScript + Vite, Tailwind CSS, Lucide React
- **Serveur applicatif** : installation locale dans l’infrastructure de l’entreprise
- **Base de données** : PostgreSQL installé sur le serveur de l’établissement
- **API** : couche serveur (Node.js recommandé) qui se connecte à PostgreSQL
- **Authentification** : JWT (côté serveur)

> PostgreSQL est la base de données retenue. Le navigateur ne se connecte jamais directement au serveur PostgreSQL : tous les accès passent par l’API.

## Installation locale prévue

Le prototype est destiné à être installé sur un serveur applicatif de l’entreprise. Le serveur applicatif hébergera l’interface web et l’API, tandis que PostgreSQL restera accessible uniquement sur le réseau interne du serveur. Le navigateur communiquera avec l’API, jamais directement avec PostgreSQL.

L’installation devra prévoir un service de démarrage automatique de l’API, un accès réseau interne sécurisé, des sauvegardes PostgreSQL régulières et une journalisation des accès.

## État actuel du prototype

Le prototype fonctionne entièrement avec des **données simulées** (tableaux TypeScript en mémoire dans `src/data/`). Aucune donnée médicale réelle n'est utilisée.

Une **couche d'accès aux données** (`src/lib/api.ts`) a été ajoutée. Elle tente d'appeler l'API backend quand `VITE_API_BASE_URL` est définie, et retombe sur les données simulées sinon. Les écrans n'ont pas encore été raccordés à cette couche : ils lisent toujours les tableaux statiques.

## Configuration

### Variables d'environnement (`.env`)

```bash
# Côté navigateur (préfixé VITE_) — safe à exposer
VITE_API_BASE_URL=/api

# Côté serveur uniquement — JAMAIS dans le bundle navigateur
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=homea_dpi
POSTGRES_USER=homea_app
POSTGRES_PASSWORD=changeme
POSTGRES_POOL_MAX=10
JWT_SECRET=changeme-with-a-long-random-string
JWT_EXPIRES_IN=8h
```

> Les identifiants PostgreSQL ne sont jamais inclus dans le code navigateur. Sur une installation locale, l’API peut être servie sous le même domaine avec le chemin `/api`.

## Schéma PostgreSQL provisoire

Le schéma PostgreSQL définitif doit être validé et appliqué côté serveur. Il couvrira les tables principales : patients, admissions, consultations, prescriptions, lab_orders, nursing_care, invoices, beds, appointments et audit_log.

La sécurité est gérée par l’API, les rôles applicatifs et les permissions PostgreSQL. Les sauvegardes doivent être réalisées sur le serveur de l’établissement.

## Sécurité des données de santé

- **Accès selon les rôles** : 7 profils (direction, médecin, accueil, soins, laboratoire, pharmacie, facturation)
- **Traçabilité** : table `audit_log` pour les créations et modifications
- **Validation serveur** : les contrôles de validation doivent être côté API, pas côté navigateur
- **Aucune donnée médicale réelle** dans le prototype

## Fonctions encore simulées

Tous les écrans utilisent des données simulées. Le raccordement à l'API et PostgreSQL doit se faire écran par écran :

| Écran | Données simulées | Table PostgreSQL cible |
|-------|-----------------|-------------------|
| Accueil / Admission | `src/data/admissions.ts` | `admissions` |
| Dossier patient | `src/data/patients.ts` | `patients` |
| Consultations | `src/data/consultations.ts` | `consultations` |
| Prescriptions | `src/data/prescriptions.ts` | `prescriptions` |
| Examens labo | `src/data/lab.ts` | `lab_orders` |
| Soins infirmiers | `src/data/nursing.ts` | `nursing_care` |
| Gestion des lits | `src/data/beds.ts` | `beds` |
| Pharmacie | `src/data/pharmacy*.ts` | (à définir) |
| Facturation | `src/data/billing.ts` | `invoices` |
| Rendez-vous | `src/data/appointments.ts` | `appointments` |

## Informations à obtenir du développeur

1. URL de base de l'API et contrat d'endpoints (chemins, verbes, payloads)
2. Schéma PostgreSQL définitif et script d’installation sur le serveur
3. Stratégie d'ID : AUTO_INCREMENT ou UUID
4. Tables de stock (pharmacie, laboratoire) — non couvertes par le schéma provisoire
5. Tables d'imagerie et formulaires de consultation
6. Mécanisme d'authentification (JWT, session, provider)
7. Politique de mots de passe et gestion des rôles
8. Stratégie de sauvegarde et rétention des données
9. Conformité réglementaire (RGPD, protection des données de santé)

## Scripts

```bash
npm run dev        # serveur de développement
npm run build      # build de production
npm run typecheck  # vérification des types TypeScript
npm run lint       # analyse du code
```
