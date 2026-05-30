/**
 * game.js — Core game configuration
 *
 * All speed values are in logical pixels per second (not per frame).
 * This decouples game speed from frame rate, so it's consistent
 * on 30fps low-end and 60fps high-end devices.
 */

// Platform movement speeds (logical px/sec)
// Original FRS: 2.5px/frame @ 60fps = 150px/sec
export const SPEED_CONFIG = {
  BASE_SPEED: 150,          // px/sec at level 1
  SPEED_INCREMENT: 9,       // px/sec added per level (+0.15px/frame @ 60fps)
  MAX_SPEED: 360,           // px/sec cap (6.0px/frame @ 60fps)
  LEVEL_UP_EVERY: 10,       // stacks per level
};

// Scoring
export const SCORING = {
  NORMAL_STACK: 10,
  PERFECT_STACK: 25,
  COMBO_2: 50,
  COMBO_3: 100,
  COMBO_4_PLUS: 200,
};

// Combo labels
export const COMBO_LABELS = {
  1: 'PERFECT!',
  2: 'COMBO x2',
  3: 'COMBO x3',
  4: 'ON FIRE! 🔥',
};

// Colors for combo labels
export const COMBO_COLORS = {
  1: '#FFFFFF',
  2: '#F1C40F',
  3: '#E67E22',
  4: '#E74C3C',
};

// Drop animation duration (ms)
export const DROP_DURATION = 300;

// Cut piece fall duration (ms)
export const CUT_FALL_DURATION = 400;

// Perfect flash duration (ms)
export const PERFECT_FLASH_DURATION = 300;

// Ad frequency: show interstitial every N game-overs
export const INTERSTITIAL_FREQUENCY = 3;

// Max rewarded ad continues per session
export const MAX_REWARDED_CONTINUES = 1;

// Bonus width added after rewarded continue (logical px)
export const CONTINUE_BONUS_WIDTH = 10;

// AsyncStorage keys
export const STORAGE_KEYS = {
  HIGH_SCORE:  '@stacksnap/highscore',
  BEST_SCORE:  '@stacksnap/highscore', // alias used by Tetris engine
  TOTAL_GAMES: '@stacksnap/totalgames',
  ACTIVE_THEME: '@stacksnap/activetheme',
  OWNED_THEMES: '@stacksnap/ownedthemes',
  SOUND_ON: '@stacksnap/soundon',
  GAMES_SINCE_INTERSTITIAL: '@stacksnap/gamessincelastinterstitial',
  TOTAL_PLATFORMS: '@stacksnap/totalplatforms',
  FIRST_RUN: '@stacksnap/firstrun',
  GDPR_CONSENT: '@stacksnap/gdprconsent',
};
