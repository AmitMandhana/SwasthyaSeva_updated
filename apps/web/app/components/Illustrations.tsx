'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// ─── Storyset SVG Illustrations (Freepik License — free with attribution) ───
export const ILLUSTRATIONS = {
  doctors: 'https://stories.freepiklabs.com/storage/4688/Doctors-01.svg',
  onlineDoctor: 'https://stories.freepiklabs.com/storage/8136/Online-doctor-01.svg',
  medicine: 'https://stories.freepiklabs.com/storage/6250/Medicine-(1)-01.svg',
  medicalCare: 'https://stories.freepiklabs.com/storage/34701/Medical-care-01.svg',
  hospitalPatient: 'https://stories.freepiklabs.com/storage/55854/Hospital-patient-01.svg',
  healthTeam: 'https://stories.freepiklabs.com/storage/4626/Health-professional-team-(1)-01.svg',
} as const;

// ─── Lottie Animation URLs (free, LottieFiles) ───
export const LOTTIE_URLS = {
  doctorNotepad: 'https://assets2.lottiefiles.com/packages/lf20_tutvdkg0.json',
  doctorPatient: 'https://assets3.lottiefiles.com/packages/lf20_vPnn3K.json',
} as const;

// ─── Storyset Illustration Component ───
interface IllustrationProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Illustration({ src, alt, width = 400, height = 400, className = '' }: IllustrationProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
    />
  );
}

// ─── Lottie Animation Component ───
interface LottieAnimationProps {
  url: string;
  className?: string;
  loop?: boolean;
  style?: React.CSSProperties;
}

export function LottieAnimation({ url, className = '', loop = true, style }: LottieAnimationProps) {
  return (
    <LottieWrapper url={url} className={className} loop={loop} style={style} />
  );
}

function LottieWrapper({ url, className, loop, style }: LottieAnimationProps) {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, [url]);

  if (!data) return null;

  return <Lottie animationData={data} loop={loop} className={className} style={style} />;
}

// Need these imports for the wrapper
import { useState, useEffect } from 'react';
