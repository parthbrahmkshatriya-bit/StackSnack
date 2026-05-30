/**
 * useTheme.js — Provides active theme colors throughout the app
 */

import { useState, useEffect, useCallback } from 'react';
import { THEMES, DEFAULT_THEME_ID } from '../constants/themes';
import { getActiveTheme, setActiveTheme } from '../utils/storage';

export function useTheme() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    getActiveTheme().then(setThemeId);
  }, []);

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];

  const changeTheme = useCallback(async (newThemeId) => {
    await setActiveTheme(newThemeId);
    setThemeId(newThemeId);
  }, []);

  return { theme, themeId, changeTheme };
}
