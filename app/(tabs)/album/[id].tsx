import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, ScrollView, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayer } from '@/providers/PlayerProvider';
import type { AlbumData } from '@/types/music';
import { hapticImpact, hapticSelection } from '@/utils/haptics';

import { Play, Shuffle } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PLAY_ICON_URL: string | null = null;

const VINYL_URL_1 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Vinilo1.png' as const;
const VINYL_URL_2 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Vinilo2.png' as const;
const COVER_URL_1 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers.png' as const;
const COVER_URL_2 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers2.png' as const;
const COVER_URL_3 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers1.png' as const;

const inventedTracks = (album: AlbumData): AlbumData[] => {
  const baseTitles = [
    'Amanecer Sereno',
    'Sombras de Madera',
    'Bruma Dorada',
    'Ríos de Luz',
    'Jardín Nebuloso',
    'Olas en Re Menor',
    'Geometría del Viento',
    'Noche en Ámbar',
    'Círculos de Humo',
    'Eco de Acuarela',
    'Pasillos Azulados',
    'Latido de Ónix',
  ];
  return baseTitles.map((t, i) => ({
    id: `${album.id}-${i+1}`,
    title: t,
    subtitle: `De ${album.title} — Variante ${i+1}`,
    color: album.color,
    audioUrl: album.audioUrl,
  }));
};

const getCoverUrlById = (id: string) => {
  const n = Number(id.split('-')[0]);
  if (Number.isFinite(n)) {
    const idx = ((n - 1) % 3 + 3) % 3;
    return [COVER_URL_1, COVER_URL_2, COVER_URL_3][idx];
  }
  return COVER_URL_1;
};
const getVinylUrlById = (id: string) => {
  const n = Number(id.split('-')[0]);
  if (Number.isFinite(n)) return n % 2 === 0 ? VINYL_URL_2 : VINYL_URL_1;
  return VINYL_URL_1;
};

export default function AlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const idParam = (Array.isArray(params.id) ? params.id[0] : (params.id as string)) ?? '';
  const titleParam = (Array.isArray(params.title) ? params.title[0] : (params.title as string)) ?? '';
  const subtitleParam = (Array.isArray(params.subtitle) ? params.subtitle[0] : (params.subtitle as string)) ?? '';
  const colorParam = (Array.isArray(params.color) ? params.color[0] : (params.color as string)) ?? undefined;
  const audioUrlParam = (Array.isArray(params.audioUrl) ? params.audioUrl[0] : (params.audioUrl as string)) ?? undefined;
  const { queue, select, current, isPlaying, play, setQueue, setUIOpen } = usePlayer();

  const albumFromParams = useMemo<AlbumData | null>(() => {
    if (!idParam) return null;
    return {
      id: idParam,
      title: titleParam || `Álbum ${idParam}`,
      subtitle: subtitleParam || 'Colección de pistas',
      color: (colorParam as string | undefined) ?? '#111827',
      audioUrl: (audioUrlParam as string | undefined) ?? '',
    } as AlbumData;
  }, [idParam, titleParam, subtitleParam, colorParam, audioUrlParam]);

  const albumFromQueue = useMemo<AlbumData | null>(() => {
    const base = queue.find(a => a.id === idParam) ?? null;
    return base;
  }, [queue, idParam]);

  const album: AlbumData | null = albumFromParams ?? albumFromQueue;

  const tracks = useMemo<AlbumData[]>(() => (album ? inventedTracks(album) : []), [album]);

  const imageBase = Math.min(320, Math.floor(screenWidth * 0.68));
  const imageSize = Math.floor(imageBase * 0.72);

  const spin = useRef(new Animated.Value(0)).current;
  const getBaseId = (id?: string | null) => (id ? String(id).split('-')[0] : '');
  const spinActive = isPlaying && getBaseId(current?.id) === getBaseId(album?.id);
  React.useEffect(() => {
    if (spinActive) {
      const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
      spin.setValue(0);
      loop.start();
      return () => spin.stopAnimation();
    } else {
      spin.stopAnimation();
      spin.setValue(0);
    }
  }, [spinActive, spin]);
  const rotate = spin.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] });


  if (!album) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff' }}>Álbum no encontrado</Text>
      </SafeAreaView>
    );
  }

  const baseColor = album.color ?? '#111827';

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
  const softColor = useMemo(() => darkenColor(baseColor, 0.5), [baseColor, darkenColor]);

  const SIDE_MARGIN = Math.floor(screenWidth * 0.05);

  const entryOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    try { console.log('[nav] Album mount -> fade in'); } catch {}
    entryOpacity.setValue(0);
    Animated.timing(entryOpacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [entryOpacity]);

  return (
    <Animated.View style={[styles.root, { opacity: entryOpacity }]} testID="album-screen-root">
      <LinearGradient
        colors={[softColor, softColor, '#000000']}
        locations={[0, 0.02, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingLeft: SIDE_MARGIN, paddingRight: SIDE_MARGIN }}>
          <View style={[styles.headerRow, { paddingLeft: 0, paddingRight: 0 }] }>
            <TouchableOpacity accessibilityRole="button" testID="btn-back" style={{ padding: 8, marginLeft: -8 }} onPress={async () => { await hapticSelection(); router.back(); }}>
              <Image
                source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechaRetrocederV2.png' }}
                style={{ width: 22, height: 22 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <View style={{ width: imageSize, height: imageSize }}>
                <Animated.Image source={{ uri: getVinylUrlById(album.id) }} style={{ position: 'absolute', width: Math.floor(imageSize * 0.7), height: Math.floor(imageSize * 0.7), left: Math.floor(imageSize - (imageSize*0.7)/2), top: Math.floor((imageSize - (imageSize*0.7))/2), transform: [{ rotate }] }} resizeMode="contain" />
                <Image source={{ uri: getCoverUrlById(album.id) }} style={{ width: imageSize, height: imageSize }} resizeMode="cover" />
              </View>
              <Text style={styles.title} numberOfLines={2} testID="album-title">{album.title}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{'18 Hz - Ondas Beta'}</Text>
              <View style={styles.ctaRow}>
                <TouchableOpacity
                  testID="btn-play"
                  accessibilityRole="button"
                  accessibilityLabel="Reproducir"
                  style={[styles.ctaBtn, styles.ctaFlex, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                  onPress={async () => {
                    try { console.log('[album] Play button pressed'); } catch {}
                    await hapticImpact('medium');
                    if (tracks.length > 0) {
                      setQueue(tracks);
                      await select(tracks[0], { forceAutoplay: true });
                      await play();
                    }
                  }}
                >
                  {PLAY_ICON_URL ? (
                    <Image source={{ uri: PLAY_ICON_URL }} style={{ width: 20, height: 20, tintColor: '#e5e7eb' as const }} />
                  ) : (
                    <Play color="#e5e7eb" size={20} />
                  )}
                  <Text style={[styles.ctaText, styles.ctaTextWithIcon]}>Reproducir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="btn-shuffle"
                  accessibilityRole="button"
                  accessibilityLabel="Aleatorio"
                  style={[styles.ctaBtn, styles.ctaFlex, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                  onPress={async () => {
                    try { console.log('[album] Shuffle button pressed'); } catch {}
                    await hapticImpact('light');
                    if (tracks.length > 0) {
                      const anyTrack = tracks[Math.floor(Math.random() * tracks.length)];
                      setQueue(tracks);
                      await select(anyTrack, { forceAutoplay: true });
                      await play();
                    }
                  }}
                >
                  <Shuffle color="#e5e7eb" size={20} />
                  <Text style={[styles.ctaText, styles.ctaTextWithIcon]}>Aleatorio</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.listDivider} />
            {tracks.map((t, idx) => {
              const isCurrent = current?.id === t.id;
              const isActive = Boolean(isCurrent);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.row,
                    { marginHorizontal: -SIDE_MARGIN },
                  ]}
                  activeOpacity={0.8}
                  onPress={async () => {
                    await hapticSelection();
                    try { console.log('[album] Track tapped', t.id); } catch {}
                    setQueue(tracks);
                    await select(t, { forceAutoplay: true });
                    await play();
                  }}
                  testID={`track-row-${idx+1}`}
                >
                  {isActive ? (
                    <View pointerEvents="none" style={styles.rowHighlight} />
                  ) : null}
                  <View style={{ flex: 1, paddingHorizontal: SIDE_MARGIN + 16 }}>
                    <Text style={[styles.rowTitle, isActive ? { color: baseColor } : null]} numberOfLines={1}>{t.title}</Text>
                    <Text style={[styles.rowSubtitle, isActive ? { color: '#cbd5e1' } : null]} numberOfLines={1}>{t.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, alignItems: 'flex-start' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' as const, marginTop: 16 },
  subtitle: { color: '#cbd5e1', fontSize: 14, marginTop: 6 },
  ctaRow: { flexDirection: 'row', gap: 10 as unknown as number, marginTop: 28, width: '100%', paddingHorizontal: 16 },
  ctaBtn: { paddingHorizontal: 19, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#e5e7eb', fontSize: 17, fontWeight: '600' as const },
  ctaFlex: { flex: 1 },
  ctaTextWithIcon: { marginLeft: 8 },
  listDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 18, marginBottom: 8 },
  row: { paddingHorizontal: 0, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', position: 'relative' },
  rowHighlight: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.05)' },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '500' as const },
  rowSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
});
