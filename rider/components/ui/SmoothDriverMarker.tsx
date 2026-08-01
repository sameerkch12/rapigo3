import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform } from 'react-native';
import { Marker } from './MapView';

interface SmoothDriverMarkerProps {
  target: { latitude: number; longitude: number };
  image?: any;
  rotation?: number;
  anchor?: { x: number; y: number };
  title?: string;
}

const TICK_MS = 200;
const LERP = 0.3;

export default function SmoothDriverMarker({
  target,
  image,
  rotation = 0,
  anchor = { x: 0.5, y: 0.5 },
  title = 'Captain',
}: SmoothDriverMarkerProps) {
  const targetRef = useRef(target);
  const posRef = useRef(target);
  const [pos, setPos] = useState(target);

  useEffect(() => {
    targetRef.current = target;
    if (Platform.OS === 'web') {
      setPos(target);
    }
  }, [target]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const id = setInterval(() => {
      const cur = posRef.current;
      const tgt = targetRef.current;
      const nextLat = cur.latitude + (tgt.latitude - cur.latitude) * LERP;
      const nextLng = cur.longitude + (tgt.longitude - cur.longitude) * LERP;
      const moved = Math.hypot(nextLat - cur.latitude, nextLng - cur.longitude) >= 0.0000005;
      if (!moved) return;
      const next = { latitude: nextLat, longitude: nextLng };
      posRef.current = next;
      setPos(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Marker coordinate={pos} title={title} anchor={anchor} rotation={rotation} tracksViewChanges={false}>
      {image ? <Image source={image} style={{ width: 52, height: 35, resizeMode: 'contain' }} /> : undefined}
    </Marker>
  );
}
