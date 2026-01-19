import { Component, OnDestroy, OnInit, signal } from '@angular/core';

import { environment } from '../environments/environment';

type Platform = 'android' | 'ios';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly deepLink = signal(this.buildDeepLink());

  private fallbackTimer: number | null = null;
  private cleanupHandlers: Array<() => void> = [];
  private pageHidden = false;
  private readonly fallbackTimeoutMs = 1500;

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.getPlatform()) {
      return;
    }

    this.openDeepLinkWithFallback();
  }

  ngOnDestroy(): void {
    this.clearFallback();
  }

  protected onOpenAppClick(event: MouseEvent): void {
    event.preventDefault();
    this.openDeepLinkWithFallback();
  }

  private openDeepLinkWithFallback(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const platform = this.getPlatform();
    const fallbackUrl = platform ? this.getFallbackUrl(platform) : null;

    if (fallbackUrl) {
      this.startFallbackTimer(fallbackUrl);
    }

    window.location.href = this.deepLink();
  }

  private startFallbackTimer(fallbackUrl: string): void {
    this.clearFallback();
    this.pageHidden = false;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.pageHidden = true;
        this.clearFallback();
      }
    };

    const onPageHide = () => {
      this.pageHidden = true;
      this.clearFallback();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    this.cleanupHandlers.push(() =>
      document.removeEventListener('visibilitychange', onVisibilityChange)
    );
    this.cleanupHandlers.push(() =>
      window.removeEventListener('pagehide', onPageHide)
    );

    this.fallbackTimer = window.setTimeout(() => {
      this.clearFallback();
      if (!this.pageHidden) {
        window.location.href = fallbackUrl;
      }
    }, this.fallbackTimeoutMs);
  }

  private clearFallback(): void {
    if (this.fallbackTimer !== null) {
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    this.cleanupHandlers.forEach((cleanup) => cleanup());
    this.cleanupHandlers = [];
  }

  private buildDeepLink(): string {
    const base = this.buildDeepLinkBase();

    if (typeof window === 'undefined') {
      return base;
    }

    const { pathname, search } = window.location;
    const pathSegments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    const hasAction = pathSegments.includes('action');

    if (!hasAction) {
      pathSegments.unshift('action');
    }

    const infoQuery = this.extractInfoQuery(search);

    const path = this.normalizePathSegments(pathSegments).join('/');
    if (!path) {
      return `${base}${infoQuery}`;
    }

    const separator = base.endsWith('://') ? '' : '/';
    return `${base}${separator}${path}${infoQuery}`;
  }

  private extractInfoQuery(search: string): string {
    const match = search.match(/[?&]info=([^&]*)/);
    return match ? `?info=${match[1]}` : '';
  }

  private normalizePathSegments(segments: string[]): string[] {
    const normalized: string[] = [];

    for (let index = 0; index < segments.length; index += 1) {
      const current = segments[index];
      const next = segments[index + 1];

      if ((current === 'https:' || current === 'http:') && next) {
        normalized.push(`${current}//${next}`);
        index += 1;
        continue;
      }

      normalized.push(current);
    }

    return normalized;
  }

  private buildDeepLinkBase(): string {
    const rawHost = environment.deepLinkHost.trim();
    const normalizedHost = rawHost.replace(
      /^([a-z][a-z0-9+.-]*):\/(?!\/)/i,
      '$1://'
    );

    if (normalizedHost.includes('://')) {
      if (normalizedHost.endsWith('://')) {
        return normalizedHost;
      }
      return normalizedHost.replace(/\/+$/, '');
    }

    const scheme = normalizedHost.replace(/:+$/, '');
    return `${scheme}://`;
  }

  private getPlatform(): Platform | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const platform = params.get('platform')?.toLowerCase();

    if (!platform) {
      return null;
    }

    if (platform === 'ios' || platform === 'iphone' || platform === 'ipad') {
      return 'ios';
    }

    if (platform === 'android') {
      return 'android';
    }

    return null;
  }

  private getFallbackUrl(platform: Platform): string | null {
    if (platform === 'ios') {
      return environment.iosStoreUrl;
    }

    if (platform === 'android') {
      return environment.androidStoreUrl;
    }

    return null;
  }
}
