/**
 * GameScreen.js — Tetris engine for React Native
 *
 * All mutable game state lives in G (useRef) to avoid stale closures.
 * All logic methods live in logicRef.current (reassigned each render)
 * so setTimeout callbacks always call the latest version.
 * `tick` state increments to trigger re-renders after game changes.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { STORAGE_KEYS } from '../constants/game';
import { THEMES } from '../constants/themes';
import { useSound } from '../hooks/useSound';

// ─── Board dimensions ─────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const { width: SW } = Dimensions.get('window');
const SIDE_W = 72;   // right-side panel width
const BOARD_ML = 10; // left margin
const CELL = Math.floor((SW - BOARD_ML - SIDE_W - 8) / COLS);
const BOARD_W = CELL * COLS;
const BOARD_H = CELL * ROWS;

// ─── Tetromino definitions ────────────────────────────────────────────────────
const PIECES = [
  { cells: [[0,0],[1,0],[2,0],[3,0]], color: '#00CFCF' }, // I
  { cells: [[0,0],[1,0],[0,1],[1,1]], color: '#F1C40F' }, // O
  { cells: [[1,0],[0,1],[1,1],[2,1]], color: '#9B59B6' }, // T
  { cells: [[1,0],[2,0],[0,1],[1,1]], color: '#2ECC71' }, // S
  { cells: [[0,0],[1,0],[1,1],[2,1]], color: '#E74C3C' }, // Z
  { cells: [[2,0],[0,1],[1,1],[2,1]], color: '#F39C12' }, // L
  { cells: [[0,0],[0,1],[1,1],[2,1]], color: '#3498DB' }, // J
];

// Drop interval per level (ms). Level 0 = 900ms, Level 9 = 100ms.
const SPEEDS = [900, 800, 700, 600, 500, 420, 340, 260, 180, 100];
// Points per lines cleared (×level+1 multiplier)
const SCORE_TABLE = [0, 100, 300, 500, 800];

// ─── Pure game logic helpers (no React) ──────────────────────────────────────
const newBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const randPiece = (theme) => {
  const idx = Math.floor(Math.random() * PIECES.length);
  const p = PIECES[idx];
  const colors = theme?.platformColors || ['#3498DB'];
  const color = colors[idx % colors.length];
  return {
    cells: p.cells.map(c => [...c]),
    color: color,
    x: Math.floor(COLS / 2) - 2,
    y: -1,
  };
};

const getCellStyle = (cell, theme, CELL_SIZE) => {
  if (!cell) {
    return {
      width: CELL_SIZE,
      height: CELL_SIZE,
      backgroundColor: theme.cellEmptyBg || 'rgba(255,255,255,0.02)',
      borderColor: theme.cellEmptyBorder || 'rgba(255,255,255,0.04)',
      borderWidth: 0.5,
    };
  }

  if (cell.ghost) {
    return {
      width: CELL_SIZE,
      height: CELL_SIZE,
      backgroundColor: cell.color,
      opacity: theme.style === 'wood' ? 0.25 : 0.18,
      borderColor: 'transparent',
      borderWidth: 0.5,
      borderRadius: theme.style === 'wood' ? 4 : 0,
    };
  }

  // Active or Locked block
  const baseStyle = {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: cell.color,
  };

  if (theme.style === 'wood') {
    return {
      ...baseStyle,
      borderWidth: 2,
      borderTopColor: 'rgba(255,255,255,0.45)',
      borderLeftColor: 'rgba(255,255,255,0.35)',
      borderBottomColor: 'rgba(0,0,0,0.6)',
      borderRightColor: 'rgba(0,0,0,0.5)',
      borderRadius: 4,
    };
  }

  if (theme.style === 'neon') {
    return {
      ...baseStyle,
      borderWidth: 2,
      borderColor: cell.color,
      backgroundColor: '#000000',
      shadowColor: cell.color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 5,
      elevation: 4,
      borderRadius: 2,
    };
  }

  if (theme.style === 'gold') {
    return {
      ...baseStyle,
      borderWidth: 2,
      borderTopColor: 'rgba(255, 215, 0, 0.6)',
      borderLeftColor: 'rgba(255, 215, 0, 0.4)',
      borderBottomColor: 'rgba(101, 67, 33, 0.8)',
      borderRightColor: 'rgba(101, 67, 33, 0.6)',
      borderRadius: 3,
    };
  }

  // default flat
  return {
    ...baseStyle,
    borderColor: 'rgba(0,0,0,0.3)',
    borderWidth: 0.5,
  };
};

const rotateCells = cells => {
  const mx = Math.max(...cells.map(c => c[0]));
  return cells.map(([x, y]) => [y, mx - x]);
};

const isValid = (cells, px, py, board) =>
  cells.every(([cx, cy]) => {
    const nx = cx + px, ny = cy + py;
    return nx >= 0 && nx < COLS && ny < ROWS && (ny < 0 || !board[ny][nx]);
  });

const calcGhostY = (cur, board) => {
  let gy = cur.y;
  while (isValid(cur.cells, cur.x, gy + 1, board)) gy++;
  return gy;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function GameScreen({ navigation, route }) {
  const { theme: themeId = 'theme_default' } = route.params || {};
  const theme = THEMES[themeId] || THEMES.theme_default;
  const insets = useSafeAreaInsets();
  const { play, playBGM, stopBGM } = useSound();

  // Single ref for ALL mutable game state — no stale-closure problems
  const G = useRef({
    board: newBoard(),
    cur: randPiece(theme),
    nxt: randPiece(theme),
    score: 0,
    lines: 0,
    level: 0,
    combo: 0,
    flashRows: [],
    gameOver: false,
    paused: false,
    bestScore: 0,
    dropTimer: null,
    flashTimer: null,
  });

  // tick is the only React state — incrementing it forces a re-render
  const [tick, setTick] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const redraw = useCallback(() => setTick(t => t + 1), []);

  // All game logic methods in a ref so setTimeout always calls latest version
  const L = useRef(null);
  L.current = {
    scheduleDrop() {
      clearTimeout(G.current.dropTimer);
      const spd = SPEEDS[Math.min(G.current.level, SPEEDS.length - 1)];
      G.current.dropTimer = setTimeout(() => L.current.softDrop(), spd);
    },

    softDrop() {
      const g = G.current;
      if (g.gameOver || g.paused || g.flashRows.length > 0) return;
      if (!isValid(g.cur.cells, g.cur.x, g.cur.y + 1, g.board)) {
        L.current.lockPiece();
      } else {
        g.cur.y++;
        redraw();
        L.current.scheduleDrop();
      }
    },

    lockPiece() {
      const g = G.current;
      g.cur.cells.forEach(([cx, cy]) => {
        const ny = cy + g.cur.y;
        if (ny >= 0) g.board[ny][cx + g.cur.x] = g.cur.color;
      });
      L.current.checkLines();
    },

    checkLines() {
      const g = G.current;
      const full = [];
      for (let r = 0; r < ROWS; r++) {
        if (g.board[r].every(c => c)) full.push(r);
      }
      if (full.length === 0) {
        g.combo = 0;
        L.current.spawnNext();
        return;
      }
      // Flash cleared rows white for 300ms
      g.flashRows = full;
      g.combo++;
      play('perfect'); // Play line clear chime!
      redraw();
      g.flashTimer = setTimeout(() => {
        const n = full.length;
        let pts = (SCORE_TABLE[n] || 800) * (g.level + 1);
        if (g.combo > 1) pts = Math.floor(pts * 1.5); // combo bonus
        g.score += pts;
        g.lines += n;
        g.level = Math.floor(g.lines / 10);
        // Remove cleared rows (high-index first), add blank rows at top
        full.sort((a, b) => b - a).forEach(r => {
          g.board.splice(r, 1);
          g.board.unshift(Array(COLS).fill(null));
        });
        g.flashRows = [];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        L.current.spawnNext();
      }, 300);
    },

    spawnNext() {
      const g = G.current;
      g.cur = g.nxt;
      g.nxt = randPiece(theme);
      // Check game over: new piece spawns into occupied space
      if (!isValid(g.cur.cells, g.cur.x, g.cur.y, g.board)) {
        g.gameOver = true;
        stopBGM(); // Stop background music!
        play('fail'); // Play game over sound!
        redraw();
        // Save best score
        if (g.score > g.bestScore) {
          g.bestScore = g.score;
          AsyncStorage.setItem(
            STORAGE_KEYS.BEST_SCORE || STORAGE_KEYS.HIGH_SCORE,
            String(g.score)
          ).catch(() => {});
        }
        setTimeout(() => {
          navigation.replace('GameOver', {
            score: g.score,
            linesCleared: g.lines,
            level: g.level + 1,
            themeId,
            canContinue: false,
            stackCount: g.lines, // kept for backward compat with GameOverScreen
          });
        }, 600);
        return;
      }
      redraw();
      L.current.scheduleDrop();
    },

    moveLeft() {
      const g = G.current;
      if (g.gameOver || g.paused || g.flashRows.length) return;
      if (isValid(g.cur.cells, g.cur.x - 1, g.cur.y, g.board)) {
        g.cur.x--;
        play('drag'); // Play drag sound!
        redraw();
      }
    },

    moveRight() {
      const g = G.current;
      if (g.gameOver || g.paused || g.flashRows.length) return;
      if (isValid(g.cur.cells, g.cur.x + 1, g.cur.y, g.board)) {
        g.cur.x++;
        play('drag'); // Play drag sound!
        redraw();
      }
    },

    rotate() {
      const g = G.current;
      if (g.gameOver || g.paused || g.flashRows.length) return;
      const r = rotateCells(g.cur.cells);
      for (const kick of [0, -1, 1, -2, 2]) {
        if (isValid(r, g.cur.x + kick, g.cur.y, g.board)) {
          g.cur.cells = r;
          g.cur.x += kick;
          play('tap'); // Play rotate sound!
          redraw();
          return;
        }
      }
    },

    hardDrop() {
      const g = G.current;
      if (g.gameOver || g.paused || g.flashRows.length) return;
      clearTimeout(g.dropTimer);
      let dropped = 0;
      while (isValid(g.cur.cells, g.cur.x, g.cur.y + 1, g.board)) {
        g.cur.y++;
        dropped++;
      }
      g.score += dropped * 2;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      L.current.lockPiece();
    },
  };

  // ─── Start game on mount ──────────────────────────────────────────────────
  useEffect(() => {
    // Load best score from storage
    AsyncStorage.getItem(STORAGE_KEYS.BEST_SCORE || STORAGE_KEYS.HIGH_SCORE)
      .then(v => { if (v) { G.current.bestScore = parseInt(v, 10); redraw(); } })
      .catch(() => {});

    L.current.scheduleDrop();
    playBGM(); // Start background music!

    return () => {
      clearTimeout(G.current.dropTimer);
      clearTimeout(G.current.flashTimer);
      stopBGM(); // Stop background music!
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Gesture Control Setup ────────────────────────────────────────────────
  const gestureStateRef = useRef({
    startX: 0,
    startY: 0,
    lastDx: 0,
    lastDy: 0,
    startTime: 0,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        gestureStateRef.current = {
          startX: gestureState.x0,
          startY: gestureState.y0,
          lastDx: 0,
          lastDy: 0,
          startTime: Date.now(),
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        const state = gestureStateRef.current;
        const dx = gestureState.dx;
        const dy = gestureState.dy;

        // 1. Horizontal dragging (Continuous shifting)
        // Shift piece by one column for every 28px of horizontal drag
        const deltaX = dx - state.lastDx;
        const thresholdX = 28;
        if (deltaX > thresholdX) {
          L.current.moveRight();
          state.lastDx += thresholdX;
        } else if (deltaX < -thresholdX) {
          L.current.moveLeft();
          state.lastDx -= thresholdX;
        }

        // 2. Vertical dragging (Soft drop)
        // Soft drop piece by one row for every 20px of downward drag
        const deltaY = dy - state.lastDy;
        const thresholdY = 20;
        if (deltaY > thresholdY) {
          L.current.softDrop();
          state.lastDy += thresholdY;
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const state = gestureStateRef.current;
        const elapsed = Date.now() - state.startTime;
        const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);

        // A minimal move and short press is a Rotate Tap
        if (elapsed < 250 && distance < 12) {
          L.current.rotate();
        } else {
          // Check for a fast downward flick (Hard Drop)
          // Thresholds: flicked down at least 80px, with downward velocity vy > 0.4
          if (gestureState.dy > 80 && gestureState.vy > 0.4) {
            L.current.hardDrop();
          }
        }
      },
    })
  ).current;

  const togglePause = useCallback(() => {
    const g = G.current;
    if (g.gameOver) return;
    g.paused = !g.paused;
    setIsPaused(g.paused);
    if (!g.paused) {
      L.current.scheduleDrop();
      playBGM(); // Resume background music!
      redraw();
    } else {
      clearTimeout(g.dropTimer);
      stopBGM(); // Pause background music!
    }
  }, [playBGM, stopBGM, redraw]);

  // ─── Build display board (board + ghost + active piece + flash) ───────────
  const { displayBoard, nxtDisplay } = useMemo(() => {
    const g = G.current;
    const { board, cur, flashRows, nxt } = g;

    // display[r][c] = null | { color: string, ghost: boolean }
    const display = board.map(row =>
      row.map(cell => (cell ? { color: cell, ghost: false } : null))
    );

    // Ghost piece (semi-transparent landing preview)
    const gy = calcGhostY(cur, board);
    cur.cells.forEach(([cx, cy]) => {
      const ny = cy + gy;
      if (ny >= 0 && ny < ROWS && !display[ny][cx + cur.x]) {
        display[ny][cx + cur.x] = { color: cur.color, ghost: true };
      }
    });

    // Active piece (overwrites ghost if on same cell)
    cur.cells.forEach(([cx, cy]) => {
      const ny = cy + cur.y;
      if (ny >= 0 && ny < ROWS) {
        display[ny][cx + cur.x] = { color: cur.color, ghost: false };
      }
    });

    // Flash cleared rows white
    flashRows.forEach(r => {
      for (let c = 0; c < COLS; c++) {
        display[r][c] = { color: '#FFFFFF', ghost: false };
      }
    });  const boardFrameStyle = useMemo(() => {
    if (theme.style === 'wood') {
      return {
        borderWidth: 10,
        borderColor: '#5C4033',
        borderTopColor: '#8B5A2B',
        borderLeftColor: '#704214',
        borderBottomColor: '#2B1408',
        borderRightColor: '#3B1E0A',
        borderRadius: 16,
        backgroundColor: theme.boardBg || '#2C1A11',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
      };
    }
    if (theme.style === 'neon') {
      return {
        borderWidth: 2.5,
        borderColor: theme.boardBorder || '#00FFFF',
        borderRadius: 8,
        backgroundColor: theme.boardBg || '#000',
        shadowColor: theme.boardBorder || '#00FFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 6,
      };
    }
    if (theme.style === 'gold') {
      return {
        borderWidth: 5,
        borderColor: theme.boardBorder || '#D4AC0D',
        borderRadius: 10,
        backgroundColor: theme.boardBg || '#1C120C',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
      };
    }
    return {
      borderWidth: 1,
      borderColor: theme.boardBorder || 'rgba(255,255,255,0.12)',
      backgroundColor: 'transparent',
    };
  }, [theme]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background || '#180B05',
          paddingTop: insets.top,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* ── Vertical Wood Planks Background ── */}
      {theme.style === 'wood' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: '#180B05', borderRightWidth: 1, borderRightColor: '#120803', borderLeftWidth: 1, borderLeftColor: '#1d0e07' }} />
            <View style={{ flex: 1, backgroundColor: '#1a0d06', borderRightWidth: 1, borderRightColor: '#120803', borderLeftWidth: 1, borderLeftColor: '#1f0f08' }} />
            <View style={{ flex: 1, backgroundColor: '#160904', borderRightWidth: 1, borderRightColor: '#120803', borderLeftWidth: 1, borderLeftColor: '#1b0b05' }} />
            <View style={{ flex: 1, backgroundColor: '#1a0d06', borderRightWidth: 1, borderRightColor: '#120803', borderLeftWidth: 1, borderLeftColor: '#1f0f08' }} />
            <View style={{ flex: 1, backgroundColor: '#180B05', borderRightWidth: 1, borderRightColor: '#120803', borderLeftWidth: 1, borderLeftColor: '#1d0e07' }} />
          </View>
        </View>
      )}

      {/* ── Centered Game Title ── */}
      <Text style={[styles.gameTitle, theme.style === 'wood' && styles.gameTitleWood]}>
        STACK & SNAP
      </Text>

      {/* ── HUD ─────────────────────────────────────────────────────────── */}
      {theme.style === 'wood' ? (
        <View style={styles.hudWoodContainer}>
          <View style={styles.hudWoodCard}>
            {/* Left side: Avatar */}
            <View style={styles.hudWoodAvatarCol}>
              <View style={styles.hudWoodAvatarCircle}>
                <Text style={styles.hudWoodAvatarEmoji}>👷</Text>
              </View>
              <View style={styles.hudWoodAvatarBanner}>
                <Text style={styles.hudWoodAvatarName}>Alex</Text>
              </View>
            </View>
            
            {/* Right side: Stats & Progress */}
            <View style={styles.hudWoodStatsCol}>
              <View style={styles.hudWoodRow}>
                <Text style={styles.hudWoodText}>
                  <Text style={{fontWeight: '700'}}>IQ: </Text>
                  <Text style={{fontWeight: '900', color: '#8B4513'}}>{iq}</Text>
                </Text>
                <Text style={styles.hudWoodLevelText}>LEVEL {g.level + 1}</Text>
              </View>
              
              <View style={styles.hudWoodRow}>
                <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
                  <Text style={styles.hudWoodScoreLabel}>SCORE: </Text>
                  <Text style={styles.hudWoodScoreVal}>{g.score}</Text>
                </View>
              </View>
              
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                <View style={styles.hudWoodProgressTrack}>
                  <View style={[styles.hudWoodProgressFill, { width: iqProgress }]} />
                </View>
                <Text style={styles.hudWoodProgressPercent}>{parseInt(iqProgress) || 0}%</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={[
          styles.hud,
          theme.style === 'neon' && styles.hudNeon,
          theme.style === 'gold' && styles.hudGold,
        ]}>
          {/* Left Side: Pause Button */}
          <TouchableOpacity onPress={togglePause} style={styles.pauseBtn}>
            <Text style={[styles.pauseIcon, { color: theme.uiText || '#fff' }]}>
              {isPaused ? '▶' : '⏸'}
            </Text>
          </TouchableOpacity>

          {/* Central HUD Card: IQ & Avatar */}
          <View style={[
            styles.iqCard,
            theme.style === 'neon' && styles.iqCardNeon,
            theme.style === 'gold' && styles.iqCardGold,
          ]}>
            {/* Avatar Container */}
            <View style={[
              styles.avatarContainer,
              theme.style === 'neon' && styles.avatarNeon,
              theme.style === 'gold' && styles.avatarGold,
            ]}>
              <Text style={styles.avatarEmoji}>👴</Text>
            </View>
            
            {/* IQ Text & Progress Bar */}
            <View style={styles.iqProgressColumn}>
              <Text style={[
                styles.iqText, 
                { color: theme.uiText || '#fff' },
                theme.style === 'gold' && { color: '#F1C40F' }
              ]}>
                IQ : {iq}
              </Text>
              
              {/* Progress Bar Track */}
              <View style={[
                styles.progressBarTrack,
                theme.style === 'gold' && { backgroundColor: '#251912' },
              ]}>
                <View style={[
                  styles.progressBarFill,
                  { width: iqProgress },
                  theme.style === 'neon' && { backgroundColor: '#00FFFF' },
                  theme.style === 'gold' && { backgroundColor: '#D4AC0D' },
                ]} />
              </View>
            </View>
          </View>

          {/* Right Side: Score, LV & Lines */}
          <View style={styles.hudRightContainer}>
            <Text style={[styles.scoreTextNew, { color: theme.uiText || '#fff' }]}>
              {g.score}
            </Text>
            <View style={styles.levelLineBox}>
              <Text style={[styles.hudLabelNew, { color: theme.uiText ? `${theme.uiText}80` : 'rgba(255,255,255,0.45)' }]}>LV {g.level + 1}</Text>
              <Text style={[styles.hudLabelNew, { color: theme.uiText ? `${theme.uiText}80` : 'rgba(255,255,255,0.45)' }]}>{g.lines}L</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Board + Side panel ───────────────────────────────────────────── */}
      <View style={styles.gameRow} {...panResponder.panHandlers}>
        {/* Main 10×20 board */}
        <View
          style={[
            styles.board,
            boardFrameStyle,
            {
              width: BOARD_W + (theme.style === 'wood' ? 20 : theme.style === 'gold' ? 10 : theme.style === 'neon' ? 5 : 2),
              height: BOARD_H + (theme.style === 'wood' ? 44 : theme.style === 'gold' ? 10 : theme.style === 'neon' ? 5 : 2),
              marginLeft: BOARD_ML,
            },
          ]}
        >
          {displayBoard.map((row, r) => (
            <View key={r} style={styles.boardRow}>
              {row.map((cell, c) => (
                <View
                  key={c}
                  style={getCellStyle(cell, theme, CELL)}
                />
              ))}
            </View>
          ))}

          {/* Bottom Info Bar inside board frame (Wood theme only) */}
          {theme.style === 'wood' && (
            <View style={styles.boardInfoBarWood}>
              <View style={styles.boardInfoTagWood}>
                <Text style={styles.boardInfoTextWood}>LINE: {g.lines}</Text>
              </View>
              <View style={styles.boardInfoTagWood}>
                <Text style={styles.boardInfoTextWood}>COMBO: {g.combo > 1 ? `${g.combo}x` : '0x'}</Text>
              </View>
              <View style={styles.boardInfoTagWood}>
                <Text style={styles.boardInfoTextWood}>LEVEL: {g.level + 1}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Side panel: next piece + stats */}
        <View style={styles.sidePanel}>
          <View style={[
            styles.sideCard,
            theme.style === 'wood' && styles.sideCardWood,
            theme.style === 'neon' && styles.sideCardNeon,
            theme.style === 'gold' && styles.sideCardGold,
          ]}>
            <Text style={[
              styles.sideLabelNew,
              { color: theme.uiText ? `${theme.uiText}aa` : 'rgba(255,255,255,0.5)' },
              theme.style === 'wood' && { color: '#3D2314' },
              theme.style === 'gold' && { color: '#CA9B1B' }
            ]}>NEXT</Text>
            <View style={[
              styles.nextBoxNew,
              theme.style === 'wood' && styles.nextBoxWood,
              theme.style === 'neon' && styles.nextBoxNeon,
              theme.style === 'gold' && styles.nextBoxGold,
            ]}>
              {nxtDisplay.map((row, r) => (
                <View key={r} style={{ flexDirection: 'row' }}>
                  {row.map((cell, c) => (
                    <View
                      key={c}
                      style={[
                        {
                          width: MINI,
                          height: MINI,
                          margin: 1.5,
                        },
                        getCellStyle(cell ? { color: cell, ghost: false } : null, theme, MINI)
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>

          <View style={[
            styles.sideCard,
            theme.style === 'wood' && styles.sideCardWood,
            theme.style === 'neon' && styles.sideCardNeon,
            theme.style === 'gold' && styles.sideCardGold,
            { marginTop: 12 }
          ]}>
            <Text style={[
              styles.sideLabelNew,
              { color: theme.uiText ? `${theme.uiText}aa` : 'rgba(255,255,255,0.5)' },
              theme.style === 'wood' && { color: '#3D2314' },
              theme.style === 'gold' && { color: '#CA9B1B' }
            ]}>BEST</Text>
            <Text style={[
              styles.sideValNew,
              { color: theme.uiText || '#fff' },
              theme.style === 'wood' && { color: '#3D2314' },
              theme.style === 'gold' && { color: '#F1C40F' }
            ]}>{g.bestScore}</Text>
          </View>

          <View style={[
            styles.sideCard,
            theme.style === 'wood' && styles.sideCardWood,
            theme.style === 'neon' && styles.sideCardNeon,
            theme.style === 'gold' && styles.sideCardGold,
            { marginTop: 12 }
          ]}>
            <Text style={[
              styles.sideLabelNew,
              { color: theme.uiText ? `${theme.uiText}aa` : 'rgba(255,255,255,0.5)' },
              theme.style === 'wood' && { color: '#3D2314' },
              theme.style === 'gold' && { color: '#CA9B1B' }
            ]}>COMBO</Text>
            <Text style={[
              styles.sideValNew,
              { color: theme.style === 'wood' ? '#E59866' : theme.style === 'gold' ? '#F39C12' : '#FF00FF' },
              theme.style === 'wood' && g.combo > 1 && { color: '#A0522D' },
              g.combo > 1 ? {} : { color: 'rgba(255,255,255,0.3)' }
            ]}>
              {g.combo > 1 ? `×${g.combo}` : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Bottom Circular Control Buttons ── */}
      <View style={[styles.controlRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.controlBtnWrapper}>
          <TouchableOpacity
            style={[styles.controlBtn, theme.style === 'wood' && styles.controlBtnWood, theme.style === 'neon' && styles.controlBtnNeon, theme.style === 'gold' && styles.controlBtnGold]}
            onPress={() => L.current.rotate()}
            activeOpacity={0.75}
          >
            <Text style={[styles.controlBtnIcon, theme.style === 'wood' && { color: '#3D2314' }, theme.style === 'neon' && { color: '#00FFFF' }, theme.style === 'gold' && { color: '#CA9B1B' }]}>↻</Text>
          </TouchableOpacity>
          <Text style={[styles.controlBtnLabel, theme.style === 'wood' && { color: '#F5DEB3' }, theme.style === 'neon' && { color: '#00FFFF' }, theme.style === 'gold' && { color: '#D4AC0D' }]}>ROTATE</Text>
        </View>

        <View style={styles.controlBtnWrapper}>
          <TouchableOpacity
            style={[styles.controlBtn, theme.style === 'wood' && styles.controlBtnWood, theme.style === 'neon' && styles.controlBtnNeon, theme.style === 'gold' && styles.controlBtnGold]}
            onPress={() => L.current.hardDrop()}
            activeOpacity={0.75}
          >
            <Text style={[styles.controlBtnIcon, theme.style === 'wood' && { color: '#3D2314' }, theme.style === 'neon' && { color: '#00FFFF' }, theme.style === 'gold' && { color: '#CA9B1B' }]}>⬜</Text>
          </TouchableOpacity>
          <Text style={[styles.controlBtnLabel, theme.style === 'wood' && { color: '#F5DEB3' }, theme.style === 'neon' && { color: '#00FFFF' }, theme.style === 'gold' && { color: '#D4AC0D' }]}>DROP</Text>
        </View>

        <View style={styles.controlBtnWrapper}>
          <TouchableOpacity
            style={[styles.controlBtn, theme.style === 'wood' && styles.controlBtnWood, theme.style === 'neon' && styles.controlBtnNeon, theme.style === 'gold' && styles.controlBtnGold]}
            onPress={() => L.current.softDrop()}
            activeOpacity={0.75}
          >
            <Text style={[styles.controlBtnIcon, theme.style === 'wood' && { color: '#3D2314' }, theme.style === 'neon' && { color: '#00FFFF' }, theme.style === 'gold' && { color: '#CA9B1B' }]}>⤓</Text>
          </TouchableOpacity>
          <Text style={[styles.controlBtnLabel, theme.style === 'wood' && { color: '#F5DEB3' }, theme.style === 'neon' && { color: '#00FFFF' }, theme.style === 'gold' && { color: '#D4AC0D' }]}>HOLD</Text>
        </View>

        <View style={styles.controlBtnWrapper}>
          <TouchableOpacity
            style={[styles.controlBtn, theme.style === 'wood' && styles.controlBtnWood, theme.style === 'neon' && styles.controlBtnNeon, theme.style === 'gold' && styles.controlBtnGold]}
            onPress={togglePause}
            activeOpacity={0.75}
          >
            <Text style={[styles.controlBtnIcon, theme.style === 'wood' && { color: '#3D2314' }, theme.style === 'neon' && { color: '#00FFFF' }, theme.style === 'gold' && { color: '#CA9B1B' }]}>⚙</Text>
          </TouchableOpacity>
          <Text style={[styles.controlBtnLabel, theme.style === 'wood' && { color: '#F5DEB3' }, theme.style === 'neon' && { color: '#00FFFF' }, theme.style === 'gold' && { color: '#D4AC0D' }]}>MENU</Text>
        </View>
      </View>

      {/* ── Pause overlay ─────────────────────────────────────────────────── */}
      {isPaused && (
        <View style={styles.pauseOverlay}>
          <Text style={[
            styles.pauseTitle,
            theme.style === 'wood' && { color: '#F5DEB3' },
            theme.style === 'neon' && { color: '#00FFFF' },
            theme.style === 'gold' && { color: '#F1C40F' },
          ]}>PAUSED</Text>
          <TouchableOpacity 
            style={[
              styles.pauseResumeBtn,
              theme.style === 'wood' && { backgroundColor: '#CD853F', borderWidth: 2, borderColor: '#8B4513' },
              theme.style === 'neon' && { backgroundColor: '#000000', borderWidth: 2, borderColor: '#00FFFF', shadowColor: '#00FFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 5 },
              theme.style === 'gold' && { backgroundColor: '#D4AC0D', borderWidth: 2, borderColor: '#B7950B' },
            ]} 
            onPress={togglePause}
          >
            <Text style={[
              styles.pauseResumeTxt,
              theme.style === 'wood' && { color: '#180B05' },
              theme.style === 'neon' && { color: '#00FFFF' },
              theme.style === 'gold' && { color: '#120B05' },
            ]}>RESUME</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pauseHomeBtn,
              theme.style === 'wood' && { backgroundColor: '#3D2314', borderWidth: 2, borderColor: '#5C4033' },
              theme.style === 'neon' && { backgroundColor: '#000000', borderWidth: 2, borderColor: '#FF00FF', shadowColor: '#FF00FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 5 },
              theme.style === 'gold' && { backgroundColor: '#1C120C', borderWidth: 2, borderColor: '#D4AC0D' },
            ]}
            onPress={() => navigation.replace('Home')}
          >
            <Text style={[
              styles.pauseHomeTxt,
              theme.style === 'wood' && { color: '#F5DEB3' },
              theme.style === 'neon' && { color: '#FF00FF' },
              theme.style === 'gold' && { color: '#F1C40F' },
            ]}>HOME</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  pauseBtn: { padding: 8 },
  pauseIcon: { color: 'rgba(255,255,255,0.7)', fontSize: 20 },
  scoreText: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
  },
  hudRight: { alignItems: 'flex-end', width: 56 },
  hudLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },

  gameRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  board: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  boardRow: { flexDirection: 'row' },
  cell: { borderWidth: 0.5 },

  sidePanel: {
    flex: 1,
    alignItems: 'center',
    paddingLeft: 8,
    gap: 4,
  },
  sideLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  nextBox: { marginVertical: 6 },
  sideStat: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 10,
  },
  sideStatVal: { color: '#fff', fontSize: 14, fontWeight: '700' },

  legendContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    height: 90,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendSubText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  legendDot: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 12,
    marginHorizontal: 8,
  },

  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  pauseTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 40,
  },
  pauseResumeBtn: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 50,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  pauseResumeTxt: { color: '#fff', fontSize: 20, fontWeight: '700' },
  pauseHomeBtn: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 50,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  pauseHomeTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '600' },

  // New themed styling
  hudWood: {
    borderBottomWidth: 2,
    borderBottomColor: '#5C4033',
    backgroundColor: '#2C1A11',
  },
  hudNeon: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#00FFFF',
    backgroundColor: '#05050C',
  },
  hudGold: {
    borderBottomWidth: 2,
    borderBottomColor: '#D4AC0D',
    backgroundColor: '#1C120C',
  },
  iqCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iqCardWood: {
    backgroundColor: '#3D2314',
    borderWidth: 2,
    borderColor: '#5C4033',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  iqCardNeon: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: '#00FFFF',
    borderRadius: 16,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  iqCardGold: {
    backgroundColor: '#251912',
    borderWidth: 2,
    borderColor: '#D4AC0D',
    borderRadius: 16,
    shadowColor: '#D4AC0D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarWood: {
    backgroundColor: '#5C4033',
    borderWidth: 1.5,
    borderColor: '#CD853F',
  },
  avatarNeon: {
    backgroundColor: '#05050C',
    borderWidth: 1.5,
    borderColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  avatarGold: {
    backgroundColor: '#1C120C',
    borderWidth: 1.5,
    borderColor: '#D4AC0D',
  },
  avatarEmoji: {
    fontSize: 15,
  },
  iqProgressColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  iqText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: '#3498DB',
  },
  hudRightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    paddingLeft: 2,
  },
  scoreTextNew: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  levelLineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  hudLabelNew: {
    fontSize: 9,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  sideCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '90%',
    minWidth: 62,
  },
  sideCardWood: {
    backgroundColor: '#F5DEB3', // light wood
    borderWidth: 2.5,
    borderColor: '#5C4033', // dark wood border
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  sideCardNeon: {
    backgroundColor: 'rgba(0, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: '#00FFFF',
    borderRadius: 12,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  sideCardGold: {
    backgroundColor: '#251912',
    borderWidth: 2,
    borderColor: '#D4AC0D',
    borderRadius: 12,
    shadowColor: '#D4AC0D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  sideLabelNew: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  sideValNew: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  nextBoxNew: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBoxWood: {
    backgroundColor: '#23140C',
  },
  nextBoxNeon: {
    backgroundColor: '#05050C',
  },
  nextBoxGold: {
    backgroundColor: '#1C120C',
  },
  legendWood: {
    backgroundColor: '#3D2314',
    borderColor: '#5C4033',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  legendNeon: {
    backgroundColor: 'rgba(0, 255, 255, 0.01)',
    borderColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
  },
  legendGold: {
    backgroundColor: '#251912',
    borderColor: '#D4AC0D',
    borderWidth: 2,
  },

  // Premium Store-Screenshot exact styling rules
  gameTitle: {
    fontSize: 22,
    fontWeight: '950',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 3,
    color: '#fff',
  },
  gameTitleWood: {
    color: '#F5DEB3',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Wood HUD Card
  hudWoodContainer: {
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  hudWoodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5DEB3', // Light birch wood background
    borderWidth: 3,
    borderColor: '#5C4033', // Dark wood frame
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  hudWoodAvatarCol: {
    alignItems: 'center',
    marginRight: 10,
    width: 60,
  },
  hudWoodAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEDC82',
    borderWidth: 2.5,
    borderColor: '#5C4033',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  hudWoodAvatarEmoji: {
    fontSize: 24,
  },
  hudWoodAvatarBanner: {
    backgroundColor: '#5C4033',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 3,
    width: '100%',
    alignItems: 'center',
  },
  hudWoodAvatarName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#F5DEB3',
  },
  hudWoodStatsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  hudWoodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  hudWoodText: {
    fontSize: 13,
    color: '#3D2314',
  },
  hudWoodLevelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  hudWoodScoreLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  hudWoodScoreVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3D2314',
  },
  hudWoodProgressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D2B48C', // recessed brown progress track
    borderWidth: 1,
    borderColor: '#C49A6C',
    overflow: 'hidden',
    marginRight: 6,
  },
  hudWoodProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFA500', // Gold/orange progress fill
  },
  hudWoodProgressPercent: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#3D2314',
    width: 24,
    textAlign: 'right',
  },

  // Bottom info bar inside board frame
  boardInfoBarWood: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#3D2314', // dark wood bar
    height: 36,
    borderTopWidth: 2.5,
    borderTopColor: '#5C4033',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  boardInfoTagWood: {
    backgroundColor: '#1E1008',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#5C4033',
  },
  boardInfoTextWood: {
    color: '#F5DEB3',
    fontSize: 9,
    fontWeight: '900',
  },

  // Bottom Controls
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
  },
  controlBtnWrapper: {
    alignItems: 'center',
  },
  controlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  controlBtnIcon: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  controlBtnLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
    color: 'rgba(255,255,255,0.5)',
  },
  controlBtnWood: {
    backgroundColor: '#F5DEB3', // Light wood button
    borderWidth: 3,
    borderColor: '#5C4033', // Dark wood border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  controlBtnNeon: {
    backgroundColor: '#05050C',
    borderColor: '#00FFFF',
    borderWidth: 2,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  controlBtnGold: {
    backgroundColor: '#CA9B1B',
    borderColor: '#D4AC0D',
    borderWidth: 2,
    shadowColor: '#D4AC0D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
});
