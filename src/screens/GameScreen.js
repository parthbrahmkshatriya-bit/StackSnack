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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { STORAGE_KEYS } from '../constants/game';
import { THEMES } from '../constants/themes';

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

const randPiece = () => {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    cells: p.cells.map(c => [...c]),
    color: p.color,
    x: Math.floor(COLS / 2) - 2,
    y: -1,
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

  // Single ref for ALL mutable game state — no stale-closure problems
  const G = useRef({
    board: newBoard(),
    cur: randPiece(),
    nxt: randPiece(),
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
      g.nxt = randPiece();
      // Check game over: new piece spawns into occupied space
      if (!isValid(g.cur.cells, g.cur.x, g.cur.y, g.board)) {
        g.gameOver = true;
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
        g.cur.x--; redraw();
      }
    },

    moveRight() {
      const g = G.current;
      if (g.gameOver || g.paused || g.flashRows.length) return;
      if (isValid(g.cur.cells, g.cur.x + 1, g.cur.y, g.board)) {
        g.cur.x++; redraw();
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

    return () => {
      clearTimeout(G.current.dropTimer);
      clearTimeout(G.current.flashTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── DAS (Delayed Auto Shift) for hold-to-repeat ──────────────────────────
  const leftHoldRef = useRef(null);
  const leftRepeatRef = useRef(null);
  const rightHoldRef = useRef(null);
  const rightRepeatRef = useRef(null);

  const startHold = useCallback((dir) => {
    const fn = () => dir === 'L' ? L.current.moveLeft() : L.current.moveRight();
    fn();
    if (dir === 'L') {
      clearTimeout(leftHoldRef.current);
      clearInterval(leftRepeatRef.current);
      leftHoldRef.current = setTimeout(() => {
        leftRepeatRef.current = setInterval(fn, 80);
      }, 200);
    } else {
      clearTimeout(rightHoldRef.current);
      clearInterval(rightRepeatRef.current);
      rightHoldRef.current = setTimeout(() => {
        rightRepeatRef.current = setInterval(fn, 80);
      }, 200);
    }
  }, []);

  const stopHold = useCallback((dir) => {
    if (dir === 'L') {
      clearTimeout(leftHoldRef.current);
      clearInterval(leftRepeatRef.current);
    } else {
      clearTimeout(rightHoldRef.current);
      clearInterval(rightRepeatRef.current);
    }
  }, []);

  const togglePause = useCallback(() => {
    const g = G.current;
    if (g.gameOver) return;
    g.paused = !g.paused;
    setIsPaused(g.paused);
    if (!g.paused) {
      L.current.scheduleDrop();
      redraw();
    } else {
      clearTimeout(g.dropTimer);
    }
  }, []);

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
    });

    // Next piece 4×4 preview grid
    const mini = Array.from({ length: 4 }, () => Array(4).fill(null));
    nxt.cells.forEach(([cx, cy]) => {
      if (cy < 4 && cx < 4) mini[cy][cx] = nxt.color;
    });

    return { displayBoard: display, nxtDisplay: mini };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]); // tick is the gate — game state is in refs, re-computed on each tick

  const g = G.current;
  const MINI = 14; // mini-cell size in next-piece preview

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background || '#1A1A2E',
          paddingTop: insets.top,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* ── HUD ─────────────────────────────────────────────────────────── */}
      <View style={styles.hud}>
        <TouchableOpacity onPress={togglePause} style={styles.pauseBtn}>
          <Text style={styles.pauseIcon}>{isPaused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
        <Text style={styles.scoreText}>{g.score}</Text>
        <View style={styles.hudRight}>
          <Text style={styles.hudLabel}>LV {g.level + 1}</Text>
          <Text style={styles.hudLabel}>{g.lines}L</Text>
        </View>
      </View>

      {/* ── Board + Side panel ───────────────────────────────────────────── */}
      <View style={styles.gameRow}>
        {/* Main 10×20 board */}
        <View
          style={[
            styles.board,
            { width: BOARD_W, height: BOARD_H, marginLeft: BOARD_ML },
          ]}
        >
          {displayBoard.map((row, r) => (
            <View key={r} style={styles.boardRow}>
              {row.map((cell, c) => (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    { width: CELL, height: CELL },
                    cell && !cell.ghost
                      ? { backgroundColor: cell.color, borderColor: 'rgba(0,0,0,0.3)' }
                      : cell && cell.ghost
                      ? {
                          backgroundColor: cell.color,
                          opacity: 0.18,
                          borderColor: 'transparent',
                        }
                      : {
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          borderColor: 'rgba(255,255,255,0.04)',
                        },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Side panel: next piece + stats */}
        <View style={styles.sidePanel}>
          <Text style={styles.sideLabel}>NEXT</Text>
          <View style={styles.nextBox}>
            {nxtDisplay.map((row, r) => (
              <View key={r} style={{ flexDirection: 'row' }}>
                {row.map((cell, c) => (
                  <View
                    key={c}
                    style={{
                      width: MINI,
                      height: MINI,
                      backgroundColor: cell || 'transparent',
                      margin: 0.5,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          <Text style={styles.sideStat}>BEST</Text>
          <Text style={styles.sideStatVal}>{g.bestScore}</Text>

          <Text style={styles.sideStat}>COMBO</Text>
          <Text style={[styles.sideStatVal, { color: '#F39C12' }]}>
            {g.combo > 1 ? `×${g.combo}` : '—'}
          </Text>
        </View>
      </View>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={styles.ctrlBtn}
          onPressIn={() => startHold('L')}
          onPressOut={() => stopHold('L')}
          activeOpacity={0.7}
        >
          <Text style={styles.ctrlIcon}>◀</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={() => L.current.rotate()}
          activeOpacity={0.7}
        >
          <Text style={styles.ctrlIcon}>↻</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          onPressIn={() => startHold('R')}
          onPressOut={() => stopHold('R')}
          activeOpacity={0.7}
        >
          <Text style={styles.ctrlIcon}>▶</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, styles.ctrlDrop]}
          onPress={() => L.current.hardDrop()}
          activeOpacity={0.7}
        >
          <Text style={styles.ctrlIcon}>▼▼</Text>
        </TouchableOpacity>
      </View>

      {/* ── Pause overlay ─────────────────────────────────────────────────── */}
      {isPaused && (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseTitle}>PAUSED</Text>
          <TouchableOpacity style={styles.pauseResumeBtn} onPress={togglePause}>
            <Text style={styles.pauseResumeTxt}>RESUME</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pauseHomeBtn}
            onPress={() => navigation.replace('Home')}
          >
            <Text style={styles.pauseHomeTxt}>HOME</Text>
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

  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    height: 90,
  },
  ctrlBtn: {
    width: 72,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ctrlDrop: { backgroundColor: 'rgba(52,152,219,0.25)' },
  ctrlIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },

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
});
