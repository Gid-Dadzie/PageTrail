/**
 * Affiliate link generation — the B2C half of the proposal's revenue model.
 *
 * The proposal has the backend own link generation so tags can change without
 * shipping an app update. Until that service exists the links are built here
 * from a book's ISBN, with the tags kept in one place for that move.
 *
 * Tags are placeholders: a real deployment registers with each programme and
 * substitutes its own.
 */

import { COIN_COSTS } from './pagecoins';

export type Retailer = {
  id: string;
  name: string;
  /** Rough commission rate, shown for coursework transparency. */
  commissionRate: number;
};

const AFFILIATE_TAGS = {
  amazon: 'pagetrail-20',
  bookshop: 'pagetrail',
} as const;

export const RETAILERS: Retailer[] = [
  { id: 'amazon', name: 'Amazon', commissionRate: 0.045 },
  { id: 'bookshop', name: 'Bookshop.org', commissionRate: 0.1 },
  { id: 'openlibrary', name: 'Open Library (borrow)', commissionRate: 0 },
];

export type PurchaseOption = {
  retailer: Retailer;
  url: string;
};

/**
 * Buy links for a copy.
 *
 * Falls back to a title keyword search when the catalogue has no ISBN, since an
 * ISBN-less deep link would 404.
 */
export function purchaseOptions(book: { isbn: string; title: string }): PurchaseOption[] {
  const hasIsbn = !!book.isbn;
  const term = encodeURIComponent(book.title);

  return RETAILERS.map((retailer) => {
    let url: string;

    switch (retailer.id) {
      case 'amazon':
        url = hasIsbn
          ? `https://www.amazon.com/dp/${book.isbn}?tag=${AFFILIATE_TAGS.amazon}`
          : `https://www.amazon.com/s?k=${term}&tag=${AFFILIATE_TAGS.amazon}`;
        break;
      case 'bookshop':
        url = hasIsbn
          ? `https://bookshop.org/a/${AFFILIATE_TAGS.bookshop}/${book.isbn}`
          : `https://bookshop.org/search?keywords=${term}`;
        break;
      default:
        url = hasIsbn
          ? `https://openlibrary.org/isbn/${book.isbn}`
          : `https://openlibrary.org/search?q=${term}`;
    }

    return { retailer, url };
  });
}

/** Discount applied when a user redeems PageCoins against a purchase. */
export const COIN_DISCOUNT_PERCENT = 15;

export function discountSummary(coins: number) {
  const cost = COIN_COSTS.purchaseDiscount;
  return {
    cost,
    affordable: coins >= cost,
    percent: COIN_DISCOUNT_PERCENT,
    shortBy: Math.max(0, cost - coins),
  };
}
