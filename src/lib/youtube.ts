export function loadYoutubeIframeApi(): Promise<any> {
  if ((window as any).YT && (window as any).YT.Player) return Promise.resolve((window as any).YT);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('YouTube API timeout')), 6000);

    (window as any).onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      resolve((window as any).YT);
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('YouTube API load error'));
    };
    document.head.appendChild(tag);
  });
}

export function extractYoutubeId(url: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function formatBookmarkTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
