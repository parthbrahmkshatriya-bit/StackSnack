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
  tap: require('../../assets/sounds/tap.wav'),
  perfect: require('../../assets/sounds/perfect.wav'),
  trim: require('../../assets/sounds/trim.wav'),
  combo: require('../../assets/sounds/combo.wav'),
  fail: require('../../assets/sounds/fail.wav'),
  highscore: require('../../assets/sounds/highscore.wav'),
  purchase: require('../../assets/sounds/purchase.wav'),
  startup: require('../../assets/sounds/startup.wav'),
  drag: require('../../assets/sounds/drag.wav'),
  bgm: require('../../assets/sounds/bgm.mp3'),
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
            volume: name === 'bgm' ? 0.35 : 1.0, // Mute background music slightly so sfx pop!
            isLooping: name === 'bgm', // Loop background music!
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

  const playBGM = useCallback(async () => {
    if (!soundOn.current) return;
    const sound = sounds.current.bgm;
    if (!sound) return;
    try {
      await sound.playAsync();
    } catch {
      // Ignore BGM play errors
    }
  }, []);

  const stopBGM = useCallback(async () => {
    const sound = sounds.current.bgm;
    if (!sound) return;
    try {
      await sound.stopAsync();
    } catch {
      // Ignore BGM stop errors
    }
  }, []);

  const setSoundEnabled = useCallback((enabled) => {
    soundOn.current = enabled;
    if (!enabled) {
      stopBGM();
    }
  }, [stopBGM]);

  return { play, playBGM, stopBGM, setSoundEnabled };
}
