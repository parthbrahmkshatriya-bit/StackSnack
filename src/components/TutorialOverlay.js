/**
 * TutorialOverlay.js
 *
 * FIX: The FRS claimed "zero learning curve" but had no tutorial.
 * This shows once on first run, dimming the screen and indicating the tap mechanic.
 * Uses markFirstRunDone() so it never shows again.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { markFirstRunDone } from '../utils/storage';
import { logEvent, Events } from '../utils/analytics';

export default function TutorialOverlay({ visible, onDismiss }) {
  const tapOpacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      // Pulse the tap hint
      tapOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 600, easing: Easing.ease }),
          withTiming(1.0, { duration: 600, easing: Easing.ease })
        ),
        -1,
        false
      );
    }
  }, [visible]);

  const tapHintStyle = useAnimatedStyle(() => ({
    opacity: tapOpacity.value,
  }));

  if (!visible) return null;

  const handleDismiss = async () => {
    await markFirstRunDone();
    logEvent(Events.TUTORIAL_COMPLETED);
    onDismiss();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>HOW TO PLAY</Text>
        <Text style={styles.body}>
          Watch the platform slide across.{'\n'}
          <Text style={styles.bold}>TAP anywhere</Text> to drop it onto the stack.
        </Text>
        <Text style={styles.body}>
          Land it perfectly for{' '}
          <Text style={[styles.bold, { color: '#F1C40F' }]}>COMBO BONUSES</Text>.
        </Text>
        <Text style={styles.body}>
          The platform shrinks if you miss.{'\n'}
          Stack as high as you can!
        </Text>
        <Animated.View style={[styles.tapHint, tapHintStyle]}>
          <Text style={styles.tapHintText}>TAP TO START</Text>
        </Animated.View>
        <TouchableOpacity style={styles.gotItBtn} onPress={handleDismiss}>
          <Text style={styles.gotItText}>GOT IT →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 32,
    alignItems: 'center',
    gap: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  body: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tapHint: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 50,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  tapHintText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
  },
  gotItBtn: {
    marginTop: 8,
    backgroundColor: '#3498DB',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  gotItText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
