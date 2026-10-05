"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Practice } from "@/lib/practices/types";
import { safeExternalUrl } from "./PracticeReader";
import styles from "./practices.module.css";

type AudioTrack = NonNullable<Practice["audioGuide"]>["tracks"][number];

function formatDuration(value?: number): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  const total = Math.round(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const seconds = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

function AudioGuidePlayer({ practice, tracks }: { practice: Practice; tracks: AudioTrack[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const headingId = useId();
  const selected = tracks[selectedIndex] ?? tracks[0];
  const playerKey = `${selectedIndex}:${selected.language}:${selected.url}`;
  const duration = formatDuration(selected.durationSeconds);
  const guide = practice.audioGuide!;
  const sourceHref = safeExternalUrl(guide.sourceUrl);

  useEffect(() => {
    const media = audioRef.current;
    return () => { media?.pause(); };
  }, [playerKey]);

  function selectTrack(index: number) {
    if (index === selectedIndex) return;
    audioRef.current?.pause();
    setSelectedIndex(index);
  }

  return <section className={styles.audioGuide} aria-labelledby={headingId}>
    <div className={styles.audioGuideHeading}>
      <h3 id={headingId}>官方音頻引導</h3>
      <div className={styles.audioLanguages} role="group" aria-label="選擇音頻語言">
        {tracks.map((track, index) => <button
          key={`${index}:${track.url}`}
          type="button"
          aria-pressed={index === selectedIndex}
          onClick={() => selectTrack(index)}
        >{track.language}</button>)}
      </div>
    </div>
    <audio
      key={playerKey}
      ref={audioRef}
      className={styles.audioPlayer}
      src={selected.url}
      controls
      preload="none"
      aria-label={`${practice.title}・${selected.language}官方音頻`}
    />
    {duration && <p className={styles.audioDuration}>音頻長度約 {duration}</p>}
    {guide.note && <p className={styles.audioGuideNote}>{guide.note}</p>}
    {sourceHref && <a className={styles.audioGuideSource} href={sourceHref} target="_blank" rel="noopener noreferrer">官方頁面來源 ↗</a>}
  </section>;
}

export function PracticeAudioGuide({ practice }: { practice: Practice }) {
  if (!practice.audioGuide) return null;
  const tracks = practice.audioGuide.tracks.flatMap(track => {
    const url = safeExternalUrl(track.url);
    return url ? [{ ...track, url }] : [];
  });
  if (!tracks.length) return null;
  return <AudioGuidePlayer key={practice.id} practice={practice} tracks={tracks} />;
}
