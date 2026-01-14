import { Component, signal } from '@angular/core';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly deepLink = signal(this.buildDeepLink());

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

    const infoQuery = this.extractInfoQuery(search);

    return `${base}${pathSegments.join('/')}${infoQuery}`;
  }

  private extractInfoQuery(search: string): string {
    const match = search.match(/[?&]info=([^&]*)/);
    return match ? `?info=${match[1]}` : '';
  }
}
