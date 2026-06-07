/**
 * iap.js — In-App Purchase product configuration
 *
 * All products are non-consumable (purchased once, owned forever).
 * Product IDs must match exactly what you create in:
 *   - Google Play Console → Monetize → Products → In-app products
 *   - App Store Connect → In-App Purchases
 */

import { Platform } from 'react-native';

export const IAP_PRODUCTS = [
  'com.stacksnap.theme_sunset',
  'com.stacksnap.theme_india',
  'com.stacksnap.theme_neon',
  'com.stacksnap.theme_gold',
];

// Map IAP product ID → theme ID (they match in this case but keep explicit)
export const IAP_TO_THEME = {
  'com.stacksnap.theme_sunset': 'theme_sunset',
  'com.stacksnap.theme_india': 'theme_india',
  'com.stacksnap.theme_neon': 'theme_neon',
  'com.stacksnap.theme_gold': 'theme_gold',
};
