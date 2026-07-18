/**
 * Genre taxonomy shown in onboarding and Explore.
 *
 * `subject` is the Open Library subject used to query the catalogue, which does
 * not always match the display label (e.g. "Guide / How-to" -> "self-help").
 */

export type Genre = {
  slug: string;
  label: string;
  subject: string;
};

export const GENRES: Genre[] = [
  { slug: 'romance', label: 'Romance', subject: 'romance' },
  { slug: 'fantasy', label: 'Fantasy', subject: 'fantasy' },
  { slug: 'sci-fi', label: 'Sci-Fi', subject: 'science fiction' },
  { slug: 'horror', label: 'Horror', subject: 'horror' },
  { slug: 'mystery', label: 'Mystery', subject: 'mystery' },
  { slug: 'thriller', label: 'Thriller', subject: 'thriller' },
  { slug: 'psychology', label: 'Psychology', subject: 'psychology' },
  { slug: 'inspiration', label: 'Inspiration', subject: 'inspiration' },
  { slug: 'comedy', label: 'Comedy', subject: 'humor' },
  { slug: 'action', label: 'Action', subject: 'adventure stories' },
  { slug: 'adventure', label: 'Adventure', subject: 'adventure' },
  { slug: 'cartoon', label: 'Cartoon', subject: 'comics' },
  { slug: 'childrens', label: "Children's", subject: 'juvenile fiction' },
  { slug: 'art-photography', label: 'Art & Photography', subject: 'art' },
  { slug: 'food-drink', label: 'Food & Drink', subject: 'cooking' },
  { slug: 'biography', label: 'Biography', subject: 'biography' },
  { slug: 'science-technology', label: 'Science & Technology', subject: 'technology' },
  { slug: 'guide-how-to', label: 'Guide / How-to', subject: 'self-help' },
  { slug: 'travel', label: 'Travel', subject: 'travel' },
];

export function genreBySlug(slug: string): Genre | undefined {
  return GENRES.find((g) => g.slug === slug);
}
