/**
 * GameOverScreen.js
 *
 * FIX: Rewarded ad is OPTIONAL (not forced). User sees two clear choices:
 *   "▶ Watch Ad to Continue" vs "RETRY" (fresh start)
 * This fixes the aggressive ad gate that causes Day 1 uninstalls.
 *
 * FIX: Interstitial ad shown ONLY every 3rd game-over (checked via storage).
 * FIX: Ad shown BEFORE screen content — never interrupts score reading.
 * FIX: react-native-view-shot for proper score card image sharing.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  useAnimatedStyle,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';

import {
  getHighScore,
  saveHighScore,
  incrementTotalGames,
  shouldShowInterstitial,
} from '../utils/storage';
import { AD_UNIT_IDS } from '../constants/admob';
import { INTERSTITIAL_FREQUENCY, MAX_REWARDED_CONTINUES } from '../constants/game';
import { logEvent, Events } from '../utils/analytics';
import { THEMES } from '../constants/themes';

// Pre-create ad instances at module level (survives re-renders)
const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL, {
  requestNonPersonalizedAdsOnly: false,
});
const rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED, {
  requestNonPersonalizedAdsOnly: false,
});

export default function GameOverScreen({ navigation, route }) {
  const {
    score = 0,
    stackCount = 0,
    themeId = 'theme_default',
    canContinue = true,
    continueWidth = 100,
  } = route.params || {};

  const theme = THEMES[themeId] || THEMES.theme_default;

  const [bestScore, setBestScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  const scoreCardRef = useRef(null);

  // Animations
  const cardScale = useSharedValue(0.7);
  const cardOpacity = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  // ── On mount: process game over ─────────────────────────────────────────
  useEffect(() => {
    async function processGameOver() {
      // 1. Update stats
      await incrementTotalGames();
      const currentBest = await getHighScore();
      const newBest = score > currentBest;
      if (newBest) {
        await saveHighScore(score);
        logEvent(Events.NEW_HIGH_SCORE, { score });
      }
      setBestScore(newBest ? score : currentBest);
      setIsNewBest(newBest);
      logEvent(Events.GAME_OVER, { score, stacks: stackCount });

      // 2. Check if interstitial should show (every 3rd game)
      const showInter = await shouldShowInterstitial(INTERSTITIAL_FREQUENCY);

      // 3. Show interstitial FIRST (before revealing content)
      if (showInter) {
        await showInterstitialAd();
      }

      // 4. Reveal content with animation
      setContentVisible(true);
      cardScale.value = withSpring(1, { damping: 14, stiffness: 120 });
      cardOpacity.value = withTiming(1, { duration: 300 });
    }

    processGameOver();

    // Preload rewarded ad in background
    rewarded.load();
    const rewardedLoadedUnsub = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setRewardedLoaded(true)
    );
    return () => rewardedLoadedUnsub();
  }, []);

  // ── Show interstitial (awaitable) ──────────────────────────────────────
  const showInterstitialAd = () =>
    new Promise((resolve) => {
      const loadUnsub = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        logEvent(Events.AD_INTERSTITIAL_SHOWN);
        interstitial.show().catch(() => {}).finally(resolve);
      });
      const errorUnsub = interstitial.addAdEventListener(AdEventType.ERROR, () => {
        resolve(); // Don't block on ad failure
      });
      const closeUnsub = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        loadUnsub();
        errorUnsub();
        closeUnsub();
        resolve();
      });
      interstitial.load();
    });

  // ── Rewarded continue ──────────────────────────────────────────────────
  const handleWatchAdContinue = useCallback(() => {
    if (!rewardedLoaded) return;
    logEvent(Events.AD_REWARDED_SHOWN);

    const earnedUnsub = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        logEvent(Events.AD_REWARDED_COMPLETED);
        // Continue from where player left off
        navigation.replace('Game', {
          theme: themeId,
          isContinue: true,
          continueWidth: Math.min(continueWidth + 10, 200),
        });
      }
    );
    const closedUnsub = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      logEvent(Events.AD_REWARDED_SKIPPED);
      earnedUnsub();
      closedUnsub();
    });

    rewarded.show().catch(console.warn);
  }, [rewardedLoaded, navigation, themeId, continueWidth]);

  // ── Fresh retry ───────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    navigation.replace('Game', { theme: themeId });
  }, [navigation, themeId]);

  // ── Share score card ──────────────────────────────────────────────────
  // FIX: Uses react-native-view-shot to capture actual image (not just text)
  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const uri = await scoreCardRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Stack & Snap score!',
        });
      } else {
        await Share.share({
          message: `I stacked ${stackCount} platforms and scored ${score} in Stack & Snap! Can you beat me? 🏆`,
        });
      }
      logEvent(Events.SCORE_SHARED, { score });
    } catch (e) {
      console.warn('Share failed:', e);
    } finally {
      setSharing(false);
    }
  }, [score, stackCount]);

  if (!contentVisible) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Capture area for share image */}
        <ViewShot
          ref={scoreCardRef}
          options={{ format: 'png', quality: 0.95 }}
          style={[styles.scoreCard, { backgroundColor: theme.background }]}
        >
          <Text style={styles.gameOverTitle}>
            {isNewBest ? '🏆 NEW BEST!' : 'GAME OVER'}
          </Text>
          <Text style={[styles.scoreNumber, { color: isNewBest ? '#F39C12' : '#FFFFFF' }]}>
            {score}
          </Text>
          <Text style={styles.subLabel}>
            {stackCount} platforms stacked
          </Text>
          {!isNewBest && (
            <Text style={styles.bestLabel}>Best: {bestScore}</Text>
          )}
          <Text style={styles.brandTag}>Stack & Snap</Text>
        </ViewShot>

        {/* Action buttons */}
        <View style={styles.buttons}>
          {/* Share */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            disabled={sharing}
          >
            <Text style={styles.shareBtnText}>
              {sharing ? '...' : '📤 Share Score'}
            </Text>
          </TouchableOpacity>

          {/* Watch ad to continue (OPTIONAL — not forced) */}
          {canContinue && (
            <TouchableOpacity
              style={[
                styles.continueBtn,
                !rewardedLoaded && styles.continueBtnDisabled,
              ]}
              onPress={handleWatchAdContinue}
              disabled={!rewardedLoaded}
            >
              <Text style={styles.continueBtnText}>
                {rewardedLoaded ? '▶ Watch Ad to Continue' : 'Loading ad...'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Fresh retry — always available, no ad */}
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.accent }]}
            onPress={handleRetry}
          >
            <Text style={styles.retryBtnText}>RETRY</Text>
          </TouchableOpacity>

          {/* Home */}
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.replace('Home')}
          >
            <Text style={styles.homeBtnText}>HOME</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  scoreCard: {
    padding: 32,
    alignItems: 'center',
  },
  gameOverTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 3,
    opacity: 0.8,
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
    marginBottom: 4,
  },
  subLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    marginBottom: 4,
  },
  bestLabel: {
    color: '#F39C12',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  brandTag: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginTop: 16,
    letterSpacing: 2,
  },
  buttons: {
    padding: 20,
    gap: 12,
  },
  shareBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: 'rgba(52,152,219,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(52,152,219,0.6)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },
  homeBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  homeBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
});
