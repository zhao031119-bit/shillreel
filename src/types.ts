export interface TokenData {
  name: string;
  ticker: string; // without $
  tagline: string;
  logo: CanvasImageSource | null;
  logoW: number;
  logoH: number;
  price: string; // free text, e.g. "0.00042"
  mcap: string; // e.g. "1.2M"
  holders: string; // e.g. "6787"
  change: string; // 24h change %, e.g. "+38"
  link: string; // full URL to the token page
  address: string;
}

export interface RenderOpts {
  W: number;
  H: number;
  duration: number; // seconds
  seed: number;
  bpm: number;
}

export interface Template {
  id: string;
  name: string;
  blurb: string;
  bpm: number;
  music: 'hype' | 'chill' | 'trap' | 'news' | 'chip' | 'epic' | 'lux' | 'cyber';
  /** normalized (12s) time used for the picker thumbnail */
  thumbT?: number;
  swatch: string[];
  /** called once per (data, opts) change; may build caches */
  prepare?(data: TokenData, o: RenderOpts): void;
  draw(ctx: CanvasRenderingContext2D, t: number, data: TokenData, o: RenderOpts): void;
}
