import { execSync } from 'node:child_process';

/** Short commit id for the stamp: the CI commit when there is one, otherwise the checked-out one. */
export function currentCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 8);
  try {
    return execSync('git rev-parse --short=8 HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'no-commit';
  }
}

/**
 * Runs inside the browser, before the page's own scripts. Adds a thin bar at the bottom of every page with a live
 * clock (local time with offset, and UTC), so any screenshot or video frame shows when it was taken, plus which
 * commit, browser and test produced it. The bar sits in a closed shadow root and ignores the pointer, so it does
 * not change locators, clicks or layout. It must stay self-contained, because Playwright serializes it.
 */
export function installTimestampOverlay(info: { label: string }): void {
  const build = (): void => {
    const root = document.documentElement;
    if (!root || document.getElementById('qa-evidence-stamp')) return;

    const host = document.createElement('div');
    host.id = 'qa-evidence-stamp';
    host.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;pointer-events:none;';
    const shadow = host.attachShadow({ mode: 'closed' });
    const bar = document.createElement('div');
    bar.style.cssText =
      'font:12px/20px Consolas,Menlo,monospace;background:rgba(0,0,0,.8);color:#fff;padding:0 8px;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    shadow.appendChild(bar);
    root.appendChild(host);

    const pad = (n: number, length = 2): string => String(n).padStart(length, '0');
    const tick = (): void => {
      const d = new Date();
      const offset = -d.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const zone = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)} ${zone}`;
      bar.textContent = `${local}  |  UTC ${d.toISOString().slice(11, 23)}Z  |  ${info.label}`;
    };
    tick();
    setInterval(tick, 40);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
}
