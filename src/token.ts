// Auto-fill token info from public, CORS-enabled sources only:
//  - Robinhood Chain testnet Blockscout explorer API (name, symbol, holders, creation tx)
//  - Robinhood Chain testnet public JSON-RPC (name()/symbol() fallback, creation receipt logs)
//  - Public IPFS gateways (vibe/vibe metadata JSON: description + logo image)
// The vibe/vibe app API rejects foreign origins, so price / market cap are not auto-filled.

export const CHAIN_ID = 46630;
export const RPC = 'https://rpc.testnet.chain.robinhood.com';
export const EXPLORER = 'https://explorer.testnet.chain.robinhood.com';
export const VIBE = 'https://testnet.vibevibe.fun';
const GATEWAYS = ['https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/', 'https://dweb.link/ipfs/', 'https://w3s.link/ipfs/'];

export interface AutoFill {
  address: string;
  name?: string;
  symbol?: string;
  holders?: number;
  description?: string;
  logo?: Blob;
  link: string;
  notes: string[];
}

export function extractAddress(input: string): string | null {
  const m = input.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0].toLowerCase() : null;
}

async function fetchT(url: string, init: RequestInit = {}, ms = 9000): Promise<Response> {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(id);
  }
}

async function rpc(method: string, params: unknown[]) {
  const r = await fetchT(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

function decodeAbiString(hex: string): string {
  const h = hex.replace(/^0x/, '');
  if (h.length < 128) {
    // bytes32 style
    const bytes = h.match(/../g)?.map((b) => parseInt(b, 16)).filter((b) => b) ?? [];
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  const len = parseInt(h.slice(64, 128), 16);
  const data = h.slice(128, 128 + len * 2);
  const bytes = data.match(/../g)?.map((b) => parseInt(b, 16)) ?? [];
  return new TextDecoder().decode(new Uint8Array(bytes));
}

async function erc20Str(addr: string, selector: string) {
  try {
    return decodeAbiString(await rpc('eth_call', [{ to: addr, data: selector }, 'latest']));
  } catch {
    return undefined;
  }
}

async function ipfsFetch(uri: string, ms = 10000): Promise<Response> {
  const cid = uri.replace(/^ipfs:\/\//, '').replace(/^ipfs\//, '');
  // first gateway immediately, the others staggered (public gateways rate-limit aggressively)
  const tries = GATEWAYS.map(async (g, i) => {
    if (i) await new Promise((r) => setTimeout(r, 1200 * i));
    const r = await fetchT(g + cid, {}, ms);
    if (!r.ok) throw new Error(String(r.status));
    return r;
  });
  return Promise.any(tries);
}

function hexToAscii(hex: string) {
  const h = hex.replace(/^0x/, '');
  let s = '';
  for (let i = 0; i + 1 < h.length; i += 2) {
    const c = parseInt(h.slice(i, i + 2), 16);
    s += c >= 32 && c < 127 ? String.fromCharCode(c) : ' ';
  }
  return s;
}

export async function autoFill(input: string, onStep?: (s: string) => void): Promise<AutoFill> {
  const address = extractAddress(input);
  if (!address) throw new Error('Paste a vibe/vibe token link or a 0x… contract address.');
  const out: AutoFill = { address, link: `${VIBE}/token/${address}`, notes: [] };

  onStep?.('Reading token from Robinhood Chain explorer…');
  let creationTx: string | undefined;
  try {
    const [tok, addr] = await Promise.all([
      fetchT(`${EXPLORER}/api/v2/tokens/${address}`).then((r) => (r.ok ? r.json() : null)),
      fetchT(`${EXPLORER}/api/v2/addresses/${address}`).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (tok) {
      out.name = tok.name ?? undefined;
      out.symbol = tok.symbol ?? undefined;
      if (tok.holders_count != null) out.holders = Number(tok.holders_count);
    }
    if (addr) creationTx = addr.creation_transaction_hash || addr.creation_tx_hash || undefined;
  } catch {
    out.notes.push('Explorer API unreachable; used RPC.');
  }
  if (!out.name || !out.symbol) {
    onStep?.('Reading name() / symbol() via RPC…');
    out.name ??= await erc20Str(address, '0x06fdde03');
    out.symbol ??= await erc20Str(address, '0x95d89b41');
  }
  if (!out.name && !out.symbol) throw new Error('No ERC-20 token found at that address on Robinhood Chain testnet.');

  // vibe/vibe metadata: the launch tx emits an event carrying "ipfs://<cid>" of the metadata JSON
  if (creationTx) {
    try {
      onStep?.('Looking up vibe/vibe metadata (logo, description)…');
      const rc = await rpc('eth_getTransactionReceipt', [creationTx]);
      let uri: string | undefined;
      for (const l of rc?.logs ?? []) {
        const m = hexToAscii(l.data).match(/ipfs:\/\/[A-Za-z0-9]{20,}/);
        if (m) { uri = m[0]; break; }
      }
      if (uri) {
        const meta = await (await ipfsFetch(uri)).json();
        if (typeof meta.description === 'string') out.description = meta.description;
        const img = meta.image?.uri || (typeof meta.image === 'string' ? meta.image : undefined);
        if (img) {
          onStep?.('Downloading logo from IPFS…');
          const r = img.startsWith('ipfs://') ? await ipfsFetch(img) : await fetchT(img);
          out.logo = await r.blob();
        }
      } else out.notes.push('No vibe/vibe metadata found (maybe not a vibe/vibe launch).');
    } catch {
      out.notes.push('Logo/description could not be loaded from IPFS — upload the logo manually.');
    }
  }
  return out;
}
