import type { Section } from './directus.ts';

export const SECTIONS: Record<Section, { slug: Section; label: string; description: string }> = {
  archives: {
    slug: 'archives',
    label: 'Archives',
    description:
      "Œuvres anciennes, oubliées et redécouvertes de la culture savoyarde, classées par période historique.",
  },
  contemporain: {
    slug: 'contemporain',
    label: 'Créations contemporaines',
    description:
      'Créations actuelles en langue et culture savoyarde (arpitane), classées par discipline.',
  },
};
