// Point unique à modifier quand une route du menu principal devient
// disponible : passer sa valeur à `true` active son lien partout (nav du
// header, pied de page). Tant qu'elle reste à `false`, le lien correspondant
// est affiché grisé (texte visible, non cliquable) plutôt que retiré.
export const ROUTES_DISPONIBLES = {
  lire: true,
  ernest: true,
  documents: true,
  explorer: false,
  contexte: true,
} as const;

export type RouteKey = keyof typeof ROUTES_DISPONIBLES;
