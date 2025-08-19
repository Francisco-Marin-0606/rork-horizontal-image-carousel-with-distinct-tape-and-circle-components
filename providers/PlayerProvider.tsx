import React, { useCallback, useEffect, useRef, useState } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { Platform, Alert } from "react-native";
import { Audio as ExpoAudio, AVPlaybackStatus } from "expo-av";
import type { AlbumData } from "@/types/music";

export type ChangeDirection = 'next' | 'prev' | 'none';

export type PlayerState = {
  current: AlbumData | null;
  previous: AlbumData | null;
  changeDirection: ChangeDirection;
  isPlaying: boolean;
  url: string | null;
  userPaused: boolean;
  uiOpen: boolean;
  queue: AlbumData[];
  setQueue: (list: AlbumData[]) => void;
  setUIOpen: (open: boolean) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  toggle: () => Promise<void>;
  playAlbum: (album: AlbumData, url: string, direction?: ChangeDirection, forceAutoplay?: boolean) => Promise<void>;
  select: (album: AlbumData, opts?: { forceAutoplay?: boolean; direction?: ChangeDirection }) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seekBy: (seconds: number) => Promise<void>;
};

export const [PlayerProvider, usePlayer] = createContextHook<PlayerState>(() => {
  const [current, setCurrent] = useState<AlbumData | null>(null);
  const [previous, setPrevious] = useState<AlbumData | null>(null);
  const [changeDirection, setChangeDirection] = useState<ChangeDirection>('none');
  const [url, setUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [userPaused, setUserPaused] = useState<boolean>(false);
  const [queue, setQueueState] = useState<AlbumData[]>([]);

  const isPlayingRef = useRef<boolean>(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  const userPausedRef = useRef<boolean>(false);
  useEffect(() => { userPausedRef.current = userPaused; }, [userPaused]);

  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef<ExpoAudio.Sound | null>(null);
  const loadIdRef = useRef<number>(0);
  const [uiOpen, setUIOpenState] = useState<boolean>(false);
  const advanceNextRef = useRef<() => void>(() => {});

  const stopAndUnload = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const el = webAudioRef.current;
        if (el) {
          try { el.onended = null as any; } catch {}
          try { el.onplay = null as any; } catch {}
          try { el.onpause = null as any; } catch {}
          try { el.pause(); } catch {}
          try { el.currentTime = 0; } catch {}
          try { el.removeAttribute('src'); } catch {}
          try { el.load?.(); } catch {}
          webAudioRef.current = null;
        }
      } else {
        const s = soundRef.current;
        if (s) {
          try { await s.pauseAsync(); } catch {}
          try { await s.stopAsync(); } catch {}
          try { s.setOnPlaybackStatusUpdate(null as any); } catch {}
          try { await s.unloadAsync(); } catch {}
          soundRef.current = null;
        }
      }
    } catch (e) {
      console.log('[player] stopAndUnload error', e);
    }
  }, []);

  useEffect(() => {
    return () => { stopAndUnload(); };
  }, [stopAndUnload]);

  const ensureLoaded = useCallback(async (nextUrl: string) => {
    if (!nextUrl) return null as unknown as HTMLAudioElement | ExpoAudio.Sound | null;
    const idSnapshot = loadIdRef.current;
    if (Platform.OS === "web") {
      const currentEl = webAudioRef.current;
      if (currentEl) {
        try { currentEl.pause(); } catch {}
        try { currentEl.currentTime = 0; } catch {}
        try { currentEl.removeAttribute('src'); } catch {}
        try { currentEl.load?.(); } catch {}
      }
      const el = new (window as any).Audio(nextUrl) as HTMLAudioElement;
      el.preload = "auto";
      try { (el as any).playsInline = true; } catch {}
      el.onended = () => {
        try { setIsPlaying(false); } catch {}
        try { advanceNextRef.current?.(); } catch {}
      };      el.onplay = () => { if (idSnapshot === loadIdRef.current) { setIsPlaying(true); setUserPaused(false); } };
      el.onpause = () => { if (idSnapshot === loadIdRef.current) { setIsPlaying(false); } };
      try { (el as any).autoplay = false; } catch {}
      webAudioRef.current = el;
      return el;
    } else {
      await ExpoAudio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        allowsRecordingIOS: false,
        interruptionModeIOS: 1,
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1,
        playThroughEarpieceAndroid: false,
      });
      const currentSound = soundRef.current;
      if (currentSound) {
        try { await currentSound.pauseAsync(); } catch {}
        try { await currentSound.stopAsync(); } catch {}
        try { currentSound.setOnPlaybackStatusUpdate(null as any); } catch {}
        try { await currentSound.unloadAsync(); } catch {}
        soundRef.current = null;
      }
      const onStatusUpdate = (status: AVPlaybackStatus) => {
        if (!('isLoaded' in status) || !status.isLoaded) return;
        if (idSnapshot !== loadIdRef.current) return;
        try { setIsPlaying(status.isPlaying ?? false); } catch {}
        if ('didJustFinish' in status && status.didJustFinish) {
          try { advanceNextRef.current?.(); } catch {}
        }
      };
      const { sound } = await ExpoAudio.Sound.createAsync({ uri: nextUrl }, { shouldPlay: false }, onStatusUpdate);
      soundRef.current = sound;
      return sound;
    }
  }, []);

  const play = useCallback(async () => {
    const targetUrl = url;
    if (!targetUrl) return;
    const myId = loadIdRef.current;
    if (Platform.OS === "web") {
      try {
        const el = webAudioRef.current ?? (await ensureLoaded(targetUrl) as HTMLAudioElement);
        if (myId !== loadIdRef.current) return;
        await el?.play?.();
        setIsPlaying(true);
        setUserPaused(false);
      } catch (e) {
        console.error("[player] web play fail", e);
        Alert.alert?.("Reproducción", "No se pudo reproducir el audio en el navegador");
      }
    } else {
      try {
        let s = soundRef.current as ExpoAudio.Sound | null;
        if (!s) {
          s = (await ensureLoaded(targetUrl)) as ExpoAudio.Sound | null;
        } else {
          const st = (await s.getStatusAsync()) as AVPlaybackStatus;
          if (!st.isLoaded) {
            try { await s.unloadAsync(); } catch {}
            soundRef.current = null;
            s = (await ensureLoaded(targetUrl)) as ExpoAudio.Sound | null;
          }
        }
        if (myId !== loadIdRef.current) return;
        await s?.playAsync();
        setIsPlaying(true);
        setUserPaused(false);
      } catch (e) {
        console.error("[player] native play fail", e);
        Alert.alert?.("Reproducción", "No se pudo reproducir el audio");
      }
    }
  }, [url, ensureLoaded]);

  const pause = useCallback(async () => {
    if (Platform.OS === "web") {
      const el = webAudioRef.current;
      try { await el?.pause?.(); } catch {}
      setIsPlaying(false);
      setUserPaused(true);
    } else {
      const s = soundRef.current;
      try { await s?.pauseAsync(); } catch {}
      setIsPlaying(false);
      setUserPaused(true);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) return pause();
    return play();
  }, [isPlaying, pause, play]);

  const internalPlayAlbum = useCallback(async (album: AlbumData, nextUrl: string, direction: ChangeDirection = 'none', forceAutoplay?: boolean) => {
    try { console.log('[player] playAlbum', { album: album?.id, direction, nextUrl, forceAutoplay }); } catch {}
    const wasPlaying = isPlayingRef.current;
    setPrevious(current);
    setCurrent(album);
    setChangeDirection(direction);
    setUrl(nextUrl);
    const shouldAutoplayInitial = forceAutoplay === true ? true : wasPlaying;
    setUserPaused(!shouldAutoplayInitial);
    if (!shouldAutoplayInitial) setIsPlaying(false);

    const myId = ++loadIdRef.current;
    await stopAndUnload();
    const loaded = await ensureLoaded(nextUrl);
    if (myId !== loadIdRef.current) return;

    if (userPausedRef.current) {
      setIsPlaying(false);
      return;
    }

    if (shouldAutoplayInitial) {
      try {
        if (Platform.OS === 'web') {
          const el = (loaded as unknown as HTMLAudioElement) ?? webAudioRef.current;
          if (myId !== loadIdRef.current) return;
          if (!userPausedRef.current) {
            await el?.play?.();
          }
        } else {
          let s: ExpoAudio.Sound | null = (loaded as ExpoAudio.Sound) ?? soundRef.current;
          if (s) {
            const st = (await s.getStatusAsync()) as AVPlaybackStatus;
            if (!st.isLoaded) {
              try { await s.unloadAsync(); } catch {}
              soundRef.current = null;
              s = (await ensureLoaded(nextUrl)) as ExpoAudio.Sound | null;
            }
          }
          if (myId !== loadIdRef.current) return;
          if (!userPausedRef.current) {
            await s?.playAsync?.();
          }
        }
        if (!userPausedRef.current) {
          setIsPlaying(true);
          setUserPaused(false);
        }
      } catch (e) {
        console.log('[player] playAlbum immediate play failed', e);
      }
    }
  }, [ensureLoaded, current, stopAndUnload]);

  const playAlbum = useCallback(async (album: AlbumData, nextUrl: string, direction: ChangeDirection = 'none', forceAutoplay?: boolean) => {
    if (!nextUrl) {
      try { console.log('[player] playAlbum aborted: missing URL', album?.id); } catch {}
      Alert.alert?.('Audio', 'No se encontró el audio de esta pista');
      return;
    }
    await internalPlayAlbum(album, nextUrl, direction, forceAutoplay);
  }, [internalPlayAlbum]);

  const select = useCallback(async (album: AlbumData, opts?: { forceAutoplay?: boolean; direction?: ChangeDirection }) => {
    const chosen = album;
    const urlToUse = chosen.audioUrl ?? '';
    if (!urlToUse) {
      try { console.log('[player] select aborted: album without audioUrl', chosen?.id); } catch {}
      Alert.alert?.('Audio', 'Esta pista no tiene audio disponible');
      return;
    }
    const dir = opts?.direction ?? (current ? (Number(chosen.id) > Number(current.id) ? 'next' : Number(chosen.id) < Number(current.id) ? 'prev' : 'none') : 'none');
    await internalPlayAlbum(chosen, urlToUse, dir, opts?.forceAutoplay);
  }, [internalPlayAlbum, current]);

  const indexInQueue = useCallback((id: string | null | undefined) => {
    if (!id) return -1;
    return queue.findIndex(a => a.id === id);
  }, [queue]);

  const next = useCallback(async () => {
    const total = queue.length;
    if (total <= 0) return;
    const idx = indexInQueue(current?.id);
    if (idx === -1) return;
    const nextIdx = (idx + 1) % total;
    const a = queue[nextIdx];
    const nextUrl = a?.audioUrl ?? '';
    if (!nextUrl) { try { console.log('[player] next aborted: missing audioUrl on next item'); } catch {} ; return; }
    await internalPlayAlbum(a, nextUrl, 'next', true);
  }, [queue, current?.id, internalPlayAlbum, indexInQueue]);

  const prev = useCallback(async () => {
    const total = queue.length;
    if (total <= 0) return;
    const idx = indexInQueue(current?.id);
    if (idx === -1) return;
    const prevIdx = (idx - 1 + total) % total;
    const a = queue[prevIdx];
    const prevUrl = a?.audioUrl ?? '';
    if (!prevUrl) { try { console.log('[player] prev aborted: missing audioUrl on prev item'); } catch {} ; return; }
    await internalPlayAlbum(a, prevUrl, 'prev', true);
  }, [queue, current?.id, internalPlayAlbum, indexInQueue]);

  const seekBy = useCallback(async (seconds: number) => {
    try {
      if (Platform.OS === "web") {
        const el = webAudioRef.current;
        if (!el) return;
        const duration = Number.isFinite(el.duration) ? el.duration : 0;
        const currentTime = el.currentTime ?? 0;
        let nextTime = currentTime + seconds;
        if (duration > 0) {
          nextTime = Math.max(0, Math.min(duration - 0.2, nextTime));
        } else {
          nextTime = Math.max(0, nextTime);
        }
        el.currentTime = nextTime;
        if (isPlaying) {
          await el.play().catch(() => {});
        }
      } else {
        const s = soundRef.current;
        if (!s) return;
        const status = (await s.getStatusAsync()) as AVPlaybackStatus;
        if (!status.isLoaded) return;
        const durationMs = status.durationMillis ?? 0;
        const positionMs = status.positionMillis ?? 0;
        const nextMs = Math.max(0, Math.min(durationMs > 0 ? durationMs - 200 : positionMs + seconds * 1000, positionMs + seconds * 1000));
        await s.setPositionAsync(nextMs);
        if (isPlaying) {
          await s.playAsync().catch(() => {});
        }
      }
    } catch (e) {
      console.log("[player] seek error", e);
    }
  }, [isPlaying]);

  const setUIOpen = useCallback((open: boolean) => {
    try { console.log('[player-ui] setUIOpen', open); } catch {}
    setUIOpenState(open);
  }, []);

  const setQueue = useCallback((list: AlbumData[]) => {
    try { console.log('[player] setQueue', list.map(l => l.id)); } catch {}
    setQueueState(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    advanceNextRef.current = () => { next().catch(() => {}); };
  }, [next]);

  return { current, previous, changeDirection, isPlaying, url, userPaused, uiOpen, queue, setQueue, setUIOpen, play, pause, toggle, playAlbum, select, next, prev, seekBy };
});
