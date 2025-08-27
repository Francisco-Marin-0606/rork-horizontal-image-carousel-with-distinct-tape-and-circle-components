import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, ScrollView, Animated, Easing, Platform, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayer } from '@/providers/PlayerProvider';
import type { AlbumData } from '@/types/music';
import { hapticImpact, hapticSelection } from '@/utils/haptics';
import * as WebBrowser from 'expo-web-browser';

import { Play, Shuffle, Download } from 'lucide-react-native';

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

const sanitizeFileName = (name: string) => (name ?? '')
  .replace(/[^a-zA-Z0-9-_\.\s]/g, '')
  .trim()
  .replace(/\s+/g, '_');

async function downloadUrlNative(url: string, _filename: string) {
  try {
    try { console.log('[download] native open browser ->', { url }); } catch {}
    const res = await WebBrowser.openBrowserAsync(url);
    if (res.type === 'cancel') {
      try { await Linking.openURL(url); } catch {}
    }
  } catch (e) {
    console.log('[download] native error', e);
    Alert.alert?.('Descarga', 'No se pudo abrir el enlace de descarga');
  }
}

async function downloadUrlWeb(url: string, filename: string) {
  try {
    try { console.log('[download] web ->', { url, filename }); } catch {}
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    Alert.alert?.('Descarga', 'Iniciando descarga en el navegador');
  } catch (e) {
    console.log('[download] web error', e);
    Alert.alert?.('Descarga', 'No se pudo iniciar la descarga');
  }
}

async function downloadTrackByData(track: AlbumData) {
  const url = track.audioUrl ?? '';
  if (!url) {
    Alert.alert?.('Descarga', 'Esta pista no tiene audio disponible');
    return;
  }
  const base = sanitizeFileName(`${track.title || 'track'}_${track.id}`).slice(0, 64);
  const ext = url.split('?')[0].split('.').pop() || 'mp3';
  const filename = `${base}.${ext}`;
  if (Platform.OS === 'web') return downloadUrlWeb(url, filename);
  return downloadUrlNative(url, filename);
}

async function downloadAlbumAll(tracks: AlbumData[]) {
  if (!tracks || tracks.length === 0) {
    Alert.alert?.('Descarga', 'No hay pistas para descargar');
    return;
  }
  try { console.log('[download] album start', tracks.length); } catch {}
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    try { await downloadTrackByData(t); } catch (e) { console.log('[download] track failed', t?.id, e); }
  }
  try { console.log('[download] album finished'); } catch {}
}

export default function AlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const idParam = (Array.isArray(params.id) ? params.id[0] : (params.id as string)) ?? '';
  const titleParam = (Array.isArray(params.title) ? params.title[0] : (params.title as string)) ?? '';
  const subtitleParam = (Array.isArray(params.subtitle) ? params.subtitle[0] : (params.subtitle as string)) ?? '';
  const colorParam = (Array.isArray(params.color) ? params.color[0] : (params.color as string)) ?? undefined;
  const audioUrlParam = (Array.isArray(params.audioUrl) ? params.audioUrl[0] : (params.audioUrl as string)) ?? undefined;
  const animateEntryParam = (Array.isArray(params.animateEntry) ? params.animateEntry[0] : (params.animateEntry as string)) ?? '0';
  const { queue, select, current, isPlaying, play, setQueue, setUIOpen } = usePlayer();
  const [isSkeleton, setIsSkeleton] = React.useState<boolean>(true);
  React.useEffect(() => {
    try { console.log('[album] force skeleton start'); } catch {}
    const t = setTimeout(() => {
      try { console.log('[album] force skeleton end'); } catch {}
      setIsSkeleton(false);
    }, 2000);
    return () => clearTimeout(t);
  }, []);

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

  const [downloadedMap, setDownloadedMap] = React.useState<Record<string, boolean>>({});

  const imageBase = Math.min(320, Math.floor(screenWidth * 0.68));
  const imageSize = Math.floor(imageBase * 0.72);
  const coverOffset = Math.max(6, Math.floor(screenWidth * 0.09));
  const TEXT_SHIFT = Math.floor(screenWidth * 0.05);

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

  const SIDE_MARGIN = 0;

  const entryTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const isExitingRef = useRef<boolean>(false);

  const handleBack = useCallback(async () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    try { console.log('[nav] Album slide out start'); } catch {}
    await hapticSelection();
    Animated.timing(entryTranslateX, { toValue: screenWidth, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      try { console.log('[nav] Album slide out end', { finished }); } catch {}
      router.back();
      setTimeout(() => { isExitingRef.current = false; }, 300);
    });
  }, [entryTranslateX, router]);

  useEffect(() => {
    const shouldAnimate = String(animateEntryParam) === '1';
    try { console.log('[nav] Album slide in?', { idParam, animateEntryParam, shouldAnimate }); } catch {}
    if (!shouldAnimate) return;
    entryTranslateX.setValue(screenWidth);
    Animated.timing(entryTranslateX, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entryTranslateX, idParam, animateEntryParam]);

  return (
    <View style={styles.root} testID="album-screen-root">
      <LinearGradient
        colors={[softColor, softColor, '#000000']}
        locations={[0, 0.02, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: entryTranslateX }], backfaceVisibility: 'hidden' as const, overflow: 'hidden' as const }]}> 
      <SafeAreaView style={{ flex: 1 }}>
        {isSkeleton ? (
          <View style={{ flex: 1 }} testID="album-skeleton">
            <View style={[styles.headerRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
              <View style={styles.skelCircle} />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <View style={{ width: imageSize, height: imageSize, marginLeft: -coverOffset, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
                <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.6), marginTop: 16 }]} />
                <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.4), height: 14, marginTop: 8 }]} />
                <View style={[styles.ctaRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
                  <View style={[styles.skelBtn]} />
                  <View style={[styles.skelBtn]} />
                </View>
              </View>
              <View style={styles.listDivider} />
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={`skel-${i}`} style={[styles.row, { marginLeft: -SIDE_MARGIN, marginRight: -SIDE_MARGIN, paddingLeft: 16 + SIDE_MARGIN, paddingRight: 16 + SIDE_MARGIN }]}> 
                  <View style={{ flex: 1, paddingLeft: TEXT_SHIFT }}>
                    <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.5) }]} />
                    <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.35), height: 12, marginTop: 8, opacity: 0.6 }]} />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1, paddingLeft: SIDE_MARGIN, paddingRight: SIDE_MARGIN }}>
            <View style={[styles.headerRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
              <TouchableOpacity accessibilityRole="button" testID="btn-back" style={{ padding: 8 }} onPress={handleBack}>
                <Image
                  source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechaRetrocederV2.png' }}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <View style={{ width: imageSize, height: imageSize, marginLeft: -coverOffset }} testID="album-cover-container">
                  <Animated.Image source={{ uri: getVinylUrlById(album.id) }} style={{ position: 'absolute', width: Math.floor(imageSize * 0.7), height: Math.floor(imageSize * 0.7), left: Math.floor(imageSize - (imageSize*0.7)/2), top: Math.floor((imageSize - (imageSize*0.7))/2), transform: [{ rotate }] }} resizeMode="contain" />
                  <Image source={{ uri: getCoverUrlById(album.id) }} style={{ width: imageSize, height: imageSize }} resizeMode="cover" />
                </View>
                <Text style={styles.title} numberOfLines={2} testID="album-title">{album.title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{'18 Hz - Ondas Beta'}</Text>
                <View style={[styles.ctaRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
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
                <View style={[styles.downloadRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
                  <TouchableOpacity
                    testID="btn-download-album"
                    accessibilityRole="button"
                    accessibilityLabel="Descargar Album"
                    style={[styles.ctaBtn, { backgroundColor: 'rgba(255,255,255,0.12)', width: '100%' }]}
                    disabled={true}
                  >
                    <Download color="#e5e7eb" size={20} />
                    <Text style={[styles.ctaText, styles.ctaTextWithIcon]}>Descargar Album</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.listDivider} />
              {tracks.map((t, idx) => {
                const isCurrent = current?.id === t.id;
                const isActive = Boolean(isCurrent);
                const downloaded = downloadedMap[t.id] ?? false;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.row,
                      { marginLeft: -SIDE_MARGIN, marginRight: -SIDE_MARGIN, paddingLeft: 16 + SIDE_MARGIN, paddingRight: 16 + SIDE_MARGIN },
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
                      <View pointerEvents="none" style={{ position: 'absolute', left: -SIDE_MARGIN, right: -SIDE_MARGIN, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    ) : null}
                    <View style={{ flex: 1, paddingLeft: TEXT_SHIFT }}>
                      <Text style={[styles.rowTitle, isActive ? { color: baseColor } : null]} numberOfLines={1}>{t.title}</Text>
                      <Text style={[styles.rowSubtitle, isActive ? { color: '#cbd5e1' } : null]} numberOfLines={1}>{t.subtitle}</Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={downloaded ? 'Descargado' : 'Descargar pista'}
                      style={{ padding: 8, marginLeft: 12 }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      testID={`btn-download-track-${idx+1}`}
                      onPress={async () => {
                        try { console.log('[download] toggle track', t.id); } catch {}
                        await hapticSelection();
                        setDownloadedMap(prev => ({ ...prev, [t.id]: !prev[t.id] }));
                      }}
                    >
                      {downloaded ? (
                        <Image
                          source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Descargado.png' }}
                          style={{ width: 20, height: 20 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <Download color="#e5e7eb" size={20} />
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
      </Animated.View>
    </View>
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
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '500' as const },
  rowSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  skelCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)' },
  skelLine: { height: 18, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  skelBtn: { height: 42, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', flex: 1 },
  downloadRow: { width: '100%', marginTop: 12 },
});
