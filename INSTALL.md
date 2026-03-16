# BijouxShop — Guide d'installation Windows 10 (Auth JWT)

## Prérequis

- Node.js >= 20 LTS : https://nodejs.org  
  Vérifier : `node -v` et `npm -v`
- Git (optionnel) : https://git-scm.com

> ✅ **Pas de Redis requis** — cette version utilise JWT stateless.  
> Le panier est stocké en SQLite, les tokens en cookies httpOnly.

---

## Étape 1 — Placer le projet

```cmd
cd C:\
mkdir projects
cd projects
:: Copier le dossier bijoux-shop-jwt ici
```

---

## Étape 2 — Configurer le Backend

```cmd
cd C:\projects\bijoux-shop-jwt\backend
npm install
copy .env.example .env
```

### Générer les secrets JWT

Ouvrir cmd.exe et exécuter **deux fois** pour obtenir deux secrets distincts :

```cmd
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copier chaque résultat dans `.env` :

```env
JWT_ACCESS_SECRET=<premier résultat ici>
JWT_REFRESH_SECRET=<second résultat ici>
```

### Configurer Gmail

1. Activer la validation en 2 étapes sur ton compte Google
2. Aller sur : https://myaccount.google.com/apppasswords
3. Créer un mot de passe d'application → "Mail" → "Windows"
4. Copier le mot de passe généré (16 caractères) dans `.env` :

```env
GMAIL_USER=ton.email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## Étape 3 — Initialiser la base de données

```cmd
cd C:\projects\bijoux-shop-jwt\backend
npm run db:init
npm run db:seed
```

Résultat attendu :
```
✅ Base de données initialisée : ./data/bijoux.db
✅ Seed terminé :
   - 2 utilisateurs (admin@bijoux.fr / client@test.fr)
   - 4 catégories
   - 8 produits
```

---

## Étape 4 — Démarrer le Backend

```cmd
cd C:\projects\bijoux-shop-jwt\backend
npm run dev
```

Résultat attendu :
```
✅ BijouxShop Backend démarré
   → http://localhost:3001
   → Env: development
   → Auth: JWT (stateless, httpOnly cookies)
```

---

## Étape 5 — Démarrer le Frontend

Ouvrir un **second** cmd.exe :

```cmd
cd C:\projects\bijoux-shop-jwt\frontend
npm install
npm run dev
```

Frontend disponible sur : **http://localhost:5173**

---

## Comptes de test

| Rôle   | Email               | Mot de passe |
|--------|---------------------|--------------|
| Admin  | admin@bijoux.fr     | admin123     |
| Client | client@test.fr      | client123    |

---

## Fonctionnement des tokens JWT

| Token         | Durée  | Stockage              | Renouvellement              |
|---------------|--------|-----------------------|-----------------------------|
| access_token  | 15 min | Cookie httpOnly       | Auto via refresh interceptor |
| refresh_token | 7 jours| Cookie httpOnly       | Rotation à chaque refresh   |

- Les tokens **ne sont jamais accessibles en JavaScript** (httpOnly).
- Le frontend renouvelle automatiquement le token expiré sans déconnecter l'utilisateur.
- À la déconnexion, le serveur efface les deux cookies.

---

## Structure des fichiers

```
bijoux-shop-jwt/
├── INSTALL.md
├── backend/
│   ├── .env.example          ← Copier en .env et remplir
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts         ← Point d'entrée
│       ├── app.ts            ← Bootstrap Express + middlewares
│       ├── config/env.ts     ← Validation Zod des variables d'env
│       ├── modules/
│       │   ├── auth/         ← Register, login, logout, refresh, /me
│       │   ├── catalog/      ← Produits, catégories, filtres
│       │   ├── cart/         ← Panier persisté en SQLite
│       │   ├── orders/       ← Checkout, historique commandes
│       │   └── mailer/       ← Email confirmation Gmail
│       └── shared/
│           ├── db/           ← Init SQLite + seed
│           ├── tokens/       ← Sign/verify JWT (jose)
│           ├── middleware/   ← requireAuth, requireAdmin
│           └── errors/       ← AppError, asyncHandler
└── frontend/
    ├── index.html
    ├── vite.config.ts        ← Proxy /api → localhost:3001
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx           ← Router + init auth
        ├── utils/api.ts      ← Axios + intercepteur refresh auto
        ├── store/
        │   ├── auth.store.ts ← Zustand auth
        │   └── cart.store.ts ← Zustand panier
        ├── pages/            ← Home, Catalog, Product, Cart,
        │                        Checkout, Orders, Login, Register
        └── components/
            ├── layout/Navbar.tsx
            └── catalog/ProductCard.tsx
```
