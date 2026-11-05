# PRD — GROUPE MÉDICAL HOMEA
## PROCESSUS 1 : PARCOURS ADMINISTRATIF ET FINANCIER DU PATIENT

| | |
|---|---|
| **Document** | PRD_HOMEA_PROCESSUS_1.md |
| **Version** | 1.0 — provisoire (analyse du prototype Bolt.new) |
| **Date** | 2026-10-18 |
| **Destinataire** | Développeur chargé de la mise en production |
| **Statut contractuel** | Référence fonctionnelle pour le développement du Processus 1 |
| **Périmètre** | 6 modules : Agenda/RDV · Accueil/Admission · Caisse · Facturation · Dossier d'assurance · Créances/Recouvrement |

> **Convention de provenance** : chaque exigence est marquée :
> - **[OBSERVÉE]** — vérifiée directement dans le code du prototype.
> - **[DÉDUITE]** — déduite du comportement ou des données.
> - **[PROPOSÉE]** — recommandation à valider avec HOMEA avant implémentation.
>
> **Convention d'identifiants** : `RDV-xxx` (agenda), `ADM-xxx` (accueil/admission), `CAI-xxx` (caisse), `FAC-xxx` (facturation), `ASS-xxx` (dossier d'assurance), `REC-xxx` (créances/recouvrement), `TRV-xxx` (transversal), `SEC-xxx` (sécurité).

> **Avertissement général** — Ce PRD décrit l'existant tel qu'analysé dans le code source du prototype (React 18 + TypeScript + Vite, aucune persistance). Le prototype utilise des données fictives et des simulations explicites. Aucune intégration backend, MySQL ou FNE n'existe aujourd'hui ; tout ce qui relève de ces domaines est soit **[PROPOSÉE]**, soit listé en section 19. Le schéma MySQL de la section 13 est une **proposition conceptuelle**, pas un schéma existant. Un fichier `docs/mysql-schema-provisional.sql` existe dans le projet ; il n'a pas été audité ligne à ligne pour ce PRD et ne doit pas être considéré comme validé sans vérification.

---

# 1. PRÉSENTATION GÉNÉRALE ET OBJECTIFS

## 1.1 Contexte
Le Groupe Médical HOMEA (Côte d'Ivoire) dispose d'un prototype de Dossier Patient Informatisé (DPI) développé dans Bolt.new : une application React/TypeScript monopage, sans backend, dont les données vivent en state React (et, pour la caisse, dans `localStorage`). Le frontend existant sera **conservé** ; le développeur doit y brancher une persistance MySQL, des API et les règles de gestion serveur.

## 1.2 Objectifs du processus 1
1. Maîtriser le parcours administratif et financier du patient, de la prise de rendez-vous à la clôture financière de la venue.
2. Garantir la cohérence des informations patient, payeur, facture et créance entre les six modules.
3. Assurer la traçabilité et les habilitations sur toutes les opérations sensibles (encaissement, annulation, validation, transmission assureur).
4. Préparer la conformité à la facturation électronique normalisée (FNE) en Côte d'Ivoire.

## 1.3 Objectifs qualité
- Une seule source de vérité par donnée (patient, venue, facture, créance).
- Aucune opération financière sans piste d'audit.
- Interdiction structurelle des modifications non autorisées d'une session de caisse clôturée.

---

# 2. PÉRIMÈTRE FONCTIONNEL

## 2.1 Dans le périmètre (développement)
| Module | Contenu |
|---|---|
| 1. Agenda et rendez-vous | Agendas médecins, créneaux, RDV, statuts, arrivée |
| 2. Accueil et admission | Identification patient, doublons, admission, épisodes/venues, payeur |
| 3. Caisse | Caisses, sessions, encaissements, remboursements, clôtures, consolidation |
| 4. Facturation | Catalogue, cotation, préfacture, facture, encaissement part patient, FNE |
| 5. Dossier d'assurance | Référentiel assureurs, droits, dossier de prise en charge, pièces, transmission |
| 6. Créances et recouvrement | Créances, bordereaux, retours, règlements assurance, rapprochement, reporting |

## 2.2 Hors périmètre (interfaces uniquement)
Les autres processus du DPI (consultations, prescriptions, laboratoire, imagerie, pharmacie, soins infirmiers, hospitalisation, administration) sont exclus du développement. Ils interagissent avec le processus 1 uniquement par :
- **OBS-001** [OBSERVÉE] : les lignes de facture portent une `LineOrigin` (`laboratoire`, `imagerie`, `pharmacie`, `hospitalisation`, `acte-de-soins`, `manuelle`) — les modules de soins alimentent la préfacturation via cette origine.
- **OBS-002** [OBSERVÉE] : l'écran Prescription génère des lignes pharmacie/laboratoire qui rejoignent le résumé des prescriptions ; leur facturation transite par la venue (`episode`).
- **OBS-003** [DÉDUITE] : le lit affecté à une hospitalisation est choisi dans l'écran d'admission ; la cohérence d'occupation des lits relève du processus hospitalisation (interface : réservation/libération de lit à l'admission/clôture).

## 2.3 Éléments non analysés
- `docs/mysql-schema-provisional.sql` : présent mais non audité pour ce PRD.
- Écran `Reporting.tsx` : analysé et déclaré **déconnecté des données réelles** (mock en dur, réservé profil « direction ») ; non repris comme spécification.
- Écran `Administration.tsx` et `AdminOps.tsx` : non analysés (hors périmètre processus 1, sauf habilitations mentionnées section 15).
- Modules de soins (consultation, prescriptions, labo, imagerie, pharmacie, soins) : analysés uniquement sous l'angle des interfaces (2.2).

---

# 3. ANALYSE DE L'EXISTANT

## 3.1 Architecture du prototype
| Aspect | État observé |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind. **Conservé tel quel.** |
| Routage | Pas de routeur ; navigation par state (`currentScreen` dans `App.tsx`) |
| Persistance | **Aucune** sauf : caisse → `localStorage['homea-cash-state-v1']` ; préférences agenda → `localStorage['appt-prefs']` |
| Sources de vérité | 3 disjonctives : state React, module `data/episodes.ts` mutable, store localStorage caisse |
| Backend / API | Aucun |
| Authentification | Écran `Login.tsx` à sélection de profil (aucune vraie authentification) |
| Habilitations | Aucun contrôle serveur ; le « responsable » = utilisateur actif du `LoginSession` |

## 3.2 Inventaire des composants par module (OBSERVÉ)

### Module 1 — Agenda et rendez-vous
- **Écran** : `src/screens/AppointmentScheduling.tsx` (916 lignes) avec `NewAppointmentModal` (+ mode tout-venant), `DetailPanel`, `QueueView`, `AvailabilityView`, `DayGrid`, `WeekGrid`, `HistoryTimeline`, glisser-déposer HTML5.
- **Types** : `AppointmentStatus = 'planned' | 'to-confirm' | 'confirmed' | 'arrived' | 'waiting' | 'in-consultation' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled' | 'walk-in'` ; `AppointmentType = 'first' | 'follow-up' | 'urgent' | 'teleconsult' | 'walk-in'` ; `CoverageMode = 'particular' | 'insurance' | 'mutual'` ; `Appointment { id, patientId, doctorId, date, time, duration, type, reason, roomId, status, coverage, priority: 'normal'|'medical', comment?, confirmationChannel?: 'phone'|'sms'|'email', arrivalTime?, isLate?, lateReason?, history[] }`.
- **Modèle médecin** : `Doctor { …, consultationDays: number[], startTime, endTime, slotDuration, breaks[], roomId, absences[], unavailabilities[], maxPerHalfDay, allowUrgency }`.
- **Données fictives** : `appointments` (30 items `apt001`–`apt030`, semaine 2026-09-15→19), `doctors` (5), `rooms` (3). Date du jour figée `TODAY = '2026-09-15'`.
- **Implémenté** : 4 vues (jour/semaine/liste/aujourd'hui) ; création RDV et tout-venant avec contrôles riches (homonymes bloquants, disponibilité, pauses, quota demi-journée, chevauchements médecin/salle/patient, double confirmation urgence, créneaux alternatifs) ; transitions manuelles vers `confirmed/arrived/waiting/in-consultation/completed/cancelled/rescheduled/no-show` ; édition date/heure/médecin/salle ; duplication suivi à J+7 ; historique horodaté ; file d'attente avec priorité médicale ; panneau de gestion des disponibilités (state local non répercuté sur les contrôles de création) ; indicateurs.
- **Simulé** : impression (« Impression simulée »), temps d'attente codé en dur (18 min), `doctorDelay` aléatoire.
- **Absent** : persistance, notifications réelles (SMS/email = simple champ), `isLate`/`lateReason` jamais alimentés, type `QueueEntry` déclaré mais inutilisé.

### Module 2 — Accueil et admission
- **Écrans** : `src/screens/Reception.tsx` (966 lignes), `src/components/AdmitPatientModal.tsx` (466 lignes, machine à 3 modes `choose|form|confirm`), `src/screens/PatientAdministrative.tsx` (fiche administrative, impression `window.print()` réelle).
- **Types** : `Patient { id, code, firstName, lastName, birthDate, gender: 'M'|'F', phone, address, chronicConditions, emergencyContact, emergencyPhone, insurance, insuranceNumber, birthName?, cmuNumber?, coverageRate?, idType?, idNumber?, photo? }` ; `IdType` (8 valeurs), `PERMANENT_ID_TYPES`, `isPermanentId()` ; `Admission { …, status: 'waiting'|'admitted'|'in-consultation'|'discharged', department, bedNumber?, assignedDoctor?, priority }` ; `Episode { id, patientId, episodeNumber, type: 'consultation'|'examens'|'hospitalisation', serviceId, practitionerId?, appointmentId?, admittedAt, closedAt?, status: 'actif'|'clos'|'annule', administrativeStatus: 'formalites-en-cours'|'attente-reglement'|'pret-consultation'|'prise-en-charge-en-cours', careStatus, admissionReason, createdBy, cancellationReason?, bedId?, bedPending?, events[] }`.
- **Données fictives** : `patients` (21, dont homonymes volontaires p001/p015 et p003/p011 ; anomalie : `p021` code `HOMEA-2026-0142` hors série 0001–0020), `admissions` (6, modèle legacy), `episodes` (4 seed `VEN-2026-0001…0004`).
- **Implémenté** : recherche multi-critères insensible casse/accents, onglets IUP/CMU/venue ; création patient avec détection d'homonymes et contrôle pièce d'identité permanente/provisoire ; modification de fiche (overlay local) ; **admission** par type de venue (consultation / examens / hospitalisation avec lit), garde-fou « patient déjà admis » exigeant justification pour une 2ᵉ venue active, création d'épisode numéroté `VEN-2026-XXXX`, confirmation puis « Ouvrir la venue » ou « Poursuivre vers la facturation ».
- **Simulé** : enregistrement admission (`setTimeout` 700 ms + spinner) ; « Enregistrer » d'un nouveau patient **ne crée aucun patient** (message de succès factice) ; modifications de fiche non répercutées.
- **Absent** : persistance, unicité serveur du code IUP, marquage réel du lit occupé, mutation des statuts administratifs intermédiaires de l'épisode (existants dans les données, jamais pilotés par l'UI).
- **Incohérence majeure** : deux modèles d'admission coexistent — `Admission` (legacy, statuts anglais) et `Episode` (actif, statuts français). L'état « admis » est calculé sur les épisodes, mais la recherche « venue » de l'accueil filtre encore sur `admissions`. `admissions.ts` est partiellement orphelin.

### Module 3 — Caisse et suivi des caisses
- **Écrans** : `src/screens/MyCashRegister.tsx` (986 lignes : ouverture, encaissement, avances, remboursements, mouvements de fonds, journal, clôture), `src/screens/CashSupervision.tsx` (473 lignes : contrôle contradictoire, clôture exceptionnelle, consolidation), `src/components/CashJournalPrint.tsx`.
- **Types** (déclarés dans `src/data/cashRegisters.ts`, **pas** dans `types/index.ts`) : `CashSessionStatus = 'ouverture-a-confirmer' | 'ouverte' | 'cloture-en-preparation' | 'soumise-au-controle' | 'correction-demandee' | 'cloturee'` ; `CashPaymentMode = 'Espèces' | 'Mobile Money' | 'Carte bancaire' | 'Virement' | 'Chèque' | 'Autre'` ; `MovementKind` (8 valeurs : `encaissement`, `remboursement`, `apport-fonds`, `retrait-securite`, `remise-responsable`, `transfert-sortant`, `transfert-entrant`, `sortie-exceptionnelle`) ; `CashSession`, `CashMovement`, `CashAdvance { status: 'disponible'|'affectee'|'remboursee' }`, `CashAuditEvent`, `CashSettings` (seuils : retrait sécurité 300 000, approbation remboursement 25 000, validation écart 5 000, fond de caisse 50 000).
- **Données fictives** : `buildDemoState()` — 3 postes (accueil/urgences/pharmacie), 1 session `SESS-2026-0100`, 4 mouvements (ENC-2026-0101 à MVT-2026-0104), séquence 100.
- **Implémenté** (module le plus abouti) : cycle complet de session avec transitions `ouverte → cloture-en-preparation → (retour possible) → soumise-au-controle → cloturee | correction-demandee` + clôture exceptionnelle ; **règles métier codées** : une seule session ouverte par agent, poste non partageable, une session par agent/jour, écart d'ouverture à justifier, remboursement plafonné au paiement d'origine avec approbation obligatoire au-delà du seuil, interdiction d'auto-approbation, transferts à double confirmation, contrepassation sans effacement (annulation + mouvement inverse), avoir à montant nul, écart ≥ seuil à justifier, bon de remise `BON-XXXX` unique ; journal avec solde cumulé, duplicata tracé ; consolidation par agent/mode/poste ; export CSV réel (`exportCashCsv()`).
- **Simulé** : persistance localStorage, notifications `window.alert()`, badges « validation simulée — pas une signature électronique certifiée », polling 400 ms, rapprochement non-espèces manuel sur pièces.
- **Absent** : backend, rôles réels, signature certifiée, numérotation centralisée.
- **Anomalies relevées** : garde `applyAdvance` incorrecte (peut affecter une avance `remboursee`) ; liste des transferts en attente n'exclut pas ceux de l'utilisateur courant ; `ClosureView` ventile les sorties par approximation.

### Module 4 — Facturation
- **Écrans** : `src/screens/Billing.tsx` (1172 lignes : liste, 8 filtres, 9 KPI, détail, validation, encaissement, annulation, avoir, duplicata, impression, édition de lignes, catalogue), `src/components/NewBillingDocModal.tsx`, `src/components/BillingTemplates.tsx` (choix de type → sélection de modèle → création), `src/components/InvoicePrint.tsx` (filigrane, mention « PROTOTYPE — NON FISCAL », « N° FNE : SIMULATION-… », QR fictif, montant en lettres).
- **Types** (actifs, dans `src/data/billingDocs.ts`) : `BillingDocType = 'cotation' | 'prefacture' | 'facture'` ; `BillingDocStatus = 'brouillon' | 'en-attente' | 'valide' | 'transforme' | 'partiellement-paye' | 'paye' | 'annule'` ; `BillingDoc { …, lines: BillingLine[], payments: BillingPayment[], insuranceTracking?, history, validatedBy?, cancelReason?, creditNote? }` ; `LineStatus = 'prevu' | 'realise' | 'a-confirmer' | 'annule' | 'facturable' | 'non-facturable'` ; `CoverageLineStatus` ; `InsuranceTrackingStatus = 'a-preparer' | 'transmise' | 'en-traitement' | 'acceptee' | 'partiellement-acceptee' | 'rejetee' | 'reglee'` ; helpers `lineGross/lineNet/lineAssurance/linePatient/docTotals` (ventilation part patient/part assurance), `patientInsuranceInfo` (taux **fixé arbitrairement à 80**).
- **Modèle legacy mort** : `Invoice`/`InvoiceItem` (`types/index.ts`) + `src/data/billing.ts` (4 factures) **ne sont utilisés par aucun écran** du processus 1.
- **Données fictives** : `demoDocs` (8 documents), `catalogue` (22 items avec `standardPrice`, `insuredPrice`, `contractedPrice`), `demoTemplates` (7 modèles), `scenarioPrefacture` (PP-2026-00188, maternité).
- **Implémenté** : création (cotation/préfacture/facture, à partir d'un modèle) ; transformation cotation→préfacture ou facture, préfacture→facture (origine → `transforme`, sourceRef, lignes → `facturable`) ; validation `brouillon→valide` avec création automatique du suivi assurance (`a-preparer`, montant réclamé = part assurance) ; encaissement part patient avec recalcul `paye`/`partiellement-paye` ; annulation motivée ; avoir `AV-2026-XXXX` (**décoratif : statut et soldes non ajustés**) ; catalogue consultable/éditable localement ; impression ; historique.
- **Simulé** : tout en state local ; validateur codé en dur « Mme Traoré (Facturation) », caissier « M. Koné (Caisse) » ; FNE simulé.
- **Absent** : persistance, FNE réel, numérotation robuste (comptage, risque de collision), habilitations, TVA/comptabilité.

### Module 5 — Dossier d'assurance
- **Écran** : `src/screens/InsuranceDossiers.tsx` (925 lignes : compteurs, filtres, parcours 7 étapes, couverture, contrôles automatiques, pièces, transmission, historique).
- **Types** (`src/data/insuranceDossiers.ts`) : `DossierStatus = 'en-cours' | 'bloque' | 'pret-transmission' | 'transmis' | 'a-corriger'` ; `DossierAssurance { id, number, docId, prefactureRef?, episodeNumber, …, coverage{19 champs : assureur, numéro d'adhérent, bénéficiaire, validité, droits vérifiés, taux, ticket modérateur (deductible), exclusions, plafond annuel, accord préalable…}, pieces: RequiredPiece[], transmission?, corrections?, history }` ; `PieceStatus = 'a-fournir' | 'jointe-a-verifier' | 'conforme' | 'rejetee' | 'non-applicable'` ; `Bordereau`, `BordereauStatus = 'en-preparation' | 'transmis' | 'echec' | 'correction-demandee'` ; `buildControls()` : 6 contrôles automatiques (validité du bon, montant ≤ autorisé, tarifs conventionnés, cohérence net = patient + assurance, doublons, exclusions).
- **Données fictives** : `demoDossiers` (3 : da-871 bloqué maternité, da-854 transmis CNAM, da-812 à corriger ASKIA), `demoBordereaux` (2 : bord-077 CNAM 42 000, bord-081 ASKIA 21 000).
- **Implémenté** : `bloque → pret-transmission` (validation de conformité conditionnée aux pièces), `pret-transmission → transmis` (transmission avec bordereau et preuve de dépôt), renvoi en correction (`a-corriger`) ; pièces : joindre / valider / rejeter ; impression bordereau ; contrôles automatiques.
- **Simulé** : bandeau « Simuler la transmission — aucune donnée réelle envoyée » ; aucun fichier réellement téléversé ; signatures `simulated: true` ; preuve de dépôt simulée.
- **Absent** : persistance, GED réelle, intégration portail organisme, workflow multi-utilisateurs, visas réels.

### Module 6 — Créances et recouvrement
- **Écran** : `src/screens/InsuranceReceivables.tsx` (466 lignes : 4 onglets — vue d'ensemble, détail, rejets/relances, récapitulatif annuel).
- **Types** (locaux à l'écran) : `InsurancePayment { id, manager, receivedDate, amount, mode, bank, reference, status, allocations: {docId, amount}[], attachments[] }` ; `ClaimRejection { id, docId, date, amount, reason, status: 'a-traiter'|'conteste'|'retransmis'|'resolu' }` ; `Reminder` ; `PaymentStatus = 'pending'|'confirmed'|'cancelled'|'rejected'`.
- **Règles calculées** : périmètre = factures assurées non annulées ; dû = part assurance ; payé = allocations confirmées, sinon `insuranceTracking.amountPaid` ; **échéance = date de transmission + 30 jours** ; balance âgée à 5 tranches (non échu → >90 j) ; taux de recouvrement.
- **Implémenté** : KPI, regroupement par gestionnaire/compagnie avec lignes dépliables, balance âgée, détail par créance avec rattachement patient/facture, **enregistrement de règlement** (montant validé ≤ solde, mode, banque, référence, pièces jointes réelles via drag & drop ≤ 5 Mo, allocation à la facture, mise à jour du `insuranceTracking`), saisie et traitement des rejets (4 statuts), relances (sans envoi), récapitulatif annuel 12 mois, exports CSV réels, impression.
- **Simulé** : tout en state local ; relances sans envoi ; règlements créés directement `confirmed` (les états `pending/cancelled/rejected` ne sont jamais produits).
- **Absent** : persistance, lettres de relance réelles, écritures comptables, workflow de litige.
- **Note** : `Reporting.tsx` ne contient **aucune** fonctionnalité de recouvrement (mock déconnecté).

## 3.3 Synthèse des écarts majeurs
1. Trois sources de vérité disjointes, aucune persistance serveur.
2. Double modèle mort `Invoice` (legacy) vs `BillingDoc` (actif).
3. Double modèle d'admission `Admission` vs `Episode`.
4. Trois échelles de statut pour la transmission assureur (`BordereauStatus`, `transmission.status`, `InsuranceTrackingStatus`) jamais synchronisées.
5. Numérotation par comptage (FAC/PREF/COT/DA/BORD/SESS/ENC) : fragile, non pérenne.
6. Aucune habilitation réelle ; validateurs/caissiers codés en dur.
7. Aucune intégration FNE ; mentions « SIMULATION » et « PROTOTYPE — NON FISCAL ».

---

# 4. ACTEURS ET RÔLES

## 4.1 Acteurs observés dans le prototype [OBSERVÉE]
| Acteur | Écrans | Actions observées |
|---|---|---|
| Secrétariat / agenda | AppointmentScheduling | RDV, tout-venant, confirmation, annulation |
| Accueil | Reception | Recherche/création patient, admission, poursuite facturation |
| Caissier(ère) | MyCashRegister | Ouverture, encaissement, avances, remboursements, clôture |
| Responsable caisse | CashSupervision | Approbations, contrôles contradictoires, clôture exceptionnelle, consolidation |
| Facturation | Billing | Cotation, préfacture, facture, encaissement, annulation, avoir |
| Assurance | InsuranceDossiers | Couverture, pièces, transmission, correction |
| Recouvrement | InsuranceReceivables | Suivi créances, rejets, règlements |
| Direction | Reporting (hors périmètre) | — |

## 4.2 Rôles et habilitations [PROPOSÉE] — à valider avec HOMEA
- **SEC-001** Le système doit implémenter les rôles suivants (matrice en section 15) : `ADMIN`, `SECRETAIRE_AGENDA`, `AGENT_ACCUEIL`, `CAISSIER`, `RESPONSABLE_CAISSE`, `FACTURATEUR`, `GESTIONNAIRE_ASSURANCE`, `DIRECTION` (lecture).
- **SEC-002** Toute action d'écriture doit être attribuée à un utilisateur authentifié ; l'attribution codée en dur (« Mme Traoré », « M. Koné ») doit disparaître.
- **SEC-003** La séparation des tâches doit être serveur : un utilisateur ne peut pas approuver une opération qu'il a créée (règle déjà codée côté client pour remboursements, clôtures et transferts — à porter au niveau API).
- **SEC-004** [DÉDUITE] Le profil réel (« facturation », « caisse ») est déjà reflété dans les données de login ; l'implémentation doit en dériver les habilitations.

---

# 5. SPÉCIFICATIONS — AGENDA ET RENDEZ-VOUS

## 5.1 Gestion des agendas
- **RDV-001** [OBSERVÉE] Le modèle `Doctor` porte : jours de consultation, heures début/fin, durée de créneau, pauses, salle, absences, indisponibilités datées, quota par demi-journée, autorisation d'urgences.
- **RDV-002** [OBSERVÉE] L'UI de disponibilités permet de modifier ces paramètres et d'ajouter absences/indisponibilités/pauses.
- **RDV-003** [OBSERVÉE — écart] Les modifications faites dans l'UI de disponibilités sont conservées en state local et **ne sont pas répercutées** sur les contrôles de création de RDV (qui lisent les données statiques). En production, la disponibilité doit être une seule source : **RDV-004** [PROPOSÉE] persister les paramètres d'agenda en base et faire lire les contrôles de conflit par le serveur depuis cette seule source.
- **RDV-005** [OBSERVÉE] Les contrôles de conflit implémentés côté client : chevauchement RDV médecin, chevauchement salle, chevauchement patient, hors plage horaire, dans une pause, jour non travaillé, absence/indisponibilité, quota demi-journée atteint.
- **RDV-006** [PROPOSÉE] Ces contrôles doivent être réimplémentés côté serveur (uniqueness/concurrency) : deux secrétaires créant le même créneau simultanément ne doivent pas aboutir à un double RDV.
- **RDV-007** [PROPOSÉE] Gestion des jours non travaillés (fermeture établissement) : non présente dans le prototype — à ajouter au paramétrage.
- **RDV-008** [DÉDUITE] Les créneaux alternatifs proposés (`getAlternativeSlots`) doivent rester disponibles après migration.

## 5.2 Gestion des rendez-vous
- **RDV-010** [OBSERVÉE] Création d'un RDV : recherche/sélection patient existant, création patient depuis le modal (voir ADM-010), médecin, motif, type (`first`, `follow-up`, `urgent`, `teleconsult`, `walk-in`), date/heure/durée, mode de couverture (`particular|insurance|mutual`), priorité (`normal|medical`), canal de confirmation.
- **RDV-011** [OBSERVÉE] Tout-venant : création directe d'un RDV de type `walk-in` daté du jour.
- **RDV-012** [OBSERVÉE] Modification : date/heure (y compris glisser-déposer), changement de médecin, changement de salle, changement de statut, duplication en « suivi » à J+7.
- **RDV-013** [OBSERVÉE] Annulation et report avec motif obligatoire (saisi via `window.prompt` — à remplacer par un vrai formulaire [PROPOSÉE]).
- **RDV-014** [OBSERVÉE] Chaque action ajoute une entrée d'historique horodatée (`history[]`).
- **RDV-015** [OBSERVÉE — écart] Absence (« no-show ») : bouton présent, mais `isLate`/`lateReason` jamais alimentés ; le suivi fin des retards est à compléter [PROPOSÉE].
- **RDV-016** [OBSERVÉE] Historique des RDV par patient disponible dans la fiche administrative.
- **RDV-017** [PROPOSÉE] Les confirmations par SMS/email sont des champs informatifs dans le prototype ; l'envoi réel (passerelle SMS/email) est une exigence proposée à valider.

## 5.3 Statuts et transitions
- **RDV-020** [OBSERVÉE] Statuts existants : `planned, to-confirm, confirmed, arrived, waiting, in-consultation, completed, cancelled, no-show, rescheduled, walk-in`.
- **RDV-021** [OBSERVÉE — écart] Dans l'UI, tous les boutons de transition sont disponibles quel que soit le statut courant (pas d'automate). **[PROPOSÉE]** Automate à implémenter côté serveur :

| De \ Vers | confirmed | cancelled | arrived | waiting | in-consultation | completed | no-show | rescheduled |
|---|---|---|---|---|---|---|---|---|
| planned / to-confirm | ✓ | ✓ | — | — | — | — | — | ✓ |
| confirmed | — | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |
| arrived | — | ✓ | — | ✓ | ✓ | — | ✓ | ✓ |
| waiting | — | ✓ | — | — | ✓ | — | ✓ | ✓ |
| in-consultation | — | ✓* | — | — | — | ✓ | — | ✓* |
| completed | — | — | — | — | — | — | — | — |
| cancelled / no-show | — | — | — | — | — | — | — | — |
| walk-in | — | ✓ | — | ✓ | ✓ | — | ✓ | ✓ |

\* annulation/déplacement en cours de consultation : autorisation responsable [PROPOSÉE].

- **RDV-022** [PROPOSÉE] Conditions : `completed` exige une consultation réellement démarrée ; `no-show` exigible seulement après l'heure du RDV ; toute transition doit être tracée avec utilisateur, horodatage et motif le cas échéant.
- **RDV-023** [OBSERVÉE — écart] Le statut initial d'un tout-venant est `walk-in` ; aucune transition dédiée n'est codée ensuite. Clarifier le cycle cible du tout-venant [PROPOSÉE : `walk-in` se comporte comme `arrived`].

## 5.4 Intégration avec l'accueil
- **RDV-030** [OBSERVÉE] Le passage RDV→arrivée existe : l'accueil peut consommer un RDV en attente (`pendingAppt`/`onPendingApptConsumed`) et le statut `arrived` porte un `arrivalTime`.
- **RDV-031** [OBSERVÉE] L'admission via `AdmitPatientModal` permet d'associer un RDV à l'épisode (`appointmentId`).
- **RDV-032** [PROPOSÉE] Règle cible : un RDV `arrived` donne lieu à **une** venue (épisode) ; la création d'épisode doit poser un verrou anti-duplication sur `appointmentId` (un RDV ne peut produire qu'un seul épisode actif).
- **RDV-033** [DÉDUITE] Les informations patient ne doivent jamais être ressaisies au passage RDV→admission : le dossier patient est la source unique (nom, code IUP, assurance).

---

# 6. SPÉCIFICATIONS — ACCUEIL ET ADMISSION

## 6.1 Identification du patient
- **ADM-001** [OBSERVÉE] Recherche multicritère (nom, prénom, téléphone, code dossier, CMU) insensible casse/accents, 4 onglets (critères, dossier/IUP, CMU, venue).
- **ADM-002** [OBSERVÉE] Création de dossier patient avec : nom, prénom (nom de naissance en option), date de naissance, sexe, téléphone, adresse, contact d'urgence, type et numéro de pièce d'identité, assurance + numéro + taux, CMU.
- **ADM-003** [OBSERVÉE] Contrôle des doublons/homonymes à la création : liste des correspondances trouvées avec actions « Voir le dossier » / « Sélectionner » ; blocage jusqu'à vérification explicite.
- **ADM-004** [OBSERVÉE — écart] Le code patient (`HOMEA-2026-XXXX`) est statique dans les données de démo ; sa génération (séquence annuelle) est une exigence de production. **ADM-005** [PROPOSÉE] Numérotation serveur : `HOMEA-<année>-<séquence>` sans réutilisation, en transaction.
- **ADM-006** [OBSERVÉE — écart] « Enregistrer » un nouveau patient ne crée actuellement **aucun enregistrement** (message de succès factice) — défaut bloquant à corriger en production.
- **ADM-007** [OBSERVÉE] Distinction pièce permanente (`carte-assurance`, `cni`, `carte-cmu`) / provisoire (`isPermanentId`) avec badge.
- **ADM-008** [PROPOSÉE] Identité des représentants légaux pour mineurs : non présente dans le prototype ; à ajouter (lien de parenté, pièce du représentant) — à valider avec HOMEA.
- **ADM-009** [OBSERVÉE] Modification de fiche possible depuis l'accueil (et fiche administrative lisible avec impression réelle). **[PROPOSÉE]** Toute modification de fiche doit être historisée (qui, quoi, avant/après) — l'objet `events` des épisodes montre le pattern, il ne couvre pas la fiche patient.
- **ADM-009b** [OBSERVÉE] Anomalie de données à ne pas reproduire : `p021` a un code hors série (`HOMEA-2026-0142`).

## 6.2 Admission
- **ADM-010** [OBSERVÉE] L'admission se fait via `AdmitPatientModal` : type de venue (consultation / examens / hospitalisation), service (10 options), motif, RDV associé, praticien (consultation), première/suivi, catégories d'examens + origine prescription (examens), lit parmi les lits disponibles du service (hospitalisation), observation.
- **ADM-011** [OBSERVÉE] Admission avec ou sans rendez-vous (tout-venant via agenda).
- **ADM-012** [OBSERVÉE] Garde-fou anti-double venue : si le patient a déjà un épisode actif, une justification est exigée pour en créer une seconde.
- **ADM-013** [OBSERVÉE — écart] L'observation saisie dans le modal n'est pas transmise à l'épisode créé ; à brancher.
- **ADM-014** [OBSERVÉE] À la création : épisode `actif`, `administrativeStatus = formalites-en-cours`, `careStatus = en-attente`, numérotation `VEN-2026-XXXX`.
- **ADM-015** [OBSERVÉE] Écran de confirmation avec « Ouvrir la venue » / « Poursuivre vers la facturation ».
- **ADM-016** [DÉDUITE] Le type de prise en charge existe à l'agenda (`CoverageMode`) et sur la fiche patient (`insurance`, `coverageRate`) mais **l'identification formelle du payeur à l'admission n'est pas structurée** : pas d'écran dédié payeur. **ADM-017** [PROPOSÉE] Structurer à l'admission : payeur principal (particulier / assurance X / mutuelle / CMU / employeur), pièces exigées, et possibilité de combiner plusieurs prises en charge (règle d'ordre et de répartition à définir avec HOMEA).
- **ADM-018** [OBSERVÉE] Le lit choisi n'est pas marqué occupé en base (il n'y a pas de base) ; en production, l'affectation de lit doit être transactionnelle avec le référentiel des lits (interface avec le processus hospitalisation).
- **ADM-019** [PROPOSÉE] Contrôles administratifs avant validation d'admission : champs obligatoires (téléphone déjà contrôlé [OBSERVÉE]), validité des droits d'assurance (lien module 5), pièces justificatives manquantes → admission possible mais dossier marqué incomplet (à valider).

## 6.3 Séjours et passages — définitions
- **ADM-020** [OBSERVÉE] Objets présents : `Patient` (identité), `Appointment` (rendez-vous), `Episode` (venue/passage — numéroté `VEN-…`, avec statut administratif et de soins), `Admission` (modèle legacy en voie d'abandon).
- **ADM-021** [DÉDUITE] Correspondance métier : **Venue = Episode**. Le « séjour » (hospitalisation avec entrée/sortie) correspond à un épisode de type `hospitalisation` portant `bedId` et dates ; les champs `entryDate/exitDate` existent sur `BillingDoc` [OBSERVÉE], pas sur l'épisode — à structurer [PROPOSÉE].
- **ADM-022** [PROPOSÉE] Cible de production : un seul modèle (Episode) ; `Admission` est supprimé ou migré ; la recherche « venue » de l'accueil doit interroger les épisodes.

## 6.4 Contrôles administratifs
- **ADM-030** [OBSERVÉE] Vérification des champs obligatoires à la création patient (téléphone) et homonymes (blocage).
- **ADM-031** [OBSERVÉE] Vérification des droits d'assurance : champ `rightsChecked`, `rightsSource` (« saisie manuelle » / « intégration ») au niveau du dossier d'assurance.
- **ADM-032** [PROPOSÉE] Correction des erreurs : toute correction de données administratives après émission de documents financiers doit passer par un mouvement tracé (pas d'UPDATE silencieux) — à définir avec HOMEA.
- **ADM-033** [OBSERVÉE] Historique des modifications : présent pour les épisodes (`events`) et l'agenda (`history`) ; absent pour la fiche patient [PROPOSÉE à ajouter].

## 6.5 Transmission vers la facturation
- **ADM-040** [OBSERVÉE] L'accueil enchaîne vers la facturation (pipeline `DocTypeChooser → TemplateSelectionModal → NewBillingDocModal`), en pré-sélectionnant patient, épisode, service, médecin.
- **ADM-041** [DÉDUITE] Données minimum transmises : `patientId`, `episode`, `service`, `doctor`, assurance + numéro + taux (si assuré), type de document souhaité.
- **ADM-042** [PROPOSÉE] Le dossier de facturation doit être rattaché de manière unique à la venue (une venue → plusieurs documents possibles, mais tout document référence sa venue).

---

# 7. SPÉCIFICATIONS — CAISSE ET SUIVI DES CAISSES

## 7.1 Gestion des caisses
- **CAI-001** [OBSERVÉE] Référentiel de postes de caisse : `CashRegister` (accueil/urgences/pharmacie en démo) avec fond de caisse attendu.
- **CAI-002** [OBSERVÉE] Ouverture de session : fond de caisse initial avec comptage par coupures (`CashDenomination`), justification obligatoire si écart avec le fond attendu.
- **CAI-003** [OBSERVÉE] Règles : une seule session ouverte par agent ; un poste ne peut porter qu'une session active ; une session par agent et par jour (paramétrable).
- **CAI-004** [OBSERVÉE] Cycle de session : `ouverture-a-confirmer → ouverte → cloture-en-preparation ⇄ (reprise) → soumise-au-controle → cloturee` ; branche `correction-demandee` réouvrable ; clôture exceptionnelle par un responsable ≠ titulaire.
- **CAI-005** [OBSERVÉE] Le paramétrage des seuils existe (`CashSettings`) : à persister et administrer côté serveur.
- **CAI-006** [PROPOSÉE] Association caisse↔utilisateur : le prototype relie la session à l'agent connecté ; le référentiel des habilitations de caisse (quels agents sur quel poste) est à définir avec HOMEA.

## 7.2 Encaissements
- **CAI-010** [OBSERVÉE] Encaissement d'un document (facture) depuis le module facturation : paiement réparti sur plusieurs modes, avec espèces (montant remis / monnaie rendue calculée).
- **CAI-011** [OBSERVÉE] Statuts de paiement : `en-attente | confirme | echoue | annule` (`echoue` déclaré, jamais produit — à trancher [PROPOSÉE : supprimer ou implémenter]).
- **CAI-012** [OBSERVÉE] Avances/acomptes : `CashAdvance` avec cycle `disponible → affectee → remboursee`, affectation possible sur documents. **Anomalie à corriger** : la garde `applyAdvance` permet d'affecter une avance déjà `remboursee` si le solde le permet.
- **CAI-013** [OBSERVÉE] Reçus : numéro `ENC-2026-XXXX`, duplicata tracé (`countJournalReprint`), réimpression journalisée.
- **CAI-014** [DÉDUITE] Chaque règlement est lié au document encaissé (`payments[]` du `BillingDoc`) ; le lien explicite au patient découle du document.
- **CAI-015** [PROPOSÉE] Échéancier de paiement en plusieurs fois : non présent dans le prototype (un paiement partiel est possible, mais pas de plan d'échéances) — à valider.

## 7.3 Modes de règlement
- **CAI-020** [OBSERVÉE] Modes prévus : `Espèces, Mobile Money, Carte bancaire, Virement, Chèque, Autre`.
- **CAI-021** [PROPOSÉE] Besoins complémentaires à valider : références obligatoires pour modes non-espèces (opérateur, transaction, banque, émetteur du chèque), rapprochement automatique des flux Mobile Money/banque, plafonds par mode.

## 7.4 Opérations de caisse
- **CAI-030** [OBSERVÉE] Annulation d'encaissement : contrepassation (mouvement d'annulation lié `cancelOfId`, sans effacement) — à préserver impérativement.
- **CAI-031** [OBSERVÉE] Remboursements : plafonnés au paiement d'origine (contrôle du déjà remboursé), approbation obligatoire au-delà de 25 000 FCFA, espèces suffisantes exigées, interdiction d'auto-approbation.
- **CAI-032** [OBSERVÉE] Mouvements de fonds : apport, retrait de sécurité (seuil 300 000), remise responsable, transferts sortant/entrant à double confirmation, sortie exceptionnelle.
- **CAI-033** [OBSERVÉE — écart] La « sortie exceptionnelle » n'est pas soumise à approbation malgré son libellé — à trancher [PROPOSÉE : l'assujettir à approbation responsable].
- **CAI-034** [OBSERVÉE] Avoirs : mouvement à montant nul (aucune sortie d'espèces).
- **CAI-035** [OBSERVÉE] Traçabilité : `CashAuditEvent` sur les opérations sensibles ; horodatage client à remplacer par horodatage serveur.
- **CAI-036** [OBSERVÉE] Anomalie de ventilation dans `ClosureView` (approximation des remboursements espèces) : à corriger par une ventilation exacte par nature de mouvement.

## 7.5 Suivi et rapprochement
- **CAI-040** [OBSERVÉE] Journal de caisse avec solde cumulé ; situation par caissier, par poste et par mode dans la consolidation ; écarts conservés.
- **CAI-041** [OBSERVÉE] Clôture : théorique vs déclaré, contrôle contradictoire (déclaré vs théorique) avec choix de remise des fonds (tout/partiel/aucun), bon de remise `BON-XXXX` unique.
- **CAI-042** [OBSERVÉE] Écart ≥ 5 000 FCFA : commentaire de validation obligatoire.
- **CAI-043** [OBSERVÉE] Consolidation : encaissements confirmés nets par agent/mode/poste, espèces en tiroirs, avances non affectées, écarts.
- **CAI-044** [PROPOSÉE] Règle anti-modification d'une session clôturée : au niveau base de données, la table des sessions/mouvements doit être immuable après `cloturee` (déclencheur refusant INSERT/UPDATE/DELETE sur mouvements d'une session clôturée ; toute correction passe par contrepassation, uniquement responsable). L'interface de caisse actuelle applique déjà ce principe côté client ; il faut le doubler serveur.
- **CAI-045** [OBSERVÉE] Export CSV réel (`exportCashCsv`) ; à compléter par export PDF [PROPOSÉE].
- **CAI-046** [PROPOSÉE] Rapprochement automatique des encaissements non-espèces : actuellement « manuel sur pièces (prototype) ».

---

# 8. SPÉCIFICATIONS — FACTURATION

## 8.1 Gestion des prestations
- **FAC-001** [OBSERVÉE] Catalogue : 22 items de démonstration, champs dont code, libellé, catégorie, `standardPrice`, `insuredPrice`, `contractedPrice`, `proposedRate`, `usuallyCovered`, actif/inactif.
- **FAC-002** [OBSERVÉE] Catalogue consultable et éditable localement (ajout, édition, duplication, activation, export par impression).
- **FAC-003** [PROPOSÉE] Catégories tarifaires : la structure (standard / assuré / conventionné) existe ; la gouvernance (qui fixe les tarifs, validité, historique des prix) est à définir avec HOMEA.
- **FAC-004** [OBSERVÉE] Remises : par ligne (montant), avec calcul brut → net. **FAC-005** [PROPOSÉE] Plafonner les remises autorisées par rôle (à valider).
- **FAC-006** [PROPOSÉE] Taxes : aucun calcul de TVA/TVA-sur-services dans le prototype ; les règles applicables au secteur privé de santé ivoirien (exonérations, FNE) doivent être vérifiées avant implémentation — **ne pas présumer du taux**.

## 8.2 Cotation
- **FAC-010** [OBSERVÉE] Création de cotation (`COT-2026-XXXX`) avec lignes, estimation (brut, remises, net, part assurance, part patient), validité (`validityDays`), impression/export avec mention « estimation ».
- **FAC-011** [OBSERVÉE] Transformation : cotation → préfacture ou facture (originale passe à `transforme`, nouveau document en `brouillon` avec `sourceRef`).
- **FAC-012** [DÉDUITE] Le montant estimatif est calculé par `docTotals` selon le taux de couverture du patient.

## 8.3 Préfacturation
- **FAC-020** [OBSERVÉE] Préfacture (`PREF-2026-XXXX`, ou `PP-…` pour le scénario maternité) : ajout/suppression de lignes, actualisation des montants, statuts de ligne `prevu | realise | a-confirmer | annule | facturable | non-facturable` pour suivre les prestations réalisées.
- **FAC-021** [OBSERVÉE] Transformation préfacture → facture avec historique.
- **FAC-022** [PROPOSÉE] Validation formelle de la préfacture (visa) avant transformation — à définir avec HOMEA.

## 8.4 Facturation
- **FAC-030** [OBSERVÉE] Facture (`FAC-2026-XXXX`) créable : directement (brouillon), depuis une cotation, depuis une préfacture.
- **FAC-031** [OBSERVÉE] Modèles de facture : 7 modèles de démonstration, recherche/sélection à la création, enregistrement d'un document comme modèle.
- **FAC-032** [OBSERVÉE] Ventilation part patient / part assurance : par ligne selon `coverageRate` et `CoverageLineStatus` (`couverte | non-couverte | partiellement-couverte | en-attente-accord`) ; totaux par `docTotals` (net, partAssurance, partPatient, encaissé, payé assurance, restes).
- **FAC-033** [OBSERVÉE — écart] Le taux de couverture est **fixé arbitrairement à 80** dans `patientInsuranceInfo` ; en production il doit venir du contrat/du dossier d'assurance.
- **FAC-034** [OBSERVÉE] Validation de facture : `brouillon → valide` (validateur tracé), avec création automatique du suivi assurance si part assurance > 0.
- **FAC-035** [OBSERVÉE] Encaissement part patient depuis la facture (modal paiement) avec recalcul du statut ; caissier en dur à remplacer par l'utilisateur authentifié.
- **FAC-036** [OBSERVÉE] Annulation avec motif obligatoire ; **avoir** `AV-2026-XXXX` créé mais **décoratif** (statut et soldes non ajustés) — l'avoir doit être un document financier réel impactant les soldes [PROPOSÉE : modèle d'avoir à définir].
- **FAC-037** [OBSERVÉE] Duplicata : notification seulement ; une réimpression tracée est attendue en production [PROPOSÉE].
- **FAC-038** [OBSERVÉE] Impression : composant `InvoicePrint` avec filigrane logo, mentions distinctes (estimation / provisoire / définitive), montant en lettres, mentions FNE simulées.
- **FAC-039** [PROPOSÉE] Facturation sans document préalable : actuellement la création directe de facture en brouillon est possible ; encadrer par une règle de workflow (à valider).

## 8.5 Suivi des factures
- **FAC-040** [OBSERVÉE] Statuts : `brouillon, en-attente, valide, transforme, partiellement-paye, paye, annule`.
- **FAC-041** [OBSERVÉE] Conditions codées : `paye` si encaissé ≥ part patient ; `partiellement-paye` sinon ; `transforme` après transformation ; `annule` avec motif.
- **FAC-042** [PROPOSÉE] Automate serveur : une facture `valide` ne peut être éditée dans ses montants (correction = avoir ou facture rectificative — à définir) ; une facture encaissée ne peut être annulée qu'avec remboursement préalable.

## 8.6 Exigences réglementaires FNE (Côte d'Ivoire)
- **FAC-050** [OBSERVÉE — écart] Aucune intégration FNE : les mentions « N° FNE : SIMULATION-… » et « PROTOTYPE — NON FISCAL » le rappellent explicitement.
- **FAC-051** [PROPOSÉE] À prévoir (sous réserve de vérification réglementaire par HOMEA) : interconnexion avec la plateforme FNE de la DGI (certification de l'établissement, authentification, émission de factures normalisées, QR code de vérification), conservation des FNE émises, gestion des avoirs et corrections conforme au dispositif, impact sur les documents imprimés (le filigrane « non fiscal » doit disparaître pour les factures certifiées).
- **FAC-052** [PROPOSÉE] Interface technique à isoler : service d'émission FNE (API fournisseur ou DGI) derrière un adaptateur, avec file d'attente en cas d'indisponibilité et statut de certification par facture (`non-certifiée / soumise / certifiée / rejetée`).
- **FAC-053** [OBSERVÉE] Le modèle `BillingDoc` ne porte aucun champ FNE réel ; à ajouter (identifiant FNE, horodatage de certification, statut) [DÉDUITE].

---

# 9. SPÉCIFICATIONS — DOSSIER D'ASSURANCE

## 9.1 Référentiel des assurances
- **ASS-001** [OBSERVÉE] Les organismes (CNAM, NSIA, ASKIA) et leurs gestionnaires existent en constante de démonstration (`managers`), et dans `coverage.insurer`.
- **ASS-002** [PROPOSÉE] Référentiel à créer : organismes, contrats/conventions, catégories de couverture, tarifs conventionnés (le champ `contractedPrice` existe au catalogue), taux par contrat, plafonds, exclusions (les champs existent au niveau couverture), dates de validité.
- **ASS-003** [DÉDUITE] Le prototype stocke la couverture **par dossier** (copie) ; en production, la couverture doit être référencée depuis le contrat en vigueur, avec valeurs figées au moment de la venue (traçabilité).

## 9.2 Identification du patient assuré
- **ASS-010** [OBSERVÉE] Données patient : `insurance`, `insuranceNumber`, `coverageRate` ; dossier : numéro d'adhérent, bénéficiaire/assuré principal (`beneficiary`), validité, droits vérifiés + source.
- **ASS-011** [PROPOSÉE] Bénéficiaires et ayants droit : le champ `beneficiary` existe mais la gestion d'un référentiel d'ayants droit (lien de parenté, parts différentes) n'existe pas — à valider.
- **ASS-012** [PROPOSÉE] Contrôle des droits automatique (intégration organisme/CMU) : `rightsSource` prévoit « intégration » ; aucune intégration n'existe — à traiter comme évolution.

## 9.3 Dossier de prise en charge
- **ASS-020** [OBSERVÉE] Création d'un dossier (`DA-2026-XXXXX`) lié à un document de facturation (`docId`, `prefactureRef`) et à une venue (`episodeNumber`).
- **ASS-021** [OBSERVÉE] Couverture : 19 champs dont bon de prise en charge, validité du bon, accord préalable (référence, date, document, services autorisés), montant autorisé, plafond annuel, ticket modérateur, exclusions.
- **ASS-022** [OBSERVÉE] Contrôles automatiques (`buildControls`) : validité du bon ; montant ≤ autorisé ; tarifs conventionnés ; cohérence net = patient + assurance ; doublons ; exclusions — avec niveaux `ok | warning | blocking | n/a`.
- **ASS-023** [OBSERVÉE] Factures associées : le dossier pointe vers le document source ; le suivi des montants (réclamé, transmis, accepté, rejeté, payé) vit dans `InsuranceTracking` du document.
- **ASS-024** [OBSERVÉE — écart] Deux mécanismes de liaison dossier↔document coexistent (`docId` direct ou `sourceRef` via `findDossierByDocId`) — à unifier.
- **ASS-025** [PROPOSÉE] Champ « référence du bon de prise en charge » et « autorisation préalable » : présents ; formaliser leur vérification bloquante quand le niveau est `blocking`.

## 9.4 Gestion documentaire
- **ASS-030** [OBSERVÉE] Pièces requises : cycle `a-fournir → jointe-a-verifier → conforme | rejetee`, plus `non-applicable` ; distinction pièces « avant émission » / « finales » ; complétude exigée pour valider la conformité du dossier.
- **ASS-031** [OBSERVÉE — écart] Aucun upload réel (« Aucun fichier n'est réellement téléversé ») ; en production : stockage des fichiers, aperçu, métadonnées, historique documentaire.
- **ASS-032** [PROPOSÉE] Consultation des pièces (visionneuse) et dossier « prêt à transmettre » avec vérification finale — la structure existe (étape 6/7).

## 9.5 Statuts du dossier
- **ASS-040** [OBSERVÉE] Statuts existants : `en-cours, bloque, pret-transmission, transmis, a-corriger` (+ transmission `pret | en-cours | transmis | echec | correction-demandee`).
- **ASS-041** [PROPOSÉE] Statuts cibles à valider : En préparation (`en-cours`), Incomplet (`bloque` + motif), Complet, Validé (`pret-transmission`), Transmis (`transmis`), En attente de retour, Rejeté (renvoi `a-corriger`), Clôturé (après règlement — statut absent aujourd'hui).
- **ASS-042** [OBSERVÉE] Transitions codées : `bloque → pret-transmission` (pièces avant-émission conformes) ; `pret-transmission → transmis` ; renvoi en correction ; échec de transmission (`echec`).

---

# 10. SPÉCIFICATIONS — CRÉANCES ET RECOUVREMENT DES ASSURANCES

## 10.1 Constitution des créances
- **REC-001** [OBSERVÉE] Chaque facture assurée validée porte un `InsuranceTracking` : `amountToClaim = part assurance` (créé automatiquement à la validation [OBSERVÉE]).
- **REC-002** [OBSERVÉE] Rattachements disponibles : facture (`docId`), patient (via facture), venue (via facture), organisme (`insurance`), dossier d'assurance (`findDossierByDocId`), période (dates facture).
- **REC-003** [DÉDUITE] La créance est donc **calculée** depuis la facture, pas stockée comme entité indépendante ; en production, une entité « créance » persistée (ou une vue matérialisée) facilitera le rapprochement et les affectations partielles — proposition à valider.

## 10.2 Suivi des créances
- **REC-010** [OBSERVÉE] Liste par gestionnaire et par compagnie (groupes dépliables), détail par facture avec patient, montants : facturés, dû assurance, soumis, accepté, rejeté, payé, solde.
- **REC-011** [OBSERVÉE] Filtrage par période : date d'arrêté (`asOfDate`) avec évolution des états à cette date ; récapitulatif annuel 12 mois avec soldes d'ouverture/clôture.
- **REC-012** [OBSERVÉE] Balance âgée : 5 tranches (non échu, 0–30, 31–60, 61–90, >90 j), échéance = transmission + 30 j.
- **REC-013** [OBSERVÉE] Liste par patient : disponible via le détail (patient affiché par créance) ; une vue dédiée par patient est une exigence proposée [PROPOSÉE].

## 10.3 Soumission des dossiers
- **REC-020** [OBSERVÉE] Bordereaux : entité `Bordereau` avec mode (`portail | courrier | depot-physique | autre`), lignes (`BordereauLine`), total réclamé, nombre de factures, preuve, observations ; statuts `en-preparation | transmis | echec | correction-demandee`.
- **REC-021** [OBSERVÉE] La transmission d'un dossier crée/met à jour le bordereau et ajoute une preuve de dépôt (simulée).
- **REC-022** [OBSERVÉE — écart] Numérotation bordereau par comptage (`BORD-2026-07x`) ; non pérenne.
- **REC-023** [PROPOSÉE] Historique des transmissions par bordereau (dates, agents, montants) : la structure `history` existe ; garantir l'exhaustivité.

## 10.4 Traitement des retours d'assurance
- **REC-030** [OBSERVÉE] Rejets : entité `ClaimRejection` (motif, commentaire, action, responsable, échéance, statut `a-traiter | conteste | retransmis | resolu`, résolution).
- **REC-031** [OBSERVÉE] Acceptation partielle : le `InsuranceTracking` porte `amountAccepted` / `amountRejected` distincts ; le statut `partiellement-acceptee` existe.
- **REC-032** [OBSERVÉE — écart] Un rejet dans le suivi (`insuranceTracking.rejectionReason`) et un rejet dans la liste (`ClaimRejection`) décrivent la même réalité sans lien entre eux — à unifier.
- **REC-033** [PROPOSÉE] Un rejet n'est jamais définitif : la créance rejetée doit rester ouverte (statut de créance distinct du rejet), avec relance/contestation — la règle « rejeté ≠ abandonné » doit être explicite au niveau des soldes (le prototype l'applique déjà aux rejets non résolus [OBSERVÉE]).
- **REC-034** [PROPOSÉE] Nouvelle soumission après correction : le cycle `a-corriger → pret-transmission → transmis` existe côté dossier ; prévoir la même trajectoire côté créance.

## 10.5 Enregistrement des règlements
- **REC-040** [OBSERVÉE] Saisie d'un versement : gestionnaire/assurance, date, mode, banque, référence, montant (validé > 0 et ≤ solde), pièces jointes réelles (drag & drop, PDF/images ≤ 5 Mo), commentaire.
- **REC-041** [OBSERVÉE] Affectation à une ou plusieurs factures (`allocations[]`), mise à jour du `insuranceTracking` (montant payé, statut `reglee`/`en-traitement`, date de règlement).
- **REC-042** [OBSERVÉE] Règlements partiels : pris en charge (allocation partielle, statut de facture reste ouvert).
- **REC-043** [PROPOSÉE] Paiements non identifiés (sans facture) : à prévoir avec un rattachement différé.
- **REC-044** [PROPOSÉE] Prévention des doubles affectations : le contrôle « somme des allocations ≤ montant reçu » doit être serveur et transactionnel ; le prototype le valide dans le modal uniquement.

## 10.6 Rapprochement des créances
- **REC-050** [OBSERVÉE] Tableau de comparaison par facture : dû, soumis, accepté, rejeté, payé, solde (colonnes du détail) ; agrégats par gestionnaire/compagnie.
- **REC-051** [OBSERVÉE] Distinction facturé / reconnu / encaissé : effective (`amountToClaim`, `amountAccepted`, `amountPaid` séparés).
- **REC-052** [PROPOSÉE] Écarts de rapprochement à isoler (ligne « écart » par bordereau : soumis − accepté − payé) : non présent explicitement, à ajouter.

## 10.7 Reporting
- **REC-060** [OBSERVÉE] Situation mensuelle (récapitulatif annuel), balance âgée, bordereaux en attente (statuts transmis/échec/correction), taux de recouvrement (KPI).
- **REC-061** [OBSERVÉE] Exports : CSV réel (détail créances), impression résumé ; **FAC/REC-062** [PROPOSÉE] Export Excel et PDF conformes au besoin de la direction.
- **REC-063** [PROPOSÉE] Indicateurs complémentaires : délais de règlement par organisme, taux de rejet, ancienneté moyenne.

---

# 11. WORKFLOWS TRANSVERSAUX

## 11.1 Parcours nominal (patient assuré)
1. **RDV** créé à l'agenda (`planned`) → confirmation (`confirmed`) [OBSERVÉE].
2. **Arrivée** du patient (`arrived`, horodatée) [OBSERVÉE].
3. **Admission** : épisode `VEN-…` créé, associé au RDV, service/praticien/motif [OBSERVÉE].
4. **Identification du payeur** : couverture du dossier d'assurance (taux, bon, validité) [DÉDUITE — structuration à valider ADM-017].
5. **Cotation / préfacturation** : document avec lignes de prestations, ventilation patient/assurance [OBSERVÉE].
6. **Facturation** : transformation → facture, validation (`valide`), création du suivi assurance [OBSERVÉE].
7. **Encaissement part patient** (caisse : session, encaissement multi-modes, reçu) [OBSERVÉE].
8. **Créance assurance** constituée (réclamé = part assurance) [OBSERVÉE].
9. **Soumission** : dossier complet → bordereau → transmis [OBSERVÉE (simulé)].
10. **Retour** : acceptation (totale/partielle) ou rejet motivé [OBSERVÉE partiel — saisie manuelle].
11. **Règlement** assurance encaissé et affecté [OBSERVÉE].
12. **Rapprochement** et clôture financière [OBSERVÉE partiel].

## 11.2 Variantes
| Variante | Comportement observé / exigence |
|---|---|
| **Patient non assuré** | Part assurance = 0 ; encaissement total part patient ; pas de créance. [OBSERVÉE] |
| **Patient assuré** | Ventilation par ligne, suivi assurance auto-créé à la validation. [OBSERVÉE] |
| **Paiement partiel (patient)** | Statut `partiellement-paye`, reste à payer suivi. [OBSERVÉE] |
| **Admission sans RDV** | Tout-venant à l'agenda puis admission, sans RDV associé. [OBSERVÉE] |
| **Prise en charge refusée / rejetée** | Dossier → `a-corriger` ; créance reste ouverte avec rejet à traiter. [OBSERVÉE partiel] |
| **Facture corrigée** | Annulation motivée ou avoir (avoir décoratif aujourd'hui — à formaliser). [OBSERVÉE + PROPOSÉE] |
| **Dossier d'assurance incomplet** | Statut `bloque` + motif ; blocage de la transmission. [OBSERVÉE] |
| **Règlement partiel de l'assurance** | Allocation partielle, `insuranceTracking` reste ouvert. [OBSERVÉE] |
| **Deux prises en charge combinées** | Non géré aujourd'hui. [PROPOSÉE — à définir] |

## 11.3 Étapes manquantes (exigences proposées, non présentes)
- **TRV-001** Notification automatique à la pharmacie/labo à la transmission (le texte de l'UI le promet, aucune mécanique n'existe).
- **TRV-002** Relances réelles (courrier/email) avec modèles et historique d'envoi.
- **TRV-003** Clôture financière de la venue : critères (factures réglées ou créances apurées) et statut dédié.
- **TRV-004** Réconciliation dossier d'assurance ↔ créance ↔ bordereau (source de vérité unique).

---

# 12. RÈGLES DE GESTION (consolidées)

| ID | Règle | Provenance |
|---|---|---|
| RG-001 | Un patient est identifié par un code IUP unique, généré serveur, jamais réutilisé. | ADM-004/005 [OBSERVÉE/PROPOSÉE] |
| RG-002 | Un RDV ne peut produire qu'un seul épisode actif. | RDV-032 [PROPOSÉE, pattern OBSERVÉ] |
| RG-003 | Un patient ne peut avoir qu'une venue active sans justification explicite. | ADM-012 [OBSERVÉE] |
| RG-004 | Les contrôles de disponibilité agenda (chevauchements, pauses, quotas) sont exécutés côté serveur. | RDV-005/006 |
| RG-005 | Une session de caisse clôturée est immuable ; toute correction passe par contrepassation autorisée. | CAI-030/044 [OBSERVÉE client / PROPOSÉE serveur] |
| RG-006 | Aucune auto-approbation (remboursement, clôture, transfert, contrôle). | CAI-031 [OBSERVÉE] |
| RG-007 | Remboursement ≤ paiement d'origine (toutes sessions confondues). | CAI-031 [OBSERVÉE] |
| RG-008 | Un avoir n'entraîne aucune sortie d'espèces et ajuste les soldes du document. | CAI-034 [OBSERVÉE partiel — soldes à implémenter] |
| RG-009 | La part assurance d'une ligne = net × taux, si et seulement si la ligne est couverte (ou proportionnellement si partielle). | FAC-032 [OBSERVÉE] |
| RG-010 | Le taux de couverture provient du contrat en vigueur à la date de la venue, figé au dossier. | FAC-033 / ASS-003 [PROPOSÉE] |
| RG-011 | La validation d'une facture assurée crée automatiquement son suivi de créance. | FAC-034 / REC-001 [OBSERVÉE] |
| RG-012 | Un dossier d'assurance ne peut être transmis que si ses pièces obligatoires (avant émission) sont conformes. | ASS-030/042 [OBSERVÉE] |
| RG-013 | Échéance d'une créance assurance = date de transmission + 30 jours. | REC-012 [OBSERVÉE — paramétrable ? à valider] |
| RG-014 | Un rejet n'annule pas la créance ; il reste à traiter jusqu'à résolution ou retransmission. | REC-033 [PROPOSÉE, pattern OBSERVÉ] |
| RG-015 | Toute opération financière est horodatée côté serveur et attribuée à un utilisateur authentifié. | SEC/TRV [PROPOSÉE] |
| RG-016 | Les numéros (patient, venue, document, bordereau, session, encaissement) proviennent de séquences serveur par année, sans trou ni doublon. | TRV [PROPOSÉE — comptage OBSERVÉ] |
| RG-017 | Toute annulation exige un motif ; le document annulé reste consultable. | FAC-036 / RDV-013 [OBSERVÉE] |
| RG-018 | Un règlement d'assurance ne peut être affecté au-delà de son montant reçu. | REC-041/044 [OBSERVÉE client / PROPOSÉE serveur] |

---

# 13. MODÈLE CONCEPTUEL DE DONNÉES (proposition — à valider)

> **Ce schéma est une proposition** dérivée des types observés (`Patient`, `Episode`, `Appointment`, `BillingDoc`, `CashSession`, `DossierAssurance`, `InsurancePayment`). Il ne préjuge pas du framework backend. Types MySQL indicatifs.

## 13.1 Entités et relations
```
PATIENT (1) ──< APPOINTMENT
PATIENT (1) ──< EPISODE (venue) >── (0..1) APPOINTMENT
EPISODE (1) ──< BILLING_DOC (cotation | prefacture | facture)
BILLING_DOC (1) ──< BILLING_LINE
BILLING_DOC (1) ──< BILLING_PAYMENT (part patient, via caisse)
BILLING_DOC (0..1) ──(1) INSURANCE_TRACKING
BILLING_DOC (1) ──< (0..1) DOSSIER_ASSURANCE
DOSSIER_ASSURANCE (1) ──< REQUIRED_PIECE
DOSSIER_ASSURANCE (0..1) >── (0..1) BORDEREAU
BORDEREAU (1) ──< BORDEREAU_LINE ──> BILLING_DOC
INSURER (1) ──< CONTRAT ──< (valeurs référencées par DOSSIER_ASSURANCE.coverage)
CASH_REGISTER (1) ──< CASH_SESSION (1) ──< CASH_MOVEMENT
CASH_MOVEMENT ──> BILLING_DOC (encaissement facture)
CASH_MOVEMENT ──< CASH_ADVANCE (affectations)
INSURANCE_PAYMENT (1) ──< PAYMENT_ALLOCATION >── BILLING_DOC
USER (1) ──< (toutes tables : created_by / validated_by)
*_AUDIT / HISTORY (tables d'événements horodatés)
```

## 13.2 Tables principales (champs clés)
- `patients` : id, code (unique, séquence annuelle), identité, contacts, pièce + type, assurance courante.
- `appointments` : id, patient_id, doctor_id, room_id, date/time/duration, type, status (enum), coverage, priority, history (JSON/ table fille).
- `episodes` : id, episode_number (unique), patient_id, appointment_id (unique partiel), type, service, status, administrative_status, care_status, bed_id, dates, created_by.
- `billing_docs` : id, type, number (unique), patient_id, episode_id, insurance refs, status, validated_by/at, cancel_reason, source_ref, champs FNE (id fne, statut certification).
- `billing_lines` : doc_id, origin, status, coverage_status, qty, unit_price, discount, rate_assurance, montants calculés (figés à l'émission).
- `billing_payments` : doc_id, amount, mode, caissier, reçu.
- `insurance_tracking` : doc_id, status, amounts (to_claim, transmitted, accepted, rejected, paid), bordereau_number, dates.
- `dossiers_assurance` : id, number (unique), doc_id, episode_number, status, coverage (colonnes ou table fille), transmission.
- `required_pieces` : dossier_id, type, stage, status, fichier (stockage), vérifications.
- `bordereaux` / `bordereau_lines` : number (unique), insurer, mode, status, dates, preuve.
- `cash_registers` / `cash_sessions` : register_id, agent_id, status, ouvertures/comptages/écarts, approvals, handover, clôture.
- `cash_movements` : session_id, kind, amount, mode, linked doc/advance/cancel_of_id, audit.
- `insurance_payments` / `payment_allocations` : insurer, date, mode, bank, reference, status, attachments.
- `users` / `roles` / `audit_events` : habilitations et journal.

## 13.3 Contraintes notables
- Unicité : `patients.code`, `episodes.episode_number`, `billing_docs.number`, `bordereaux.number`, `cash_sessions` (agent+jour), reçus.
- Immuabilité : déclencheurs refusant toute écriture sur `cash_movements` d'une session `cloturee` (RG-005) et sur factures validées hors mouvements dédiés (RG-015).
- `appointment_id` unique sur `episodes` (RG-002).

---

# 14. INTERFACES ET API À PRÉVOIR

> Interfaces indépendantes du framework. « Front → API » reflète les actions actuellement simulées dans le code.

## 14.1 Authentification et utilisateurs
| API | Front concerné |
|---|---|
| POST /auth/login · POST /auth/logout · GET /auth/me | Login.tsx (sélection de profil actuelle) |
| CRUD /users · /roles | Administration (hors périmètre, à prévoir) |

## 14.2 Agenda
| API | Remplace (front) |
|---|---|
| GET /doctors, GET /doctors/{id}/availability?from&to | lecture grids |
| PUT /doctors/{id}/schedule · POST /doctors/{id}/absences | AvailabilityView (state local) |
| GET /appointments?date&doctor&status&q | liste/grids |
| POST /appointments (avec contrôles serveur RG-004) | NewAppointmentModal |
| PATCH /appointments/{id} (dates, médecin, salle, statut avec automate RDV-021) | DetailPanel, drag & drop |
| POST /appointments/{id}/cancel {motif} | prompt actuel |

## 14.3 Accueil / patients / épisodes
| API | Remplace |
|---|---|
| GET /patients?q=… (multi-critères) · GET /patients/{id} | recherche |
| POST /patients (doublons : GET /patients/duplicates?nom&prenom&naissance) | formulaire (ADM-006) |
| PATCH /patients/{id} (+ historisation ADM-033) | modification fiche |
| POST /episodes (anti-duplication RG-002/003, affectation lit transactionnelle) | AdmitPatientModal |
| POST /episodes/{id}/close · /cancel {motif} | episodes helpers |
| GET /episodes?patient&q | recherche venue (remplace `admissions`) |

## 14.4 Facturation
| API | Remplace |
|---|---|
| CRUD /catalogue (persister le catalogue local) | CatalogueModal |
| CRUD /billing-templates | modèles (state local) |
| GET /billing-docs?filtres · GET /billing-docs/{id} | liste/détail |
| POST /billing-docs (type, modèle, patient, épisode) | NewBillingDocModal |
| PATCH /billing-docs/{id}/lines (éd. lignes) | LineEditModal |
| POST /billing-docs/{id}/transform {vers} | transformation |
| POST /billing-docs/{id}/validate | validation (validateur = utilisateur) |
| POST /billing-docs/{id}/cancel {motif} | annulation |
| POST /billing-docs/{id}/credit-note | avoir réel (FAC-036) |
| POST /billing-docs/{id}/fne-emit (adaptateur, FAC-052) | à créer |
| GET /billing-docs/{id}/print (PDF) | InvoicePrint |

## 14.5 Caisse
| API | Remplace |
|---|---|
| CRUD /cash-registers · GET /cash-settings · PUT /cash-settings | postes, seuils |
| GET /cash-sessions?agent&status · GET /cash-sessions/{id} | sessions |
| POST /cash-sessions/open {fond, coupures} (règles CAI-003) | OpenForm |
| POST /cash-sessions/{id}/prepare-closure · /resume · /submit · /validate · /request-correction | cycle clôture |
| POST /cash-sessions/{id}/force-closure | clôture exceptionnelle |
| POST /cash-movements {encaissement|remboursement|avance|fonds|transfert} (règles RG-005..008, auto-approbation) | PaymentModal etc. |
| POST /cash-movements/{id}/cancel {motif} | contrepassation |
| GET /cash-sessions/{id}/journal (PDF/CSV) | journal |

## 14.6 Assurance / créances
| API | Remplace |
|---|---|
| CRUD /insurers · /contrats (ASS-002) | à créer |
| GET /insurance-dossiers · POST · PATCH (statuts ASS-041) | InsuranceDossiers |
| POST /insurance-dossiers/{id}/pieces (upload réel) · /validate-piece · /reject-piece | AttachPieceModal |
| POST /insurance-dossiers/{id}/transmit {bordereau} | TransmitModal |
| GET /receivables?asOf&group | vue d'ensemble/détail |
| POST /insurance-payments (avec allocations, contrôle serveur REC-044) | SettlementModal |
| POST /claim-rejections · PATCH (statuts) | RejectionsTab |
| GET /receivables/export (CSV/Excel/PDF) | exports |

---

# 15. EXIGENCES DE SÉCURITÉ ET TRAÇABILITÉ

## 15.1 Habilitations (matrice proposée [PROPOSÉE] — à valider)
| Opération | Secrét. | Accueil | Caissier | Resp. caisse | Factur. | Assurance | Recouvr. | Direction |
|---|---|---|---|---|---|---|---|---|
| Créer/modifier RDV | ✓ | lecture | — | — | — | — | — | — |
| Créer patient | ✓ | ✓ | — | — | — | — | — | — |
| Admettre (épisode) | — | ✓ | — | — | — | — | — | — |
| Ouvrir/encaisser caisse | — | — | ✓ | — | — | — | — | — |
| Approuver remboursement/clôture | — | — | — | ✓ | — | — | — | — |
| Clôture exceptionnelle | — | — | — | ✓ | — | — | — | — |
| Créer/valider facture | — | — | — | — | ✓ | — | — | — |
| Avoir / annulation facture | — | — | — | — | ✓* | — | — | — |
| Gérer dossier assurance | — | — | — | — | — | ✓ | — | — |
| Enregistrer règlement assurance | — | — | — | — | — | — | ✓ | — |
| Consultation reporting | — | — | — | — | — | — | — | ✓ |

\* double visa recommandé.

- **SEC-010** [OBSERVÉE → serveur] Les règles d'auto-approbation et de seuils (remboursement 25 000, écart 5 000, retrait 300 000) doivent être contrôlées par l'API, pas seulement par l'UI.
- **SEC-011** [PROPOSÉE] Authentification par comptes nominatifs, mots de passe robustes, expiration de session ; les profils « démo » du Login ne doivent pas rester en production.
- **SEC-012** [PROPOSÉE] Journal d'audit append-only : créations, validations, annulations, contrepassations, transmissions, règlements — avec ancien/nouveau (JSON).
- **SEC-013** [PROPOSÉE] Confidentialité : données de santé chiffrées en transit et au repos ; accès aux dossiers tracés ; rétention et purge définies avec HOMEA (réglementation ivoirienne — à vérifier).
- **SEC-014** [PROPOSÉE] Sauvegardes : quotidienne + WAL/binlog, test de restauration périodique ; plan de continuité pour la caisse (mode dégradé documenté).
- **SEC-015** [OBSERVÉE — écart] Les reçus/badges « validation simulée » doivent être remplacés par un dispositif d'horodatage et d'intégrité (séquence + chaîne d'audit) — une signature électronique certifiée est une évolution à valider.

## 15.2 Cohérence inter-modules
- **TRV-010** [DÉDUITE] La création d'épisode, l'affectation de lit, l'ouverture de facture et l'encaissement doivent être transactionnelles côté serveur (aucun état orphelin).
- **TRV-011** [DÉDUITE] La transmission d'un bordereau doit mettre à jour : dossier (transmis), facture (insuranceTracking → transmise) — aujourd'hui désynchronisé (3 échelles de statut, cf. 3.3.4).

---

# 16. EXIGENCES NON FONCTIONNELLES

- **NFR-001** [PROPOSÉE] Performance : recherche patient < 2 s ; grille agenda < 2 s ; encaissement < 1 s.
- **NFR-002** [PROPOSÉE] Disponibilité : cible à définir (établissement en journée) ; la caisse et l'admission sont critiques.
- **NFR-003** [PROPOSÉE] Concurrence : verrouillage optimiste sur sessions de caisse et documents financiers.
- **NFR-004** [OBSERVÉE → à supplanter] Supprimer la dépendance à `localStorage` comme store unique (caisse) ; migration des données de démo non requise en production.
- **NFR-005** [PROPOSÉE] Compatibilité navigateurs récents ; l'application est utilisée sur postes fixes.
- **NFR-006** [PROPOSÉE] Horodatage : toutes les dates système proviennent du serveur (fuseau GMT — Côte d'Ivoire).
- **NFR-007** [PROPOSÉE] Langue : interfaces en français ; montants en FCFA ; format de dates cohérent.

---

# 17. MATRICE DE TRAÇABILITÉ (synthèse)

| Exigence (famille) | Source code (route/écran) | Types | Données fictives | API à créer | Persistance MySQL |
|---|---|---|---|---|---|
| RDV-001..023 | AppointmentScheduling.tsx | Appointment, Doctor, Room, QueueEntry (inutilisé) | appointments (30), doctors (5), rooms (3) | 14.2 | patients, appointments, doctor_schedule, absences |
| ADM-001..042 | Reception.tsx, AdmitPatientModal.tsx, PatientAdministrative.tsx | Patient, Admission (legacy), Episode | patients (21), admissions (6), episodes (4) | 14.3 | patients, episodes, episode_events |
| CAI-001..046 | MyCashRegister.tsx, CashSupervision.tsx, CashJournalPrint.tsx | CashSession, CashMovement, CashAdvance, CashSettings… (dans cashRegisters.ts) | buildDemoState (3 postes, 1 session, 4 mouvements) | 14.5 | cash_registers, cash_sessions, cash_movements, cash_advances, audit |
| FAC-001..053 | Billing.tsx, NewBillingDocModal, BillingTemplates, InvoicePrint | BillingDoc, BillingLine, CatalogueItem, InsuranceTracking (legacy Invoice inutilisé) | demoDocs (8), catalogue (22), templates (7), scenarioPrefacture | 14.4 | catalogue, billing_templates, billing_docs, billing_lines, billing_payments, insurance_tracking |
| ASS-001..042 | InsuranceDossiers.tsx | DossierAssurance, RequiredPiece, Bordereau, AutoControl | demoDossiers (3), demoBordereaux (2) | 14.6 | insurers, contrats, dossiers_assurance, required_pieces, bordereaux |
| REC-001..063 | InsuranceReceivables.tsx (Reporting.tsx hors sujet) | InsurancePayment, ClaimRejection, Reminder | initialPayments (1), rejections (1) | 14.6 | insurance_payments, payment_allocations, claim_rejections, reminders |
| SEC/TRV | App.tsx (navigation, Login) | LoginSession, Profile | profiles | 14.1 | users, roles, audit_events |

---

# 18. CRITÈRES D'ACCEPTATION ET RECETTE

## 18.1 Critères par module (extraits opérationnels)
- **RDV** : création d'un RDV refusée par le serveur en cas de chevauchement ; transitions interdites hors automate ; historique complet ; tout-venant admis sans RDV.
- **ADM** : un patient créé existe après déconnexion/reconnexion ; homonymes bloquants ; double venue justifiée ; code IUP séquentiel unique ; lit marqué occupé.
- **CAI** : deux sessions simultanées impossibles pour un agent ; remboursement > 25 000 exigant un approbateur ≠ créateur ; session clôturée insensible à toute écriture directe (test SQL) ; journal et duplicata tracés ; consolidation exacte par mode.
- **FAC** : facture payée au-delà de la part patient impossible (rejet) ; avoir ajuste les soldes ; transformation tracée ; ventilation patient/assurance exacte (somme de contrôle RG-011 `net = patient + assurance`) ; FNE émis et stocké pour chaque facture (lors de la mise en service).
- **ASS** : transmission bloquée si pièce manquante ; bordereau alimenté ; retours tracés ; statuts conformes à ASS-041.
- **REC** : règlement ≤ solde ; allocations ≤ montant reçu (contrôle serveur) ; balance âgée exacte ; créance rejetée reste ouverte ; exports CSV/Excel/PDF corrects.

## 18.2 Recette de bout en bout (scénario de référence)
1. Créer un patient assuré (contrôle homonymes) → 2. RDV confirmé → 3. Arrivée → 4. Admission hospitalisation (lit) → 5. Préfacture maternité (scénario PP) → 6. Transformation en facture → 7. Validation → 8. Encaissement part patient en caisse (espèces + Mobile Money) → 9. Vérifier le suivi assurance auto-créé → 10. Transmettre via bordereau → 11. Saisir un retour partiellement accepté → 12. Enregistrer le règlement reçu → 13. Vérifier solde à zéro et clôture de la venue.

---

# 19. FONCTIONNALITÉS MANQUANTES (à développer, non inventées comme existantes)

1. **Persistance MySQL** de toutes les données (patients, RDV, épisodes, documents, caisse, assurance, créances).
2. **Backend/API** complet (section 14) avec règles métier serveur (RG-001..018).
3. **Authentification et habilitations** réelles (SEC-001..003, 010, 011).
4. **FNE** : intégration réelle (FAC-051..053).
5. **GED** : upload et stockage des pièces (ASS-031, REC-040 partiellement réel).
6. **Avoirs** financiers réels (FAC-036).
7. **Échéanciers** de paiement patient (CAI-015) — à valider.
8. **Relances réelles** et modèles de courriers (TRV-002).
9. **Réconciliation** des trois échelles de statut assurance (TRV-011).
10. **Retrait du modèle legacy** `Admission`/`Invoice` (ADM-022, 3.3).
11. **Notifications** inter-modules (TRV-001).
12. **Clôture financière de venue** (TRV-003).
13. **Reporting** créances connecté aux données réelles (REC-062, 3.3.8).
14. **Corrections d'anomalies** : création patient factice (ADM-006), garde avance (CAI-012), ventilation clôture (CAI-036), approbation sortie exceptionnelle (CAI-033), synchronisation des overrides agenda (RDV-003).

---

# 20. QUESTIONS OUVERTES ET DÉCISIONS À VALIDER AVEC HOMEA

1. **Rôles** : la liste et la matrice d'habilitations (section 15.1) correspondent-elles à l'organisation réelle ? Qui détient le double visa des annulations/avoirs ?
2. **Numérotation** : formats cibles (IUP `HOMEA-…`, `VEN-…`, `FAC/PREF/COT-…`, `DA-…`, `BORD-…`, `SESS/ENC/BON-…`) et règle annuelle de réinitialisation ?
3. **Échéance créance** : 30 jours [OBSERVÉE] est-il une règle générale ou par contrat ?
4. **Taux de couverture** : arbitraire à 80 [OBSERVÉE] — quelle source de vérité (contrat, CMU, employeur) ? Gestion des multi-prises en charge (ADM-017) ?
5. **FNE** : quel fournisseur/interconnexion retenu ? Calendrier de conformité ? Traitement des factures émises avant certification ?
6. **Taxes** : TVA applicabilité sur les prestations (à vérifier réglementairement — FAC-006).
7. **Modes de paiement** : plafonds, rapprochement bancaire/Mobile Money automatique ?
8. **Jours non travaillés** et fermetures établissement (RDV-007) : règles ?
9. **Mineurs / représentants légaux** (ADM-008) : données exigées ?
10. **Avances patient** : règles de remboursement au patient (CAI-012) ?
11. **Clôture de venue** (TRV-003) : critères de clôture ?
12. **Confidentialité** : exigences légales ivoiriennes applicables (SEC-013) et rétention ?
13. **Anomalie de données** `p021/HOMEA-2026-0142` : à corriger dans les données de démo ou ignorer (données fictives) ?

---

# 21. PRIORISATION ET LOTS DE DÉVELOPPEMENT

> Priorisation proposée [PROPOSÉE] — à ajuster avec HOMEA et le développeur.

## Lot 0 — Fondations (prérequis)
- Authentification + utilisateurs + rôles ; journal d'audit ; séquences de numérotation ; socle API ; modèle MySQL (section 13).

## Lot 1 — Parcours patient administratif
- Patients (recherche, création réelle, doublons, fiche + historique) ; épisodes/venues ; admission (lit transactionnel) ; retrait du legacy `Admission` ; intégration agenda → arrivée → admission.

## Lot 2 — Facturation
- Catalogue persisté ; cotation/préfacture/facture ; transformations ; validation ; ventilation patient/assurance ; impression ; modèles persistés ; avoirs réels.

## Lot 3 — Caisse
- Postes, sessions (cycle complet immuable), encaissements multi-modes, avances, remboursements, contrepassations, contrôle contradictoire, consolidation, exports.

## Lot 4 — Assurance et créances
- Référentiel assureurs/contrats ; dossiers de prise en charge ; pièces (GED) ; bordereaux ; rejets ; règlements ; rapprochement ; reporting créances connecté.

## Lot 5 — Conformité et finitions
- FNE ; relances réelles ; notifications inter-modules ; clôture de venue ; corrections des anomalies listées en 19.14 ; performance et recette de bout en bout (18.2).

**Dépendances clés** : Lot 1 ≤ Lot 0 ; Lot 2 ≤ Lot 1 ; Lot 3 ≤ Lot 2 (encaissement de factures) ; Lot 4 ≤ Lot 2 (créances issues des factures) ; Lot 5 ≤ Lots 1–4.

---

*Fin du PRD — Processus 1. Toute modification applicative est hors du cadre de ce document : aucune route, aucun composant, aucune donnée fictive n'a été altéré pour produire ce PRD.*
