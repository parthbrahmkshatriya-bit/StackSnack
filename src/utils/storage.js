/**
 * storage.js — AsyncStorage helpers
 * Typed wrappers so you never deal with JSON.parse/stringify manually.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/game';
import { DEFAULT_THEME_ID } from '../constants/themes';

// --- Generic helpers ---

export async function getItem(key, defaultValue = null) {
  try {
    const val = await AsyncStorage.getItem(key);
    if (val === null) return defaultValue;
    return JSON.parse(val);
  } catch {
    return defaultValue;
  }
}

export async function setItem(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage write failed:', key, e);
  }
}

// --- Game-specific helpers ---

export async function getHighScore() {
  return getItem(STORAGE_KEYS.HIGH_SCORE, 0);
}

export async function saveHighScore(score) {
  return setItem(STORAGE_KEYS.HIGH_SCORE, score);
}

export async function incrementTotalGames() {
  const current = await getItem(STORAGE_KEYS.TOTAL_GAMES, 0);
  await setItem(STORAGE_KEYS.TOTAL_GAMES, current + 1);
  return current + 1;
}

export async function addTotalPlatforms(count) {
  const current = await getItem(STORAGE_KEYS.TOTAL_PLATFORMS, 0);
  await setItem(STORAGE_KEYS.TOTAL_PLATFORMS, current + count);
}

export async function getActiveTheme() {
  return getItem(STORAGE_KEYS.ACTIVE_THEME, DEFAULT_THEME_ID);
}

export async function setActiveTheme(themeId) {
  return setItem(STORAGE_KEYS.ACTIVE_THEME, themeId);
}

export async function getOwnedThemes() {
  return getItem(STORAGE_KEYS.OWNED_THEMES, [DEFAULT_THEME_ID]);
}

export async function addOwnedTheme(themeId) {
  const owned = await getOwnedThemes();
  if (!owned.includes(themeId)) {
    const updated = [...owned, themeId];
    await setItem(STORAGE_KEYS.OWNED_THEMES, updated);
    return updated;
  }
  return owned;
}

export async function getSoundOn() {
  return getItem(STORAGE_KEYS.SOUND_ON, true);
}

export async function setSoundOn(value) {
  return setItem(STORAGE_KEYS.SOUND_ON, value);
}

export async function isFirstRun() {
  const seen = await getItem(STORAGE_KEYS.FIRST_RUN, false);
  return !seen;
}

export async function markFirstRunDone() {
  return setItem(STORAGE_KEYS.FIRST_RUN, true);
}

// Returns true if interstitial should show (every 3rd game over)
export async function shouldShowInterstitial(frequency = 3) {
  const count = await getItem(STORAGE_KEYS.GAMES_SINCE_INTERSTITIAL, 0);
  const newCount = count + 1;
  if (newCount >= frequency) {
    await setItem(STORAGE_KEYS.GAMES_SINCE_INTERSTITIAL, 0);
    return true;
  }
  await setItem(STORAGE_KEYS.GAMES_SINCE_INTERSTITIAL, newCount);
  return false;
}
