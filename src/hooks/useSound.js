/**
 * useSound.js — Audio management using expo-av (Global Singleton Pattern)
 *
 * Implements a global audio cache to prevent multiple instances from overlapping,
 * allowing seamless BGM playback and immediate SFX response.
 */

import { useEffect, useCallback, useState } from 'react';
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

// Global Singletons to manage audio state across navigation stack
let globalBGM = null;
let globalSounds = {};
let isBgmPlaying = false;
let soundEnabled = true;
let isLoaded = false;
let loadingPromise = null;

async function loadSoundsAsync() {
  if (isLoaded) return;
  
  soundEnabled = await getSoundOn();

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });

  for (const [name, file] of Object.entries(SOUND_FILES)) {
    try {
      const { sound } = await Audio.Sound.createAsync(file, {
        shouldPlay: false,
        volume: name === 'bgm' ? 0.35 : 1.0,
        isLooping: name === 'bgm',
      });
      if (name === 'bgm') {
        globalBGM = sound;
      } else {
        globalSounds[name] = sound;
      }
    } catch (e) {
      console.warn(`Sound load failed: ${name}`, e);
    }
  }
  isLoaded = true;
}

export function useSound() {
  const [, setTrigger] = useState(0);

  useEffect(() => {
    if (!loadingPromise) {
      loadingPromise = loadSoundsAsync().then(() => {
        setTrigger(t => t + 1); // trigger re-render once loaded
      });
    }
  }, []);

  const play = useCallback(async (name) => {
    if (!soundEnabled || !isLoaded) return;
    const sound = globalSounds[name];
    if (!sound) return;
    try {
      await sound.replayAsync();
    } catch {
      // Ignore playback errors
    }
  }, []);

  const playBGM = useCallback(async () => {
    if (!soundEnabled) return;
    
    // Ensure BGM is loaded
    if (!isLoaded && loadingPromise) {
      await loadingPromise;
    }
    
    if (!globalBGM || isBgmPlaying) return;

    try {
      await globalBGM.playAsync();
      isBgmPlaying = true;
    } catch (e) {
      console.warn('BGM play failed:', e);
    }
  }, []);

  const stopBGM = useCallback(async () => {
    if (!globalBGM || !isBgmPlaying) return;
    try {
      await globalBGM.stopAsync();
      isBgmPlaying = false;
    } catch (e) {
      console.warn('BGM stop failed:', e);
    }
  }, []);

  const setSoundEnabled = useCallback((enabled) => {
    soundEnabled = enabled;
    if (!enabled) {
      stopBGM();
    } else {
      playBGM();
    }
  }, [stopBGM, playBGM]);

  return { play, playBGM, stopBGM, setSoundEnabled, isAudioReady: isLoaded };
}
