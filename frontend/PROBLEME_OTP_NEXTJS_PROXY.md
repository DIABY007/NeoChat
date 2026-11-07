# Problème OTP Next.js Proxy

## Description du problème

En production, lors de l'inscription ou de la connexion, l'appel API pour demander un OTP échoue avec une erreur 404. L'URL appelée est :

```
POST https://neochat.pro/api/backend/api/backend/auth/request-otp 404 (Not Found)
```

## Analyse

- Le frontend utilise Axios avec un `baseURL` configuré sur `/api/backend`.
- Les appels API dans le code utilisent `/api/backend/auth/request-otp` comme chemin.
- Résultat : Axios concatène les deux, ce qui donne `/api/backend/api/backend/auth/request-otp`.
- Le proxy Next.js ajoute encore `/backend/` devant, ce qui donne `/backend/api/backend/auth/request-otp` côté backend, qui n'existe pas.

## Solution

- Dans le frontend, il faut utiliser uniquement le chemin relatif à partir de la racine backend, donc :
  - `/auth/request-otp`
  - `/auth/verify-otp`
- Ne pas préfixer avec `/api/backend/` dans les appels, car Axios le fait déjà via `baseURL`.

## Correctif appliqué

- Tous les appels OTP dans le frontend utilisent maintenant `/auth/request-otp` et `/auth/verify-otp`.
- Plus de double `/api/backend/` dans les URLs.

## À tester

- Vérifier l'inscription et la connexion en production.
- Si le problème persiste, vérifier la configuration du proxy Next.js et la présence des routes côté backend.
