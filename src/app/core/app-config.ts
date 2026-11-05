import { InjectionToken } from '@angular/core';

export interface AppConfig {
  readonly eventName: string;
  readonly eventShortName: string;
  readonly eventNameParts: readonly [string, string];
}

export const EVENT_NAME = 'Mundo SENAI';
export const EVENT_SHORT_NAME = 'MS';

export const DEFAULT_APP_CONFIG: AppConfig = {
  eventName: EVENT_NAME,
  eventShortName: EVENT_SHORT_NAME,
  eventNameParts: ['Mundo', 'SENAI'],
};

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');
