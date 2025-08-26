import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  Image,
  LayoutChangeEvent,
  TouchableOpacity,
  Animated,
  Easing,
  PanResponder,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { hapticImpact, hapticSelection } from "@/utils/haptics";
import { usePlayer } from "@/providers/PlayerProvider";
import type { AlbumData } from "@/types/music";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CARD_WIDTH = Math.round(screenWidth * 0.72 * 0.8);
const LEFT_PADDING = 20;
const ITEM_SPACING = 48;
const END_PADDING = Math.max(0, Math.floor(screenWidth - LEFT_PADDING - CARD_WIDTH));

const forYouData: AlbumData[] = [
  { id: "1", title: "Del miedo al amor", subtitle: "Aquí va un copy increíble que va a escribir Juan.", color: "#0ea5e9", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK9.mp3" },
  { id: "2", title: "Explosión de colores", subtitle: "Aquí va un copy increíble que va a escribir Juan.", color: "#a78bfa", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK8.mp3" },
  { id: "3", title: "Viaje astral", subtitle: "Aquí va un copy increíble que va a escribir Juan.", color: "#22c55e", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK7.mp3" },
];

const instrumentalData: AlbumData[] = [
  { id: "4", title: "Magnético", subtitle: "No atraes lo que quieres, atraes lo que eres.", color: "#f59e0b", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK6.mp3" },
  { id: "5", title: "Del cielo al mar", subtitle: "Aquí va un copy increíble que va a escribir Juan.", color: "#ef4444", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK5.mp3" },
  { id: "6", title: "Energía pura", subtitle: "Aquí va un copy increíble que va a escribir Juan.", color: "#06b6d4", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK4.mp3" },
  { id: "10", title: "Brisa Dorada", subtitle: "Instrumental cálido para fluir.", color: "#F97316", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK3.mp3" },
  { id: "11", title: "Horizonte", subtitle: "Texturas que inspiran foco.", color: "#22D3EE", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK2.mp3" },
];

const extraData: AlbumData[] = [
  { id: "7", title: "Frecuencias Alfa", subtitle: "Relaja y enfoca tu mente.", color: "#10b981", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK3.mp3" },
  { id: "8", title: "Frecuencias Beta", subtitle: "Energía y claridad mental.", color: "#3b82f6", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK10.mp3" },
  { id: "9", title: "Frecuencias Theta", subtitle: "Profunda introspección.", color: "#ec4899", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK1.mp3" },
  { id: "12", title: "Frecuencias Delta", subtitle: "Sueño profundo y reparación.", color: "#6366F1", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK9.mp3" },
  { id: "13", title: "Frecuencias Gamma", subtitle: "Claridad y creatividad elevada.", color: "#F43F5E", audioUrl: "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK8.mp3" },
];

type AlbumCardProps = { album: AlbumData; imageSize: number; onPress?: (a: AlbumData) => void };

type WaveTextProps = { text: string; style: any; delayPerWord?: number; duration?: number; testID?: string };

const WaveText: React.FC<WaveTextProps> = React.memo(({ text, style, delayPerWord = 91, duration = 676, testID }) => {
  const words = useMemo(() => (text ?? '').split(/\s+/).filter(Boolean), [text]);
  const anims = useRef(words.map(() => new Animated.Value(0))).current;
  const running = useRef<Animated.CompositeAnimation[] | null>(null);

  useEffect(() => {
    try { console.log('[ui] wave in', { words: words.length }); } catch {}
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

const VINYL_URL_1 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Vinilo1.png' as const;
const VINYL_URL_2 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Vinilo2.png' as const;

const COVER_URL_1 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers.png' as const;
const COVER_URL_2 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers2.png' as const;
const COVER_URL_3 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers1.png' as const;

const CoverWithVinyl: React.FC<{ imageSize: number; spinActive?: boolean; vinylUrl?: string; coverUrl?: string }> = React.memo(({ imageSize, spinActive, vinylUrl, coverUrl }) => {
  const vinylSize = useMemo(() => {
    const size = Math.floor(imageSize * 0.7);
    return size;
  }, [imageSize]);
  const vinylLeft = useMemo(() => {
    const left = Math.floor(imageSize - vinylSize / 2);
    return left;
  }, [imageSize, vinylSize]);
  const vinylTop = useMemo(() => {
    const t = Math.floor((imageSize - vinylSize) / 2);
    return t;
  }, [imageSize, vinylSize]);

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (spinActive) {
      const loop = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
      );
      spin.setValue(0);
      loop.start();
      return () => {
        spin.stopAnimation();
      };
    } else {
      spin.stopAnimation();
      spin.setValue(0);
    }
  }, [spinActive, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={{ position: "relative" as const, width: imageSize, height: imageSize }}>
      <Animated.Image
        source={{
          uri: vinylUrl ?? VINYL_URL_1,
        }}
        style={{ position: "absolute" as const, width: vinylSize, height: vinylSize, left: vinylLeft, top: vinylTop, transform: [{ rotate }] }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        testID={`vinyl-bg`}
      />
      <View style={{ width: imageSize, height: imageSize, borderRadius: 12, overflow: "hidden" as const, zIndex: 2 }}>
        <Image
          source={{
            uri: coverUrl ?? COVER_URL_1,
          }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          accessible
          accessibilityLabel={`Imagen del álbum`}
        />
      </View>
    </View>
  );
});

const AlbumCard: React.FC<AlbumCardProps> = React.memo(({ album, imageSize, onPress }) => {
  const { isPlaying, current } = usePlayer();
  const spinActive = isPlaying && current?.id === album.id;
  const nId = Number(album.id);
  const coverUrl = Number.isFinite(nId)
    ? [COVER_URL_1, COVER_URL_2, COVER_URL_3][((nId - 1) % 3 + 3) % 3]
    : COVER_URL_1;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={async () => { await hapticSelection(); onPress?.(album); }}
      style={[styles.cardContainer]}
      testID={`album-card-${album.id}`}
    >
      <CoverWithVinyl imageSize={imageSize} spinActive={spinActive} vinylUrl={(Number(album.id) % 2 === 0 ? VINYL_URL_2 : VINYL_URL_1)} coverUrl={coverUrl} />
      <View style={[styles.textBlockColumn, { width: imageSize }]}>
        <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail" testID={`album-title-${album.id}`}>
          {album.title}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={2} ellipsizeMode="tail" testID={`album-subtitle-${album.id}`}>
          {album.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const CarouselSection: React.FC<{ title: string; data: AlbumData[]; imageSize: number; onSelect: (a: AlbumData) => void; topSpacing?: number; bottomSpacing?: number }> = ({ title, data, imageSize, onSelect, topSpacing, bottomSpacing }) => {
  const snapOffsets = useMemo(() => {
    const offsets = data.map((_, i) => i * (CARD_WIDTH + ITEM_SPACING));
    return offsets;
  }, [data]);
  return (
    <View style={[styles.section, topSpacing ? { marginTop: topSpacing } : null, bottomSpacing != null ? { marginBottom: bottomSpacing } : null]}>
      {title && title.trim().length > 0 ? (
        <Text style={styles.sectionTitle} testID={`section-title-${title}`}>{title}</Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingRight: END_PADDING }]}
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={Platform.OS === 'ios'}
        alwaysBounceHorizontal={Platform.OS === 'ios'}
        overScrollMode={Platform.OS === 'android' ? 'always' : 'never'}
        testID={`carousel-${title}`}
      >
        {data.map((album, i) => {
          const isLast = i === data.length - 1;
          return (
            <View key={album.id} style={{ width: CARD_WIDTH, marginRight: isLast ? 0 : ITEM_SPACING }} testID={`carousel-item-${title}-${album.id}`}>
              <AlbumCard album={album} imageSize={imageSize} onPress={onSelect} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const ArrowIcon: React.FC<{ direction: 'next' | 'prev'; size?: number; testID?: string }> = ({ direction, size = 34, testID }) => {
  const uri = "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png" as const;
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, tintColor: "#fff", transform: [{ scaleX: direction === 'prev' ? -1 : 1 }] }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      testID={testID}
    />
  );
};

function PlayerSheet({ visible, onClose, album, imageSize, contentOpacity }: { visible: boolean; onClose: () => void; album: AlbumData | null; imageSize: number; contentOpacity: Animated.Value; }) {
  const sheetHeight = Math.floor(screenHeight * 0.8);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const offsetUp = Math.floor(sheetHeight * 0.12);
  const offsetLeft = Math.floor(screenWidth * 0.03);

  const { isPlaying, pause, play, current, previous, changeDirection, userPaused, next, prev } = usePlayer();

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
  const didAutoPlayRef = useRef<boolean>(false);
  useEffect(() => {
    if (!album) return;
    setTextKey((k) => k + 1);
    if (!previous || changeDirection === 'none') {
      initialFade.setValue(0);
      Animated.timing(initialFade, { toValue: 1, duration: Math.floor(1092 * 0.7), easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
      return;
    }
    slideProg.setValue(0);
    Animated.timing(slideProg, { toValue: 1, duration: Math.floor(1310 * 0.7), easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [album, previous, changeDirection, slideProg, initialFade]);

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
      if (finished) onClose();
    });
  }, [translateY, backdrop, onClose, sheetHeight, contentOpacity]);

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
        const next = Math.max(0, g.dy);
        translateY.setValue(next);
        const prog = Math.min(1, next / sheetHeight);
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

  const SWIPE_THRESHOLD = 12 as const;
  const SWIPE_VELOCITY = 0.2 as const;
  const swipeLockRef = useRef<boolean>(false);
  const swipeX = useRef(new Animated.Value(0)).current;
  const coverSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_e, g) => {
        const should = Math.abs(g.dx) > Math.abs(g.dy) * 0.7 && Math.abs(g.dx) > 3;
        return should;
      },
      onMoveShouldSetPanResponder: (_e, g) => {
        const should = Math.abs(g.dx) > Math.abs(g.dy) * 0.75 && Math.abs(g.dx) > 3;
        try { console.log('[ui] swipe moveShould', { dx: g.dx, dy: g.dy, should }); } catch {}
        if (should) {
          isSwipingHoriz.current = true;
        }
        return should;
      },
      onPanResponderGrant: () => {
        isSwipingHoriz.current = true;
        hapticSelection();
      },
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
            try { console.log('[ui] swipe commit (move)', { goingNext, distance, velocity }); } catch {}
            hapticImpact('rigid');
            armOptimistic(800);
            if (goingNext) {
              nextRef.current?.().catch((e) => console.warn('[ui] swipe next failed', e));
            } else {
              prevRef.current?.().catch((e) => console.warn('[ui] swipe prev failed', e));
            }
            setTimeout(() => { swipeLockRef.current = false; }, 500);
          }
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_e, g) => {
        try { console.log('[ui] swipe release', { dx: g.dx, vx: g.vx }); } catch {}
        const distance = Math.abs(g.dx ?? 0);
        const velocity = Math.abs(g.vx ?? 0);
        if (!swipeLockRef.current) {
          const commit = distance >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY;
          if (commit) {
            swipeLockRef.current = true;
            const goingNext = (g.dx ?? 0) < 0;
            try { console.log('[ui] swipe commit (release)', { goingNext, distance, velocity }); } catch {}
            hapticImpact('rigid');
            armOptimistic(800);
            if (goingNext) {
              nextRef.current?.().catch((e) => console.warn('[ui] swipe next failed', e));
            } else {
              prevRef.current?.().catch((e) => console.warn('[ui] swipe prev failed', e));
            }
            setTimeout(() => { swipeLockRef.current = false; }, 500);
          }
        }
        isSwipingHoriz.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: (_e, g) => {
        try { console.log('[ui] swipe terminate', { dx: g?.dx, vx: g?.vx }); } catch {}
        isSwipingHoriz.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderEnd: (_e, g) => {
        try { console.log('[ui] swipe end', { dx: g?.dx, vx: g?.vx }); } catch {}
        isSwipingHoriz.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) open();
  }, [visible, open]);



  useEffect(() => {
    if (userPaused) {
      try { console.log('[ui] userPaused set, blocking autoplay'); } catch {}
    }
  }, [userPaused]);

  const opacity = backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const displayPlaying = (isPlaying || optimisticPlaying);
  const spinActive = displayPlaying && current?.id === album?.id;
  const prevBaseColor = previous?.color ?? '#063536';
  const currBaseColor = album?.color ?? '#EA580C';

  const darkenColor = useCallback((hex: string, factor: number) => {
    try {
      const cleaned = hex.replace('#', '');
      const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const nr = Math.max(0, Math.min(255, Math.floor(r * factor)));
      const ng = Math.max(0, Math.min(255, Math.floor(g * factor)));
      const nb = Math.max(0, Math.min(255, Math.floor(b * factor)));
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
    } catch {
      return hex;
    }
  }, []);

  const prevColor = useMemo(() => darkenColor(prevBaseColor, 0.5), [prevBaseColor, darkenColor]);
  const currColor = useMemo(() => darkenColor(currBaseColor, 0.5), [currBaseColor, darkenColor]);

  const upShift = (previous && changeDirection !== 'none') ? -offsetUp : 0;
  const leftShift = offsetLeft;

  return visible ? (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="player-overlay-root">
      <Animated.View
        testID="player-backdrop"
        style={[styles.backdrop, { opacity }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={async () => { await hapticSelection(); close(); }} testID="player-backdrop-touch" />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.sheetContainer, { height: sheetHeight, transform: [{ translateY }] }]}
        testID="player-sheet"
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && changeDirection !== 'none' ? slideProg.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 0 }]}>
            <LinearGradient
              colors={[prevColor, prevColor, '#000000']}
              locations={[0, 0.02, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && changeDirection !== 'none' ? slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) : initialFade }]}>
            <LinearGradient
              colors={[currColor, currColor, '#000000']}
              locations={[0, 0.02, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <View style={styles.sheetGrabberRow}>
          <View style={styles.grabber} />
        </View>
        <View style={styles.sheetContent} testID="player-swipe-zone" accessible accessibilityLabel="Swipe zone">
          <View style={[styles.centerZone, (changeDirection === 'none') ? { paddingTop: Math.floor(sheetHeight * 0.06) } : null]}>
            <View
              {...coverSwipeResponder.panHandlers}
              style={[styles.centerBlock, { transform: [{ translateY: upShift }, { translateX: leftShift }] }]} 
              testID="player-cover-swipe-surface"
              accessible
              accessibilityLabel="Swipe horizontal para cambiar de canción"
            >
              {(() => {
                const imageOffsetDown = Math.floor((imageSize ?? 160) * 0.03);
                const dir = changeDirection;
                const outTo = dir === 'next' ? -screenWidth : screenWidth;
                const inFrom = dir === 'next' ? screenWidth : -screenWidth;
                const prevTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, outTo] });
                const currTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [inFrom, 0] });
                const shouldAnimate = !!previous && dir !== 'none';
                const getVinylUrlById = (id?: string | null) => {
                  const n = Number(id);
                  if (Number.isFinite(n)) {
                    return n % 2 === 0 ? VINYL_URL_2 : VINYL_URL_1;
                  }
                  return VINYL_URL_1;
                };
                const getCoverUrlById = (id?: string | null) => {
                  const n = Number(id);
                  if (Number.isFinite(n)) {
                    const idx = ((n - 1) % 3 + 3) % 3;
                    return [COVER_URL_1, COVER_URL_2, COVER_URL_3][idx];
                  }
                  return COVER_URL_1;
                };

                if (shouldAnimate) {
                  return (
                    <View>
                      <Animated.View style={[styles.coverRow, { width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignSelf: 'center', alignItems: 'flex-start', transform: [{ translateY: imageOffsetDown }, { translateX: prevTranslate }], opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} testID="player-cover-previous">
                        <CoverWithVinyl imageSize={imageSize ?? 160} spinActive={false} vinylUrl={getVinylUrlById(previous?.id)} coverUrl={getCoverUrlById(previous?.id)} />
                        <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                          <Text style={styles.centerTitle} numberOfLines={2} ellipsizeMode="tail">{previous?.title ?? ''}</Text>
                          <Text style={styles.centerSubtitle} numberOfLines={2}>{previous?.subtitle ?? ''}</Text>
                        </View>
                      </Animated.View>
                      <Animated.View style={[styles.coverRow, StyleSheet.absoluteFillObject as any, { width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignSelf: 'center', alignItems: 'flex-start', transform: [{ translateY: imageOffsetDown }, { translateX: currTranslate }], opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]} testID="player-cover-current">
                        <CoverWithVinyl imageSize={imageSize ?? 160} spinActive={spinActive} vinylUrl={getVinylUrlById(album?.id ?? undefined)} coverUrl={getCoverUrlById(album?.id ?? undefined)} />
                        <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                          <WaveText key={`title-${textKey}`} text={album?.title ?? ''} style={styles.centerTitle} testID="wave-title" />
                          <WaveText key={`subtitle-${textKey}`} text={album?.subtitle ?? ''} style={styles.centerSubtitle} testID="wave-subtitle" />
                        </View>
                      </Animated.View>
                    </View>
                  );
                }

                const pagerRef = React.createRef<ScrollView>();
                const pageWidth = screenWidth;

                const renderPage = (kind: 'prev' | 'current' | 'next') => {
                  const vinylUrl = getVinylUrlById(kind === 'prev' ? previous?.id : album?.id);
                  const coverUrl = getCoverUrlById(kind === 'prev' ? previous?.id : album?.id);
                  const title = kind === 'prev' ? (previous?.title ?? '') : (album?.title ?? '');
                  const subtitle = kind === 'prev' ? (previous?.subtitle ?? '') : (album?.subtitle ?? '');

                  return (
                    <View key={kind} style={{ width: pageWidth, alignItems: 'center' }} testID={`pager-page-${kind}`}>
                      <View style={{ width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignItems: 'flex-start' }}>
                        <View style={{ transform: [{ translateY: imageOffsetDown }] }}>
                          <CoverWithVinyl imageSize={imageSize ?? 160} spinActive={kind === 'current' ? spinActive : false} vinylUrl={vinylUrl} coverUrl={coverUrl} />
                        </View>
                        <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                          <WaveText key={`title-${textKey}-${kind}`} text={title} style={styles.centerTitle} testID={`pager-title-${kind}`} />
                          <WaveText key={`subtitle-${textKey}-${kind}`} text={subtitle} style={styles.centerSubtitle} testID={`pager-subtitle-${kind}`} />
                        </View>
                      </View>
                    </View>
                  );
                };

                const initialDownShift = (dir === 'none') ? Math.floor(offsetUp * 0.9) : 0;
                return (
                  <View style={{ transform: [{ translateY: initialDownShift }] }}>
                    <ScrollView
                      ref={pagerRef}
                      horizontal
                      pagingEnabled
                      scrollEnabled={false}
                      showsHorizontalScrollIndicator={false}
                      contentOffset={{ x: pageWidth, y: 0 }}
                      onLayout={() => {
                        try { console.log('[ui] pager onLayout -> jump to middle'); } catch {}
                        setTimeout(() => pagerRef.current?.scrollTo?.({ x: pageWidth, y: 0, animated: false }), 0);
                      }}
                      onContentSizeChange={() => {
                        try { console.log('[ui] pager onContentSizeChange -> ensure middle'); } catch {}
                        setTimeout(() => pagerRef.current?.scrollTo?.({ x: pageWidth, y: 0, animated: false }), 0);
                      }}
                      testID="player-cover-pager"
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
              <View style={styles.controlsInner} testID="player-controls">
                <TouchableOpacity testID="btn-back" accessibilityRole="button" onPress={async () => { await hapticImpact('medium'); armOptimistic(800); prev(); }}>
                  <ArrowIcon direction="prev" size={38} testID="icon-prev" />
                </TouchableOpacity>
                <TouchableOpacity
                  testID="btn-toggle"
                  accessibilityRole="button"
                  style={styles.playButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={async () => {
                    await hapticImpact('medium');
                    if (displayPlaying) {
                      setOptimisticPlaying(false);
                      await pause();
                    } else {
                      await play();
                    }
                  }}
                  accessibilityLabel={displayPlaying ? "Pausar" : "Reproducir"}
                >
                  {displayPlaying ? (
                    <Image
                      source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png' }}
                      style={{ width: 40, height: 40 }}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                      testID="icon-pause"
                    />
                  ) : (
                    <Image
                      source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png?v=20250816' }}
                      style={{ width: 40, height: 40 }}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                      testID="icon-play"
                    />
                  )}
                </TouchableOpacity>
                <TouchableOpacity testID="btn-forward" accessibilityRole="button" onPress={async () => { await hapticImpact('light'); armOptimistic(800); next(); }}>
                  <ArrowIcon direction="next" size={38} testID="icon-next" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.moreFab} testID="btn-more" accessibilityRole="button" activeOpacity={0.8} onPress={async () => { await hapticSelection(); }}>
            <View style={styles.moreDot} />
            <View style={[styles.moreDot, { marginLeft: 4 }]} />
            <View style={[styles.moreDot, { marginLeft: 4 }]} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  ) : null;
}

export default function MusicPlayerScreen() {
  const router = useRouter();
  const [contentHeight, setContentHeight] = useState<number>(Math.max(screenHeight - 160, 400));
  const [selected, setSelected] = useState<AlbumData | null>(null);
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);
  const { setUIOpen, setQueue, select, uiOpen, current } = usePlayer();
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const { playAlbum, isPlaying, next, prev } = usePlayer();
  const FALLBACK_AUDIO_URL = "https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/aura/audios/AURA/Relax/TRACK1.mp3" as const;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height ?? 0;
    if (h > 0) setContentHeight(h);
  }, []);



  const imageSize = useMemo(() => {
    const headerApprox = 60;
    const sectionsForSizing = 2; // mantener tamaños iguales a los existentes
    const perSectionAvailable = (contentHeight - sectionsForSizing * headerApprox) / sectionsForSizing;
    const textApprox = 56;
    const baseSize = Math.min(CARD_WIDTH, Math.max(120, Math.floor(perSectionAvailable - textApprox)));
    const adjusted = Math.max(90, Math.floor(baseSize * 0.8));
    return adjusted;
  }, [contentHeight]);

  const sharedQueue = useMemo<AlbumData[]>(() => {
    return [...instrumentalData, ...extraData];
  }, []);

  useEffect(() => {
    setQueue([...forYouData, ...sharedQueue]);
  }, [setQueue, sharedQueue]);

  useEffect(() => {
    if (uiOpen) {
      if (current) setSelected(current);
      setSheetVisible(true);
    } else {
      setSheetVisible(false);
    }
  }, [uiOpen, current]);

  const handleSelect = useCallback((a: AlbumData) => {
    setSelected(a);
    select(a, { forceAutoplay: true }).catch(() => {});
    setSheetVisible(true);
    setUIOpen(true);
  }, [select, setUIOpen]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animatedContentWrapper, { opacity: contentOpacity }]} testID="content-fade-wrapper">
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} testID="header-title">Aura de Juan</Text>
          </View>
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 40, justifyContent: 'flex-start' }}
            onLayout={onLayout}
            showsVerticalScrollIndicator={false}
            testID="vertical-scroll"
          >
            <CarouselSection title="Para ti" data={forYouData} imageSize={imageSize} topSpacing={16} onSelect={async (a) => { await hapticSelection(); handleSelect(a); }} />
            <CarouselSection title="Instrumental" data={instrumentalData} imageSize={imageSize} bottomSpacing={24} onSelect={async (a) => { await hapticSelection(); router.push({ pathname: '/album/[id]', params: { id: a.id } }); }} />
            <CarouselSection title="" data={extraData} imageSize={imageSize} onSelect={async (a) => { await hapticSelection(); handleSelect(a); }} />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
      <PlayerSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); setUIOpen(false); }}
        album={current}
        imageSize={imageSize}
        contentOpacity={contentOpacity}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  headerTitle: { fontSize: 34, fontWeight: "bold", color: "#e5e7eb" },
  content: { flex: 1 },
  section: { marginBottom: 48, paddingBottom: 0 },
  sectionTitle: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 12, paddingHorizontal: LEFT_PADDING },
  scrollContent: { paddingHorizontal: LEFT_PADDING },
  cardContainer: { width: "100%" },
  textBlockColumn: { marginTop: 10, alignSelf: "flex-start" },
  cardTitle: { fontSize: 18, fontWeight: "500", color: "#fff" },
  cardSubtitle: { marginTop: 4, fontSize: 13, color: "#6B7280" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  sheetContainer: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: "hidden" as const },
  sheetGrabberRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)", marginBottom: 8 },
  sheetContent: { flex: 1, paddingHorizontal: 0, paddingTop: 16 },
  centerZone: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerBlock: { alignItems: "center", justifyContent: "center" },
  centerTextBlock: { marginTop: 12, alignItems: "flex-start", paddingHorizontal: 0 },
  centerTitle: { color: "#fff", fontSize: 28, fontWeight: "800", textAlign: "left" },
  centerSubtitle: { color: "#94a3b8", fontSize: 16, lineHeight: 18, marginTop: 6, textAlign: "left" },
  controlsRow: { position: "absolute", left: 0, right: 0, bottom: 140, alignItems: "center", justifyContent: "center" },
  playButton: { alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  coverRow: { paddingHorizontal: 0 },
  moreFab: { position: "absolute", right: 24, bottom: 28, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center", justifyContent: "center", flexDirection: "row" },
  moreDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#64748B" },
  controlsInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "64%", alignSelf: "center" },
  animatedContentWrapper: { flex: 1 }
});