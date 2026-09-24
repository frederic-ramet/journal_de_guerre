import { defineMiddleware } from 'astro:middleware';
import { getAuthenticatedUser } from './lib/auth';

// /admin/* renvoie 404 (jamais 403) sans authentification : inutile
// d'annoncer qu'il y a quelque chose derrière à qui n'a pas d'accès.
// Sur les autres routes, l'identité (si présente) est juste exposée aux pages
// pour qu'elles puissent afficher ou non les boutons d'édition (ex. "Corriger
// cette page" sur /lire/:n), sans jamais bloquer l'accès en lecture.
export const onRequest = defineMiddleware(async (context, next) => {
  const user = await getAuthenticatedUser(context.request);

  if (context.url.pathname.startsWith('/admin') && !user) {
    return new Response('Not found', { status: 404 });
  }

  if (user) {
    context.locals.authenticatedUser = user;
  }

  return next();
});
