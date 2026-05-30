import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { useSound } from '../hooks/useSound';

export default function SplashScreen({ navigation }) {
  const opacity = useSharedValue(0);
  const { play } = useSound();

  const logoStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    const navigate = () => navigation.replace('Home');

    // Small delay so useSound hook has time to load the audio file
    const soundTimer = setTimeout(() => play('startup'), 300);

    // Fade in over 0.8s, then navigate at 1.5s total
    opacity.value = withTiming(1, { duration: 800 }, () => {
      setTimeout(() => runOnJS(navigate)(), 700);
    });

    return () => clearTimeout(soundTimer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, logoStyle]}>
        <Text style={styles.title}>Stack & Snap</Text>
        <Text style={styles.tagline}>How high can you go?</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(52,152,219,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    marginTop: 10,
    fontWeight: '400',
  },
});
