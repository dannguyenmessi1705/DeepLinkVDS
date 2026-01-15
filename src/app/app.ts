import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly deepLink = signal(this.buildDeepLink());
  protected readonly safeDeepLink = computed<SafeUrl>(() =>
    this.sanitizer.bypassSecurityTrustUrl(this.deepLink())
  );

  private buildDeepLink(): string {
    const base = `${environment.deepLinkHost}://`;

    if (typeof window === 'undefined') {
      return base;
    }

    const { pathname, search } = window.location;
    const pathSegments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    const hasAction = pathSegments.includes('action');

    if (!hasAction) {
      pathSegments.unshift('action');
    }

    const query = this.extractInfoQuery(search);

    return `${base}${pathSegments.join('/')}${query}`;
  }

  private extractInfoQuery(search: string): string {
    const match = search.match(/[?&]info=([^&]*)/);
    if (!match) {
      return '';
    }
    const rawInfo = match[1];
    const decodedInfo = this.safeDecodeURIComponent(rawInfo);
    return `?info=${encodeURIComponent(decodedInfo)}`;
  }

  private safeDecodeURIComponent(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
}
