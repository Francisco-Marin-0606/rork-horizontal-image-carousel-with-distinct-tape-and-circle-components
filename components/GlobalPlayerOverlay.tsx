import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '@/providers/PlayerProvider';
import type { AlbumData } from '@/types/music';
import { hapticImpact, hapticSelection } from '@/utils/haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VINYL_URL_1 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Vinilo1.png' as const;
const VINYL_URL_2 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Vinilo2.png' as const;
const COVER_URL_1 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers.png' as const;
const COVER_URL_2 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers2.png' as const;
const COVER_URL_3 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers1.png' as const;

const WaveText: React.FC<{ text: string; style: any; delayPerWord?: number; duration?: number; testID?: string }> = React.memo(({ text, style, delayPerWord = 91, duration = 676, testID }) => {
  const words = useMemo(() => (text ?? '').split(/\s+/).filter(Boolean), [text]);
  const anims = useRef(words.map(() => new Animated.Value(0))).current;
  const running = useRef<Animated.CompositeAnimation[] | null>(null);

  useEffect(() => {
    if (running.current) {
      try { running.current.forEach(a => a.stop()); } catch {}
      running.current = null;
    }
    anims.forEach(v => v.setValue(0));
    const animations = anims.map((v, i) =>
      Animated.timing(v, { toValue: 1, duration, delay: i * delayPerWord, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true })
    );
    running.current = animations;
    Animated.stagger(Math.max(10, Math.floor(delayPerWord * 0.6)), animations).start(({ finished }) => {
      if (finished) running.current = null;
    });

    return () => {
      if (running.current) {
        try { running.current.forEach(a => a.stop()); } catch {}
        running.current = null;
      }
    };
  }, [text, words, anims, delayPerWord, duration]);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }} testID={testID}>
      {words.map((w, i) => {
        const t = anims[i] ?? new Animated.Value(0);
        const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
        const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
        return (
          <Animated.Text key={`${w}-${i}`} style={[style, { transform: [{ translateY }], opacity, marginRight: 6 }]}>
            {w}
          </Animated.Text>
        );
      })}
    </View>
  );
});

const CoverWithVinyl: React.FC<{ imageSize: number; spinActive?: boolean; vinylUrl?: string; coverUrl?: string }> = React.memo(({ imageSize, spinActive, vinylUrl, coverUrl }) => {
  const vinylSize = useMemo(() => Math.floor(imageSize * 0.7), [imageSize]);
  const vinylLeft = useMemo(() => Math.floor(imageSize - vinylSize / 2), [imageSize, vinylSize]);
  const vinylTop = useMemo(() => Math.floor((imageSize - vinylSize) / 2), [imageSize, vinylSize]);

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (spinActive) {
      const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
      spin.setValue(0);
      loop.start();
      return () => { spin.stopAnimation(); };
    } else {
      spin.stopAnimation();
      spin.setValue(0);
    }
  }, [spinActive, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ position: 'relative', width: imageSize, height: imageSize }}>
      <Animated.Image
        source={{ uri: vinylUrl ?? VINYL_URL_1 }}
        style={{ position: 'absolute', width: vinylSize, height: vinylSize, left: vinylLeft, top: vinylTop, transform: [{ rotate }] }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        testID={`vinyl-bg`}
      />
      <View style={{ width: imageSize, height: imageSize, borderRadius: 12, overflow: 'hidden', zIndex: 2 }}>
        <Image
          source={{ uri: coverUrl ?? COVER_URL_1 }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessible
          accessibilityLabel={`Imagen del álbum`}
        />
      </View>
    </View>
  );
});

const ArrowIcon: React.FC<{ direction: 'next' | 'prev'; size?: number; testID?: string }> = ({ direction, size = 34, testID }) => {
  const uri = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' as const;
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, tintColor: '#fff', transform: [{ scaleX: direction === 'prev' ? -1 : 1 }] }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      testID={testID}
    />
  );
};

function useImageUrls() {
  const getVinylUrlById = useCallback((id?: string | null) => {
    const n = Number(id);
    if (Number.isFinite(n)) return n % 2 === 0 ? VINYL_URL_2 : VINYL_URL_1;
    return VINYL_URL_1;
  }, []);
  const getCoverUrlById = useCallback((id?: string | null) => {
    const n = Number(id);
    if (Number.isFinite(n)) {
      const idx = ((n - 1) % 3 + 3) % 3;
      return [COVER_URL_1, COVER_URL_2, COVER_URL_3][idx];
    }
    return COVER_URL_1;
  }, []);
  return { getVinylUrlById, getCoverUrlById };
}

export default function GlobalPlayerOverlay() {
  const { uiOpen, setUIOpen, current, previous, changeDirection, isPlaying, userPaused, next, prev, pause, play } = usePlayer();
  const [visible, setVisible] = useState<boolean>(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (uiOpen) setVisible(true);
    else setVisible(false);
  }, [uiOpen]);

  const sheetHeight = Math.floor(screenHeight * 0.8);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const offsetUp = Math.floor(sheetHeight * 0.12);
  const offsetLeft = Math.floor(screenWidth * 0.03);

  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean>(false);
  const optTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armOptimistic = useCallback((ms: number = 700) => {
    setOptimisticPlaying(true);
    if (optTimer.current) clearTimeout(optTimer.current);
    optTimer.current = setTimeout(() => setOptimisticPlaying(false), ms);
  }, []);
  useEffect(() => () => { if (optTimer.current) clearTimeout(optTimer.current); }, []);

  const nextRef = useRef(next);
  const prevRef = useRef(prev);
  useEffect(() => { nextRef.current = next; }, [next]);
  useEffect(() => { prevRef.current = prev; }, [prev]);

  const slideProg = useRef(new Animated.Value(1)).current;
  const initialFade = useRef(new Animated.Value(0)).current;
  const [textKey, setTextKey] = useState<number>(0);
  useEffect(() => {
    if (!current) return;
    setTextKey((k) => k + 1);
    if (!previous || changeDirection === 'none') {
      initialFade.setValue(0);
      Animated.timing(initialFade, { toValue: 1, duration: Math.floor(1092 * 0.7), easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
      return;
    }
    slideProg.setValue(0);
    Animated.timing(slideProg, { toValue: 1, duration: Math.floor(1310 * 0.7), easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [current, previous, changeDirection, slideProg, initialFade]);

  useEffect(() => {
    if (previous && changeDirection !== 'none' && !userPaused) {
      armOptimistic(750);
    }
  }, [previous, changeDirection, userPaused, armOptimistic]);

  const open = useCallback(() => {
    const smooth = Easing.bezier(0.22, 1, 0.36, 1);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: Math.floor(1229 * 0.7), easing: smooth, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 1, duration: Math.floor(1065 * 0.7), easing: smooth, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: Math.floor(1106 * 0.7), easing: smooth, useNativeDriver: false }),
    ]).start();
  }, [translateY, backdrop, contentOpacity]);

  const close = useCallback(() => {
    const smoothIn = Easing.bezier(0.4, 0, 0.2, 1);
    Animated.parallel([
      Animated.timing(translateY, { toValue: sheetHeight, duration: Math.floor(1065 * 0.7), easing: smoothIn, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: Math.floor(983 * 0.7), easing: smoothIn, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: Math.floor(983 * 0.7), easing: smoothIn, useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (finished) setUIOpen(false);
    });
  }, [translateY, backdrop, sheetHeight, contentOpacity, setUIOpen]);

  const isSwipingHoriz = useRef<boolean>(false);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => {
        if (isSwipingHoriz.current) return false;
        const verticalIntent = Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 6;
        return verticalIntent;
      },
      onMoveShouldSetPanResponder: (_e, g) => {
        if (isSwipingHoriz.current) return false;
        const verticalIntent = Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx);
        return verticalIntent;
      },
      onPanResponderMove: (_e, g) => {
        if (isSwipingHoriz.current) return;
        const nextY = Math.max(0, g.dy);
        translateY.setValue(nextY);
        const prog = Math.min(1, nextY / sheetHeight);
        backdrop.setValue(1 - prog);
        contentOpacity.setValue(prog);
      },
      onPanResponderRelease: (_e, g) => {
        if (isSwipingHoriz.current) return;
        const shouldClose = g.dy > 120 || g.vy > 0.9;
        if (shouldClose) {
          hapticSelection();
          close();
        } else {
          Animated.parallel([
            Animated.timing(translateY, { toValue: 0, duration: 737, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
            Animated.timing(backdrop, { toValue: 1, duration: 697, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
            Animated.timing(contentOpacity, { toValue: 0, duration: 655, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false })
          ]).start();
        }
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  useEffect(() => {
    if (visible) open();
  }, [visible, open]);

  const swipeLockRef = useRef<boolean>(false);
  const swipeX = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = 12 as const;
  const SWIPE_VELOCITY = 0.2 as const;
  const coverSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy) * 0.7 && Math.abs(g.dx) > 3,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy) * 0.75 && Math.abs(g.dx) > 3,
      onPanResponderGrant: () => { isSwipingHoriz.current = true; hapticSelection(); },
      onPanResponderMove: (_e, g) => {
        if (!isSwipingHoriz.current) return;
        const damp = 0.9;
        const val = Math.max(-screenWidth, Math.min(screenWidth, g.dx * damp));
        swipeX.setValue(val);
        if (!swipeLockRef.current) {
          const distance = Math.abs(g.dx);
          const velocity = Math.abs(g.vx);
          const commit = distance >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY;
          if (commit) {
            swipeLockRef.current = true;
            const goingNext = g.dx < 0;
            hapticImpact('rigid');
            armOptimistic(800);
            if (goingNext) next().catch(() => {}); else prev().catch(() => {});
            setTimeout(() => { swipeLockRef.current = false; }, 500);
          }
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: () => { isSwipingHoriz.current = false; Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start(); },
      onPanResponderTerminate: () => { isSwipingHoriz.current = false; Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start(); },
      onPanResponderEnd: () => { isSwipingHoriz.current = false; Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start(); },
    })
  ).current;

  const displayPlaying = (isPlaying || optimisticPlaying);
  const spinActive = displayPlaying && current?.id != null;

  const prevBaseColor = previous?.color ?? '#063536';
  const currBaseColor = current?.color ?? '#EA580C';
  const darkenColor = useCallback((hex: string, factor: number) => {
    try {
      const cleaned = hex.replace('#', '');
      const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
      const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255;
      const nr = Math.max(0, Math.min(255, Math.floor(r * factor)));
      const ng = Math.max(0, Math.min(255, Math.floor(g * factor)));
      const nb = Math.max(0, Math.min(255, Math.floor(b * factor)));
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
    } catch { return hex; }
  }, []);
  const prevColor = useMemo(() => darkenColor(prevBaseColor, 0.5), [prevBaseColor, darkenColor]);
  const currColor = useMemo(() => darkenColor(currBaseColor, 0.5), [currBaseColor, darkenColor]);

  const { getVinylUrlById, getCoverUrlById } = useImageUrls();
  const imageSize = Math.max(120, Math.min(260, Math.floor(screenWidth * 0.58)));
  const upShift = (previous && changeDirection !== 'none') ? -Math.floor(sheetHeight * 0.12) : 0;
  const leftShift = Math.floor(screenWidth * 0.03);

  if (!visible || !current) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="global-player-overlay-root">
      <Animated.View testID="global-player-backdrop" style={[styles.backdrop, { opacity: backdrop.interpolate({ inputRange: [0,1], outputRange: [0,1] }) }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={async () => { await hapticSelection(); close(); }} testID="global-player-backdrop-touch" />
      </Animated.View>

      <Animated.View {...panResponder.panHandlers} style={[styles.sheetContainer, { height: sheetHeight, transform: [{ translateY }] }]} testID="global-player-sheet">
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && changeDirection !== 'none' ? slideProg.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 0 }]}>
            <LinearGradient colors={[prevColor, prevColor, '#000000']} locations={[0, 0.02, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && changeDirection !== 'none' ? slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) : initialFade }]}>
            <LinearGradient colors={[currColor, currColor, '#000000']} locations={[0, 0.02, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>

        <View style={styles.sheetGrabberRow}><View style={styles.grabber} /></View>

        <View style={styles.sheetContent} testID="global-player-swipe-zone" accessible accessibilityLabel="Swipe zone">
          <View style={[styles.centerZone, (changeDirection === 'none') ? { paddingTop: Math.floor(sheetHeight * 0.06) } : null]}>
            <View {...coverSwipeResponder.panHandlers} style={[styles.centerBlock, { transform: [{ translateY: upShift }, { translateX: leftShift }] }]} testID="global-player-cover-swipe-surface" accessible accessibilityLabel="Swipe horizontal para cambiar de canción">
              {(() => {
                const imageOffsetDown = Math.floor((imageSize ?? 160) * 0.03);
                const dir = changeDirection;
                const outTo = dir === 'next' ? -screenWidth : screenWidth;
                const inFrom = dir === 'next' ? screenWidth : -screenWidth;
                const prevTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, outTo] });
                const currTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [inFrom, 0] });
                const shouldAnimate = !!previous && dir !== 'none';

                if (shouldAnimate) {
                  return (
                    <View>
                      <Animated.View style={[styles.coverRow, { width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignSelf: 'center', alignItems: 'flex-start', transform: [{ translateY: imageOffsetDown }, { translateX: prevTranslate }], opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} testID="global-player-cover-previous">
                        <CoverWithVinyl imageSize={imageSize ?? 160} spinActive={false} vinylUrl={getVinylUrlById(previous?.id)} coverUrl={getCoverUrlById(previous?.id)} />
                        <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                          <Text style={styles.centerTitle} numberOfLines={2} ellipsizeMode="tail">{previous?.title ?? ''}</Text>
                          <Text style={styles.centerSubtitle} numberOfLines={2}>{previous?.subtitle ?? ''}</Text>
                        </View>
                      </Animated.View>
                      <Animated.View style={[styles.coverRow, StyleSheet.absoluteFillObject as any, { width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignSelf: 'center', alignItems: 'flex-start', transform: [{ translateY: imageOffsetDown }, { translateX: currTranslate }], opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]} testID="global-player-cover-current">
                        <CoverWithVinyl imageSize={imageSize ?? 160} spinActive={spinActive} vinylUrl={getVinylUrlById(current?.id ?? undefined)} coverUrl={getCoverUrlById(current?.id ?? undefined)} />
                        <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                          <WaveText key={`title-${textKey}`} text={current?.title ?? ''} style={styles.centerTitle} testID="global-wave-title" />
                          <WaveText key={`subtitle-${textKey}`} text={current?.subtitle ?? ''} style={styles.centerSubtitle} testID="global-wave-subtitle" />
                        </View>
                      </Animated.View>
                    </View>
                  );
                }

                const pagerRef = React.createRef<ScrollView>();
                const pageWidth = screenWidth;

                const renderPage = (kind: 'prev' | 'current' | 'next') => {
                  const vinylUrl = getVinylUrlById(kind === 'prev' ? previous?.id : current?.id);
                  const coverUrl = getCoverUrlById(kind === 'prev' ? previous?.id : current?.id);
                  const title = kind === 'prev' ? (previous?.title ?? '') : (current?.title ?? '');
                  const subtitle = kind === 'prev' ? (previous?.subtitle ?? '') : (current?.subtitle ?? '');

                  return (
                    <View key={kind} style={{ width: pageWidth, alignItems: 'center' }} testID={`global-pager-page-${kind}`}>
                      <View style={{ width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignItems: 'flex-start' }}>
                        <View style={{ transform: [{ translateY: imageOffsetDown }] }}>
                          <CoverWithVinyl imageSize={imageSize ?? 160} spinActive={kind === 'current' ? spinActive : false} vinylUrl={vinylUrl} coverUrl={coverUrl} />
                        </View>
                        <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                          <WaveText key={`title-${textKey}-${kind}`} text={title} style={styles.centerTitle} testID={`global-pager-title-${kind}`} />
                          <WaveText key={`subtitle-${textKey}-${kind}`} text={subtitle} style={styles.centerSubtitle} testID={`global-pager-subtitle-${kind}`} />
                        </View>
                      </View>
                    </View>
                  );
                };

                const initialDownShift = (changeDirection === 'none') ? Math.floor(offsetUp * 0.9) : 0;
                return (
                  <View style={{ transform: [{ translateY: initialDownShift }] }}>
                    <ScrollView
                      ref={pagerRef}
                      horizontal
                      pagingEnabled
                      scrollEnabled={false}
                      showsHorizontalScrollIndicator={false}
                      contentOffset={{ x: pageWidth, y: 0 }}
                      onLayout={() => { setTimeout(() => pagerRef.current?.scrollTo?.({ x: pageWidth, y: 0, animated: false }), 0); }}
                      onContentSizeChange={() => { setTimeout(() => pagerRef.current?.scrollTo?.({ x: pageWidth, y: 0, animated: false }), 0); }}
                      testID="global-player-cover-pager"
                    >
                      {renderPage('prev')}
                      {renderPage('current')}
                      {renderPage('next')}
                    </ScrollView>
                  </View>
                );
              })()}
            </View>
            <View style={styles.controlsRow}>
              <View style={styles.controlsInner} testID="global-player-controls">
                <TouchableOpacity testID="global-btn-back" accessibilityRole="button" onPress={async () => { await hapticImpact('medium'); armOptimistic(800); prev(); }}>
                  <ArrowIcon direction="prev" size={38} testID="global-icon-prev" />
                </TouchableOpacity>
                <TouchableOpacity
                  testID="global-btn-toggle"
                  accessibilityRole="button"
                  style={styles.playButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={async () => {
                    await hapticImpact('medium');
                    if (displayPlaying) { await pause(); } else { await play(); }
                  }}
                  accessibilityLabel={displayPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {displayPlaying ? (
                    <Image source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png' }} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors testID="global-icon-pause" />
                  ) : (
                    <Image source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png?v=20250816' }} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors testID="global-icon-play" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity testID="global-btn-forward" accessibilityRole="button" onPress={async () => { await hapticImpact('light'); armOptimistic(800); next(); }}>
                  <ArrowIcon direction="next" size={38} testID="global-icon-next" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.moreFab} testID="global-btn-more" accessibilityRole="button" activeOpacity={0.8} onPress={async () => { await hapticSelection(); }}>
            <View style={styles.moreDot} />
            <View style={[styles.moreDot, { marginLeft: 4 }]} />
            <View style={[styles.moreDot, { marginLeft: 4 }]} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  sheetContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden' },
  sheetGrabberRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  sheetContent: { flex: 1, paddingHorizontal: 0, paddingTop: 16 },
  centerZone: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerBlock: { alignItems: 'center', justifyContent: 'center' },
  centerTextBlock: { marginTop: 12, alignItems: 'flex-start', paddingHorizontal: 0 },
  centerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'left' },
  centerSubtitle: { color: '#94a3b8', fontSize: 16, lineHeight: 18, marginTop: 6, textAlign: 'left' },
  controlsRow: { position: 'absolute', left: 0, right: 0, bottom: 140, alignItems: 'center', justifyContent: 'center' },
  playButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  coverRow: { paddingHorizontal: 0 },
  moreFab: { position: 'absolute', right: 24, bottom: 28, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  moreDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#64748B' },
  controlsInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '64%', alignSelf: 'center' },
});