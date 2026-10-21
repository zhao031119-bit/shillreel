// X (Twitter) post copy from randomized templates. No LLM required.
import type { TokenData } from './types';
import { parseNum, fmtCompact, fmtInt } from './render/util';

const HOOKS = [
  '{T} just landed on @vibevibefun and the vibes are immaculate',
  'Found {T} early on vibe/vibe. Not saying anything. Just posting the clip.',
  'POV: you scroll past {T} and regret it later',
  'gm to {T} holders only',
  '{NAME} ({T}) is cooking on vibe/vibe testnet',
  'Nobody is talking about {T} yet. That is the point.',
  'Daily reminder that {T} exists',
  'If you are reading this, you are still early on {T}',
];
const MIDS = [
  '{TAG}',
  '{STATS}',
  '{TAG}\n\n{STATS}',
  '{STATS}\n{TAG}',
];
const CTAS = ['Check it: {LINK}', 'Chart → {LINK}', 'Ape responsibly: {LINK}', 'Link: {LINK}', 'See for yourself → {LINK}'];
const TAGS = ['#vibevibe #RobinhoodChain', '#vibevibe #memecoin', '#vibevibe #testnet', '#vibevibe'];

export function makeCopy(d: TokenData, seed: number, llmText?: string): string {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const T = '$' + (d.ticker || 'TICKER').toUpperCase();
  const stats: string[] = [];
  const mc = parseNum(d.mcap);
  if (mc != null) stats.push(`MC: $${fmtCompact(mc)}`);
  const h = parseNum(d.holders);
  if (h != null) stats.push(`Holders: ${fmtInt(h)}`);
  const c = parseNum(d.change);
  if (c != null) stats.push(`24h: ${c >= 0 ? '+' : ''}${c}%`);
  const tag = d.tagline ? `“${d.tagline.trim()}”` : '';
  let mid = pick(MIDS).replace('{TAG}', tag).replace('{STATS}', stats.join(' · '));
  mid = mid.replace(/^\n+|\n+$/g, '').replace(/\n{3,}/g, '\n\n');
  const hook = llmText || pick(HOOKS);
  const parts = [hook, mid, pick(CTAS), pick(TAGS)].filter((p) => p && p.trim());
  let out = parts
    .join('\n\n')
    .replace(/\{T\}/g, T)
    .replace(/\{NAME\}/g, d.name || T)
    .replace(/\{LINK\}/g, d.link || 'https://testnet.vibevibe.fun');
  // keep under 280 (links count as 23 on X)
  const xLen = (txt: string) => txt.replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length;
  if (xLen(out) > 280 && tag) out = out.replace(tag, '').replace(/\n{3,}/g, '\n\n');
  return out;
}

export const xLength = (txt: string) => [...txt.replace(/https?:\/\/\S+/g, 'x'.repeat(23))].length;

/**
 * Optional LLM hook (OFF by default). If you want AI-written hooks, point this at a free-tier,
 * CORS-enabled endpoint you control (e.g. a Cloudflare Worker proxying a free model) and set
 * LLM_ENDPOINT. The app must keep working without it.
 */
export const LLM_ENDPOINT = '';
export async function llmHook(d: TokenData): Promise<string | undefined> {
  if (!LLM_ENDPOINT) return undefined;
  try {
    const r = await fetch(LLM_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: d.name, ticker: d.ticker, tagline: d.tagline }) });
    const j = await r.json();
    return typeof j.text === 'string' ? j.text.slice(0, 200) : undefined;
  } catch {
    return undefined;
  }
}
