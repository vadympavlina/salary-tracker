import type { CloudBackend } from './types';
import { firebaseBackend } from './firebaseBackend';
import { fakeBackend } from './fakeBackend';

declare global {
  interface Window {
    __SALARY_FAKE_CLOUD__?: boolean;
  }
}

export const cloudBackend: CloudBackend = typeof window !== 'undefined' && window.__SALARY_FAKE_CLOUD__ ? fakeBackend : firebaseBackend;

export type { CloudBackend, CloudUser, RemoteData, SyncMeta } from './types';
