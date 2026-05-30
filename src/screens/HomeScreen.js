import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { getHighScore, getActiveTheme } from '../utils/storage';
import { THEMES } from '../constants/themes';
import { AD_UNIT_IDS } from '../constants/admob';

export default function HomeScreen({ navigation }) {
  const [bestScore, setBestScore] = useState(0);
  const [themeId, setThemeId] = useState('theme_default');

  const playBtnScale = useSharedValue(1);
  const playBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playBtnScale.value }],
  }));

  // Pulse the play button when idle
  useEffect(() => {
    playBtnScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 900 }),
        withTiming(1.0, { duration: 900 })
      ),
      -1,
      false
    );
  }, []);

  // Refresh score and theme every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      getHighScore().then(setBestScore);
      getActiveTheme().then(setThemeId);
    }, [])
  );

  const theme = THEMES[themeId] || THEMES.theme_default;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Title */}
      <Text style={[styles.title, { color: theme.uiText }]}>STACK & SNAP</Text>

      {/* Best score */}
      <Text style={styles.bestScore}>BEST: {bestScore}</Text>

      {/* Play button */}
      <Animated.View style={playBtnStyle}>
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: theme.accent }]}
          onPress={() => navigation.navigate('Game', { theme: themeId })}
          activeOpacity={0.85}
        >
          <Text style={styles.playBtnText}>PLAY</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Shop button */}
      <TouchableOpacity
        style={styles.shopBtn}
        onPress={() => navigation.navigate('Shop')}
        activeOpacity={0.8}
      >
        <Text style={styles.shopBtnText}>🎨 THEMES</Text>
      </TouchableOpacity>

      {/* Theme color preview dots */}
      <View style={styles.themePreview}>
        {theme.preview.map((color, i) => (
          <View
            key={i}
            style={[styles.previewDot, { backgroundColor: color }]}
          />
        ))}
      </View>

      {/* Banner ad */}
      <View style={styles.adContainer}>
        <BannerAd
          unitId={AD_UNIT_IDS.BANNER}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
          onAdFailedToLoad={(e) => console.warn('Banner failed:', e)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 70, // Space for banner ad
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bestScore: {
    color: '#F39C12',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 48,
    letterSpacing: 1,
  },
  playBtn: {
    width: '100%',
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
  },
  shopBtn: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 32,
  },
  shopBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
    fontWeight: '600',
  },
  themePreview: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  previewDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.7,
  },
  adContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
