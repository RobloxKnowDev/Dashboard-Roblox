# Mise en ligne (Vercel)

Le site est hébergé sur **Vercel** (plan gratuit Hobby), relié au dépôt GitHub : chaque push sur `main` redéploie automatiquement.

> Le plan Hobby est, selon les conditions de Vercel, réservé à un usage personnel et non commercial. Un outil interne de studio est une zone grise ; le plan Pro coûte environ 20 $/mois si Vercel le demande.

## 1. Avant la première mise en ligne : régénérer les clés

Les clés actuelles sont passées dans une conversation : on les remplace avant de publier.

1. **Supabase** → *Project Settings → API Keys → Secret keys* : créer une nouvelle clé secrète, puis supprimer l'ancienne.
2. **Roblox** → Creator Hub → *API Keys* → la clé du dashboard → *Regenerate Key* (en profiter pour ajouter Glider Obby et Home Creator avec `universe.analytics:read`).
3. Mettre les nouvelles valeurs dans `.env.local` (jamais dans `.env.example`).

## 2. Créer le projet Vercel

1. Sur **vercel.com**, se connecter avec **Continue with GitHub**.
2. **Add New… → Project** → importer `Dashboard-Roblox` (Next.js est détecté automatiquement, ne rien changer au build).
3. Dans **Environment Variables**, ajouter :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rxaniihtmdvkkwvcusuw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la clé « publishable » (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | la **nouvelle** clé secrète (`sb_secret_…`) |
| `ROBLOX_OPEN_CLOUD_API_KEY` | la **nouvelle** clé Roblox |
| `ROBLOX_OPEN_CLOUD_API_KEY_2` | la 2ᵉ clé Roblox, si vos jeux sont répartis dans plusieurs groupes (jusqu'à `_5`) |
| `CRON_SECRET` | longue valeur aléatoire (générée dans `.env.local`) — protège la tâche quotidienne, type **Secret** |
| `NEXT_PUBLIC_SITE_URL` | l'adresse du site, ex. `https://dashboard-roblox.vercel.app` (puis le domaine personnalisé) |

`SUPABASE_DB_URL` n'est **pas** nécessaire sur Vercel (elle ne sert qu'aux migrations, en local).

4. **Deploy**. La région des fonctions est fixée à Dublin (`dub1`) par `vercel.json`, à côté de la base Supabase (Irlande).

## 3. Autoriser l'adresse du site dans Supabase

*Authentication → URL Configuration* :
- **Site URL** : l'adresse de production (`https://…`).
- **Redirect URLs** : ajouter `https://<adresse-de-production>/**` (garder `http://localhost:3000/**` pour le développement).

Sans cela, les liens de réinitialisation de mot de passe renverraient vers `localhost`.

## 4. Brancher le nom de domaine

Vercel → projet → *Settings → Domains* → ajouter le domaine. Vercel indique les enregistrements DNS exacts à créer chez le fournisseur du domaine (en général un enregistrement `A` pour le domaine nu, un `CNAME` pour un sous-domaine comme `dashboard.mondomaine.com`). Le certificat HTTPS est automatique.

Ensuite : mettre à jour `NEXT_PUBLIC_SITE_URL` sur Vercel et les URL dans Supabase (étape 3), puis redéployer.

## 5. E-mails (recommandé)

Le service d'e-mail intégré à Supabase n'envoie qu'aux membres de l'organisation Supabase, quelques fois par heure. Pour les invitations et les réinitialisations de mot de passe : *Authentication → Emails → SMTP Settings* avec un fournisseur (ex. Resend, offre gratuite).

## 5 bis. Tâche quotidienne (Vercel Cron)

`vercel.json` programme `/api/cron/daily-snapshot` chaque jour à 6 h UTC : photo des classements Roblox, de la watchlist et des stats publiques de vos jeux (historique). Vercel l'appelle avec `Authorization: Bearer <CRON_SECRET>` ; sans `CRON_SECRET` défini sur Vercel, la tâche est refusée (401). Suivi : Vercel → projet → *Settings → Cron Jobs* (bouton *Run* pour la lancer à la main).

## 6. Vérifier

1. Ouvrir le site : on doit arriver sur `/login`.
2. Se connecter avec le compte Owner : Overview, My Games (données Roblox en direct), Projects, Tasks.
3. Une page inexistante affiche la page 404 du site.

## Ensuite

- Chaque push sur `main` redéploie la production ; les autres branches créent des déploiements de prévisualisation.
- Modifier la base : nouvelle migration dans `supabase/migrations/`, puis `npm run db:push` en local, **avant** de pousser le code qui en dépend.
