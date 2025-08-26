import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, PanResponder, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { usePlayer } from "@/providers/PlayerProvider";
import { hapticSelection } from "@/utils/haptics";

const COVER_URL_1 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers.png' as const;
const COVER_URL_2 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers2.png' as const;
const COVER_URL_3 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers1.png' as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function StickyPlayer() {
  const { current, previous, changeDirection, userPaused, isPlaying, next, prev, uiOpen, setUIOpen, pause, play } = usePlayer();

  const coverUrl = useMemo(() => {
    const raw = current?.id ?? '';
    const base = raw ? String(raw).split('-')[0] : '';
    const n = Number(base);
    if (Number.isFinite(n)) {
      const idx = ((n - 1) % 3 + 3) % 3;
      return [COVER_URL_1, COVER_URL_2, COVER_URL_3][idx];
    }
    return COVER_URL_1;
  }, [current?.id]);

  // Anti-flicker: reproducción optimista en cambios de track
  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean>(false);
  const optTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armOptimistic = useCallback((ms: number = 700) => {
    setOptimisticPlaying(true);
    if (optTimer.current) clearTimeout(optTimer.current);
    optTimer.current = setTimeout(() => setOptimisticPlaying(false), ms);
  }, []);
  useEffect(() => {
    return () => { if (optTimer.current) clearTimeout(optTimer.current); };
  }, []);

  const TAB_BAR_HEIGHT = 84 as const;
  const slideY = useRef(new Animated.Value(TAB_BAR_HEIGHT + 24)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const dragDY = useRef(new Animated.Value(0)).current;
  const draggingRef = useRef<boolean>(false);

  useEffect(() => {
    const shouldShow = !!current && !uiOpen && !dismissed;

    // Prevent stale animations from finishing and overriding final values
    try { slideY.stopAnimation(); } catch {}
    try { opacity.stopAnimation?.(); } catch {}

    if (shouldShow) {
      dragDY.setValue(0);
      opacity.setValue(1);
      Animated.timing(slideY, { toValue: 0, duration: 350, easing: (t)=>t, useNativeDriver: true }).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: TAB_BAR_HEIGHT + 24, duration: 225, easing: (t)=>t, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 150, easing: (t)=>t, useNativeDriver: true }),
      ]).start();
    }
  }, [current, uiOpen, dismissed, slideY, opacity, dragDY]);

  useEffect(() => {
    const shouldOptimistic = previous && changeDirection !== 'none' && !userPaused && (isPlaying || optimisticPlaying);
    if (shouldOptimistic) {
      armOptimistic(750);
    }
  }, [previous, changeDirection, userPaused, isPlaying, optimisticPlaying, armOptimistic]);

  useEffect(() => {
    if (!isPlaying) {
      setOptimisticPlaying(false);
    }
  }, [isPlaying]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_evt, gestureState) => {
      const shouldSet = Math.abs(gestureState.dy) > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      return shouldSet;
    },
    onPanResponderGrant: () => {
      try { console.log('[ui] sticky pan start'); } catch {}
      draggingRef.current = true;
      slideY.stopAnimation();
      opacity.stopAnimation?.();
      dragDY.setValue(0);
    },
    onPanResponderMove: Animated.event([null, { dy: dragDY }], { useNativeDriver: true }),
    onPanResponderRelease: (_evt, gestureState) => {
      draggingRef.current = false;
      const dy = Math.max(0, gestureState.dy);
      const vy = gestureState.vy ?? 0;
      const dismiss = dy > 40 || vy > 1.2;
      if (dismiss) {
        try { console.log('[ui] sticky dismissed via swipe', { dy, vy }); } catch {}
        Animated.parallel([
          Animated.timing(slideY, { toValue: TAB_BAR_HEIGHT + 24, duration: 140, easing: (t)=>t, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 110, easing: (t)=>t, useNativeDriver: true }),
        ]).start(async () => {
          setDismissed(true);
          await pause();
        });
      } else {
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
        opacity.setValue(1);
      }
      dragDY.setValue(0);
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => {
      draggingRef.current = false;
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
      opacity.setValue(1);
      dragDY.setValue(0);
    },
  }), [dragDY, opacity, pause, slideY]);

  const translateY = useMemo(() => {
    return Animated.add(slideY, dragDY.interpolate({ inputRange: [-200, 0, 300], outputRange: [0, 0, 300], extrapolate: 'clamp' }));
  }, [slideY, dragDY]);

  const displayPlaying = isPlaying || optimisticPlaying;

  if (!current) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <AnimatedPressable
          {...panResponder.panHandlers}
          onPress={async () => { if (draggingRef.current) return; try { console.log('[ui] sticky open player'); } catch {}; await hapticSelection(); setUIOpen(true); }}
          onLayout={(e) => {
            try { console.log('[ui] sticky layout', e.nativeEvent.layout.height); } catch {}
            setContainerHeight(e.nativeEvent.layout.height ?? null);
          }}
          style={[
            styles.container,
            {
              transform: [{ translateY }],
              opacity,
              paddingVertical: 11,
              borderRadius: containerHeight ? Math.max(0, 0.15 * containerHeight) : 24,
              bottom: TAB_BAR_HEIGHT + 16,
              zIndex: 10,
            },
          ]}
          testID="sticky-player"
        >
        <View style={styles.leftRow}>
          <Image
            source={{ uri: coverUrl }}
            style={styles.cover}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.title} numberOfLines={1} testID="sticky-title">
            {current?.title ?? ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={async () => { try { console.log('[ui] sticky prev track'); } catch {};
              if (isPlaying || optimisticPlaying) armOptimistic(800);
              await prev();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginRight: 28 }}
            testID="sticky-prev"
          >
            <Image
              source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }}
              style={{ width: 21, height: 21, tintColor: '#fff', transform: [{ scaleX: -1 as const }] }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={async () => { try { console.log('[ui] sticky toggle'); } catch {};
              if (displayPlaying) {
                setOptimisticPlaying(false);
                await pause();
              } else {
                armOptimistic(800);
                await play();
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="sticky-toggle"
          >
            {displayPlaying ? (
              <Image
                source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png' }}
                style={{ width: 21, height: 21 }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                testID="sticky-icon-pause"
              />
            ) : (
              <Image
                source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png?v=20250816' }}
                style={{ width: 21, height: 21 }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                testID="sticky-icon-play"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={async () => { try { console.log('[ui] sticky next track'); } catch {};
              if (isPlaying || optimisticPlaying) armOptimistic(800);
              await next();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginLeft: 28, marginRight: 12 }}
            testID="sticky-next"
          >
            <Image
              source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }}
              style={{ width: 21, height: 21, tintColor: '#fff' }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </TouchableOpacity>
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#161616',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS !== 'web' ? { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 } : null as any),
  },
  leftRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  cover: { width: 41, height: 41, borderRadius: 10 },
  title: { color: '#fff', fontSize: 17, fontWeight: '500', marginLeft: 10, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
