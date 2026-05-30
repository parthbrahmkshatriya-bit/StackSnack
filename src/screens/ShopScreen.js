/**
 * ShopScreen.js — Themes / IAP
 *
 * FIX: Proper IAP error handling with purchaseUpdatedListener and
 * purchaseErrorListener. Edge cases covered:
 *   - Network error during purchase
 *   - Duplicate purchase (already owned)
 *   - Pending transactions on Android
 *   - Restore purchases (required for App Store approval)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  initConnection,
  getProducts,
  requestPurchase,
  finishTransaction,
  restorePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  IAPErrorCode,
} from 'react-native-iap';
import { useFocusEffect } from '@react-navigation/native';

import { THEMES, THEME_ORDER } from '../constants/themes';
import { IAP_PRODUCTS, IAP_TO_THEME } from '../constants/iap';
import {
  getOwnedThemes,
  addOwnedTheme,
  getActiveTheme,
  setActiveTheme,
} from '../utils/storage';
import { logEvent, Events } from '../utils/analytics';
import { useSound } from '../hooks/useSound';

export default function ShopScreen({ navigation }) {
  const [ownedThemes, setOwnedThemes] = useState(['theme_default']);
  const [activeThemeId, setActiveThemeId] = useState('theme_default');
  const [products, setProducts] = useState([]);
  const [purchasing, setPurchasing] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [iapReady, setIapReady] = useState(false);

  const { play } = useSound();

  // ── Load owned themes on focus ─────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      getOwnedThemes().then(setOwnedThemes);
      getActiveTheme().then(setActiveThemeId);
    }, [])
  );

  // ── Initialize IAP ────────────────────────────────────────────────────
  useEffect(() => {
    let purchaseUpdateSub;
    let purchaseErrorSub;

    async function setupIAP() {
      try {
        await initConnection();
        setIapReady(true);

        // Fetch product details (price, title) from the store
        const storeProducts = await getProducts({ skus: IAP_PRODUCTS });
        setProducts(storeProducts);

        // FIX: purchaseUpdatedListener handles successful purchases reliably
        // (including restored purchases and delayed confirmations on Android)
        purchaseUpdateSub = purchaseUpdatedListener(async (purchase) => {
          const themeId = IAP_TO_THEME[purchase.productId];
          if (!themeId) return;

          try {
            // CRITICAL: Must call finishTransaction or Google will refund
            await finishTransaction({ purchase, isConsumable: false });
            const updated = await addOwnedTheme(themeId);
            setOwnedThemes(updated);
            await setActiveTheme(themeId);
            setActiveThemeId(themeId);
            play('purchase');
            logEvent(Events.IAP_PURCHASE_SUCCESS, { productId: purchase.productId });
            Alert.alert('Theme Unlocked! 🎉', `${THEMES[themeId].name} is now active.`);
          } catch (e) {
            console.warn('finishTransaction error:', e);
          } finally {
            setPurchasing(null);
          }
        });

        // FIX: purchaseErrorListener catches all IAP failure modes
        purchaseErrorSub = purchaseErrorListener((error) => {
          setPurchasing(null);
          logEvent(Events.IAP_PURCHASE_FAILED, { code: error.code });

          if (error.code === IAPErrorCode.E_USER_CANCELLED) return; // Silent cancel

          if (error.code === IAPErrorCode.E_ALREADY_OWNED) {
            // Edge case: user already owns it (restore needed)
            handleRestore();
            return;
          }

          Alert.alert(
            'Purchase Failed',
            'Something went wrong. Please try again.',
            [{ text: 'OK' }]
          );
        });
      } catch (e) {
        console.warn('IAP init failed:', e);
        // IAP unavailable (no Google Play, emulator, etc.) — show price from constants
      }
    }

    setupIAP();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
    };
  }, []);

  // ── Buy theme ─────────────────────────────────────────────────────────
  const handleBuy = useCallback(
    async (themeId) => {
      const theme = THEMES[themeId];
      if (!theme?.iapId || !iapReady) return;
      logEvent(Events.IAP_PURCHASE_STARTED, { productId: theme.iapId });
      setPurchasing(themeId);
      try {
        await requestPurchase({ sku: theme.iapId });
        // Result comes via purchaseUpdatedListener above
      } catch (e) {
        // purchaseErrorListener will handle this
      }
    },
    [iapReady]
  );

  // ── Activate theme ────────────────────────────────────────────────────
  const handleActivate = useCallback(async (themeId) => {
    await setActiveTheme(themeId);
    setActiveThemeId(themeId);
    logEvent(Events.THEME_CHANGED, { themeId });
  }, []);

  // ── Restore purchases (required for App Store approval) ───────────────
  const handleRestore = useCallback(async () => {
    setRestoring(true);
    logEvent(Events.IAP_RESTORE);
    try {
      const purchases = await restorePurchases();
      let restoredAny = false;
      for (const p of purchases) {
        const themeId = IAP_TO_THEME[p.productId];
        if (themeId) {
          await addOwnedTheme(themeId);
          restoredAny = true;
        }
      }
      const updated = await getOwnedThemes();
      setOwnedThemes(updated);
      Alert.alert(
        restoredAny ? 'Purchases Restored' : 'Nothing to Restore',
        restoredAny ? 'Your themes have been restored.' : 'No previous purchases found.'
      );
    } catch (e) {
      Alert.alert('Restore Failed', 'Could not restore purchases. Try again.');
    } finally {
      setRestoring(false);
    }
  }, []);

  // Get store price for a product (falls back to constants price)
  const getPrice = (themeId) => {
    const theme = THEMES[themeId];
    if (!theme?.iapId) return 'FREE';
    const product = products.find((p) => p.productId === theme.iapId);
    if (product) return product.localizedPrice;
    return `₹${theme.price}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎨 THEMES</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {THEME_ORDER.map((themeId) => {
          const theme = THEMES[themeId];
          const owned = ownedThemes.includes(themeId);
          const active = activeThemeId === themeId;
          const isBuying = purchasing === themeId;

          return (
            <View
              key={themeId}
              style={[
                styles.card,
                { backgroundColor: theme.background },
                active && styles.cardActive,
              ]}
            >
              {/* Color preview */}
              <View style={styles.colorRow}>
                {theme.preview.map((c, i) => (
                  <View key={i} style={[styles.colorSwatch, { backgroundColor: c }]} />
                ))}
              </View>

              <Text style={[styles.themeName, { color: theme.uiText }]}>
                {theme.name}
              </Text>

              {active && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}

              {owned && !active && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.accent }]}
                  onPress={() => handleActivate(themeId)}
                >
                  <Text style={[styles.actionBtnText, { color: theme.accent }]}>
                    USE
                  </Text>
                </TouchableOpacity>
              )}

              {!owned && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.buyBtn, { backgroundColor: theme.accent }]}
                  onPress={() => handleBuy(themeId)}
                  disabled={isBuying || !iapReady}
                >
                  {isBuying ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.buyBtnText}>{getPrice(themeId)}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Restore purchases — required by App Store */}
      <TouchableOpacity
        style={styles.restoreBtn}
        onPress={handleRestore}
        disabled={restoring}
      >
        {restoring ? (
          <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
        ) : (
          <Text style={styles.restoreBtnText}>Restore Purchases</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 10,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: '#F39C12',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  activeBadge: {
    backgroundColor: '#F39C12',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buyBtn: {
    borderWidth: 0,
    minHeight: 36,
    justifyContent: 'center',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  restoreBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
