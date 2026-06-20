// Maps normalised player names → static image paths in /public/images/
const IMAGE_MAP: Record<string, string> = {
  'lionel messi':      '/images/messi.jpg',
  'messi':             '/images/messi.jpg',
  'erling haaland':    '/images/erling.jpg',
  'haaland':           '/images/erling.jpg',
  'jude bellingham':   '/images/jude.jpg',
  'bellingham':        '/images/jude.jpg',
  'kylian mbappé':     '/images/mbappe.jpg',
  'kylian mbappe':     '/images/mbappe.jpg',
  'mbappé':            '/images/mbappe.jpg',
  'mbappe':            '/images/mbappe.jpg',
  'kevin de bruyne':   '/images/kevin.jpg',
  'de bruyne':         '/images/kevin.jpg',
  'cristiano ronaldo': '/images/ronaldo.jpg',
  'ronaldo':           '/images/ronaldo.jpg',
  'virgil van dijk':   '/images/van.jpg',
  'van dijk':          '/images/van.jpg',
  'neymar':            '/images/neymar.jpg',
  'neymar jr':         '/images/neymar.jpg',
  'neymar jr.':        '/images/neymar.jpg',
  'luka modrić':       '/images/luka.jpg',
  'luka modric':       '/images/luka.jpg',
  'modrić':            '/images/luka.jpg',
  'modric':            '/images/luka.jpg',
  'sergio ramos':      '/images/sergio.jpg',
  'sergio':            '/images/sergio.jpg',
};

/** Returns the image path for a player name, or null if no image is available. */
export function getPlayerImage(name: string): string | null {
  const key = name
    .toLowerCase()
    .replace(/\s*\(red\)/i, '')
    .replace(/\s*\(blue\)/i, '')
    .trim();
  return IMAGE_MAP[key] ?? null;
}
