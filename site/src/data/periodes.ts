// Bornes des périodes du carnet, par identifiant de page. À affiner après la
// relecture complète — ce fichier est le seul endroit où ces bornes doivent
// être corrigées.

export interface PeriodeDef {
  slug: string;
  titre: string;
  /** Borne basse incluse, comparaison lexicographique sur l'id (ex. "IMG_0410"). */
  debut: string;
  /** Borne haute incluse, comparaison lexicographique sur l'id (ex. "IMG_0421"). */
  fin: string;
}

export const PERIODES: PeriodeDef[] = [
  { slug: 'enseignements', titre: 'Les enseignements', debut: 'IMG_0410', fin: 'IMG_0421' },
  { slug: 'journal-de-camp', titre: 'Le journal du camp', debut: 'IMG_0422', fin: 'IMG_0451' },
  { slug: 'lecons-evangile', titre: "Les leçons et l'Évangile", debut: 'IMG_0452', fin: 'IMG_0482' },
  { slug: 'apres-captivite', titre: 'Après la captivité', debut: 'IMG_0483', fin: 'IMG_0503' },
  { slug: 'annexes', titre: 'Documents annexes', debut: 'IMG_0504', fin: 'IMG_0512' },
];

/** Identifiant de la page par laquelle l'accueil fait entrer le visiteur dans le carnet. */
export const PAGE_ENTREE_ID = 'IMG_0422_a';

/**
 * Retourne le slug de période pour un identifiant de page donné, en comparant
 * uniquement le préfixe "IMG_XXXX" (les suffixes _a/_b n'affectent pas la
 * borne : IMG_0421_b appartient à la même période que IMG_0421_a).
 */
export function periodeForId(id: string): PeriodeDef {
  const prefix = id.slice(0, 'IMG_0000'.length);
  const found = PERIODES.find((p) => prefix >= p.debut && prefix <= p.fin);
  // En dehors des bornes connues (ne devrait pas arriver) : dernière période.
  return found ?? PERIODES[PERIODES.length - 1];
}
