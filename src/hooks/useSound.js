/**
 * useSound.js — Audio management using expo-av
 *
 * Loads all sounds on mount. Respects the mute toggle.
 * Sounds are <100KB each (sourced from freesound.org or Bfxr).
 *
 * NOTE: Sound files go in /assets/sounds/
 * Source from: https://freesound.org or https://www.bfxr.net
 */

import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { getSoundOn } from '../utils/storage';

const SOUND_FILES = {
  tap: require('../../assets/sounds/tap.mp3'),
  perfect: require('../../assets/sounds/perfect.mp3'),
  trim: require('../../assets/sounds/trim.mp3'),
  combo: require('../../assets/sounds/combo.mp3'),
  fail: require('../../assets/sounds/fail.mp3'),
  highscore: require('../../assets/sounds/highscore.mp3'),
  purchase: require('../../assets/sounds/purchase.mp3'),
  startup: require('../../assets/sounds/startup.mp3'),
};

export function useSound() {
  const sounds = useRef({});
  const soundOn = useRef(true);

  useEffect(() => {
    let mounted = true;

    async function loadSounds() {
      soundOn.current = await getSoundOn();

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false, // Respect silent switch on iOS
        staysActiveInBackground: false,
      });

      for (const [name, file] of Object.entries(SOUND_FILES)) {
        try {
          const { sound } = await Audio.Sound.createAsync(file, {
            shouldPlay: false,
            volume: 1.0,
          });
          if (mounted) sounds.current[name] = sound;
        } catch (e) {
          // Missing sound file is non-fatal — game works without audio
          console.warn(`Sound load failed: ${name}`, e);
        }
      }
    }

    loadSounds();

    return () => {
      mounted = false;
      // Release all audio resources on unmount
      Object.values(sounds.current).forEach((s) => s.unloadAsync());
    };
  }, []);

  const play = useCallback(async (name) => {
    if (!soundOn.current) return;
    const sound = sounds.current[name];
    if (!sound) return;
    try {
      await sound.replayAsync();
    } catch {
      // Ignore playback errors
    }
  }, []);

  const setSoundEnabled = useCallback((enabled) => {
    soundOn.current = enabled;
  }, []);

  return { play, setSoundEnabled };
}
