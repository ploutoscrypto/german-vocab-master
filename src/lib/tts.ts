/**
 * Offline German pronunciation via the Web Speech API (`speechSynthesis`).
 * No network needed — the OS/browser provides the voices. Degrades silently
 * when unsupported.
 */
let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => loadVoices();
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(langPrefix: string): SpeechSynthesisVoice | undefined {
  const voices = voicesCache.length ? voicesCache : loadVoices();
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix)) ??
    voices.find((v) => v.lang?.toLowerCase().includes(langPrefix))
  );
}

export function speak(text: string, lang = 'de-DE'): void {
  if (!ttsSupported() || !text.trim()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    const voice = pickVoice(lang.slice(0, 2).toLowerCase());
    if (voice) utter.voice = voice;
    utter.rate = 0.95;
    utter.pitch = 1;
    synth.speak(utter);
  } catch {
    /* ignore — pronunciation is a nice-to-have */
  }
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
