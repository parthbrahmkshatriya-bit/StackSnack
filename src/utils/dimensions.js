/**
 * dimensions.js
 *
 * FIX: The original FRS used raw pixel values like "280px" which breaks
 * across device densities. React Native uses logical pixels (dp), but
 * game logic must be consistent regardless of screen size.
 *
 * All values here are in logical pixels, derived from actual screen size.
 * Use these constants everywhere — never hardcode pixel values in game logic.
 */
import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Horizontal padding on each side of the platform/stack
const SIDE_PADDING = 20;

// Starting platform width — fills screen minus padding
export const INITIAL_PLATFORM_WIDTH = SCREEN_WIDTH - SIDE_PADDING * 2;

// Platform height (logical pixels — same visual size on all devices)
export const PLATFORM_HEIGHT = Math.round(SCREEN_HEIGHT * 0.038); // ~30dp on 800dp screen

// Minimum platform width before game over
// Using a percentage of initial width is more consistent than a fixed value
export const MIN_PLATFORM_WIDTH = Math.round(INITIAL_PLATFORM_WIDTH * 0.035); // ~8dp equivalent

// Perfect tap threshold: overlap >= 95% of current platform width
export const PERFECT_THRESHOLD = 0.95;

// Starting position of the moving platform (left edge)
export const PLATFORM_START_X = SIDE_PADDING;

// Right boundary for the platform (right edge)
export const PLATFORM_END_X = SCREEN_WIDTH - SIDE_PADDING;

// Base Y position of the stack bottom (above safe area)
export const STACK_BOTTOM_Y = SCREEN_HEIGHT * 0.82;

// How many layers are visible before the camera starts scrolling
export const VISIBLE_LAYERS = 3;

// Y position where the moving platform appears (above stack)
export const MOVING_PLATFORM_Y_OFFSET = PLATFORM_HEIGHT * 4;

export { SCREEN_WIDTH, SCREEN_HEIGHT };
