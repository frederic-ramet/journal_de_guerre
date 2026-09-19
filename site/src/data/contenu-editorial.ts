// Textes fournis tels quels (spec-site.md §6, puis message du 19/09/2026
// pour la chronologie d'Ernest). Rien n'est reformulé ni résumé ici : ce
// fichier est la source unique pour l'accueil et /ernest, qui partagent la
// même accroche et les mêmes trois phrases de mise en situation.

export const ACCROCHE =
  '« Chaque soir, il notait une bonne action faite et une mauvaise action évitée. »';

export const MISE_EN_SITUATION =
  "En juin 1918, Ernest Ramet est prisonnier en Westphalie et partage ses biscuits avec des " +
  "Russes affamés. À 800 kilomètres de là, Étaples, sa ville, est devenue la plus grande base " +
  "britannique de la guerre, et ses hôpitaux viennent d'être bombardés. Vingt-deux ans plus " +
  'tard, il quittera la plage de Dunkerque à la rame.';

export interface ChronologieEntree {
  quand: string;
  titre: string;
  texte: string;
  /** Identifiants de page (transcription/pages/<id>.md) cités comme source, dans l'ordre d'affichage. */
  sourceIds: string[];
  /** Texte de la source à afficher quand il ne s'agit pas simplement du numéro de page (ex. "pages 19 à 40"). */
  sourceLabel?: string;
}

export const CHRONOLOGIE: ChronologieEntree[] = [
  {
    quand: '14 juin 1918',
    titre: 'Le cahier commence',
    texte:
      'Prisonnier en Westphalie, il ouvre un « carnet d\'aspirations » et suit les ' +
      'leçons de son camarade Georges Lété.',
    sourceIds: ['IMG_0410_b'],
  },
  {
    quand: 'été 1918',
    titre: 'Deux biscuits, un peu de tapioca',
    texte:
      'Presque chaque jour, il donne une part de sa ration aux prisonniers russes du ' +
      'camp, et le note.',
    sourceIds: ['IMG_0419_a'],
    sourceLabel: 'pages 19 à 40',
  },
  {
    quand: '15 octobre 1918',
    titre: 'Une autre main le corrige',
    texte:
      '« C\'est assez bien. Faites un peu attention aux fautes. Vous faites des ' +
      'progrès. »',
    sourceIds: ['IMG_0470_b'],
  },
  {
    quand: 'janvier 1919',
    titre: 'Le retour',
    texte:
      '« J\'ai négligé un peu mes devoirs d\'écrire sur mon cahier, c\'était par ' +
      'l\'émotion du retour de ma captivité. »',
    sourceIds: ['IMG_0483_a'],
  },
  {
    quand: 'années 1920',
    titre: 'La mer, une femme, deux enfants',
    texte: '« Je copierai une petite phrase chaque fois que je serai à terre. »',
    sourceIds: ['IMG_0489_a', 'IMG_0491_a'],
    sourceLabel: 'pages 159 et 163',
  },
  {
    quand: '4 juin 1940',
    titre: 'Dunkerque, à la rame',
    texte:
      'Il quitte la plage vers deux heures du matin dans un canot à rames, avec des ' +
      'marins d\'Étaples.',
    sourceIds: ['IMG_0508'],
    sourceLabel: 'Documents',
  },
];

export const CE_QUON_NE_SAIT_PAS_ENCORE =
  'Le nom du lieu de captivité est illisible sur la page de titre : le carnet dit ' +
  'seulement Westphalie. Münster est probable, mais non prouvé.';
