// Liste manuelle des documents annexes exposés dans /documents. Un document
// de plus qu'IMG_0508 existe déjà dans transcription/pages/ (IMG_0490_a,
// lettre de 1935) mais n'est pas encore décrit ici : ne pas l'ajouter sans
// validation explicite, cf. "il n'y a qu'un document pour l'instant".

export interface DocumentDef {
  slug: string;
  titre: string;
  /** Identifiant de la page transcription/pages/<id>.md qui porte ce document. */
  pageId: string;
  noteContexte: string;
}

export const DOCUMENTS: DocumentDef[] = [
  {
    slug: 'declaration-1940',
    titre: 'Déclaration de Ramet Ernest, 1940',
    pageId: 'IMG_0508',
    noteContexte:
      "Ce document n'appartient pas au carnet : il y était simplement glissé. Il " +
      'date de juin 1940, vingt-deux ans après les pages qui précèdent.',
  },
];
