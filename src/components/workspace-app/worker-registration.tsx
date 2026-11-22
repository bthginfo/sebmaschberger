"use client";

import { useEffect } from 'react';
import { workspaceAppPath, type WorkspaceAppScope } from '@/lib/workspace-push/model';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let installEvent: InstallEvent | undefined;
const registrations = new Map<WorkspaceAppScope, Promise<ServiceWorkerRegistration | null>>();

export function workspaceInstallPrompt() {
  return Boolean(installEvent);
}

export async function promptWorkspaceInstall() {
  const event = installEvent;
  if (!event) return false;
  installEvent = undefined;
  window.dispatchEvent(new Event('workspace:install-available'));
  try {
    await event.prompt();
    return (await event.userChoice).outcome === 'accepted';
  } catch {
    return false;
  }
}

export function registerWorkspaceWorker(scope: WorkspaceAppScope) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(null);
  const previous = registrations.get(scope);
  if (previous) return previous;
  const pending = navigator.serviceWorker.register('/workspace-sw.js', { scope: workspaceAppPath(scope), updateViaCache: 'none' })
    .then(async registration => {
      if (registration.active) return registration;
      const worker = registration.installing ?? registration.waiting;
      if (!worker) return null;
      await new Promise<void>(resolve => {
        const timer = window.setTimeout(done, 7000);
        function done() {
          window.clearTimeout(timer);
          worker?.removeEventListener('statechange', change);
          resolve();
        }
        function change() {
          if (worker?.state === 'activated' || worker?.state === 'redundant') done();
        }
        worker.addEventListener('statechange', change);
        change();
      });
      return registration.active ? registration : null;
    })
    .catch(() => null)
    .then(result => {
      if (!result) registrations.delete(scope);
      return result;
    });
  registrations.set(scope, pending);
  return pending;
}

export function WorkspaceWorkerRegistration({ scope }: { scope: WorkspaceAppScope }) {
  useEffect(() => {
    function available(event: Event) {
      event.preventDefault();
      installEvent = event as InstallEvent;
      window.dispatchEvent(new Event('workspace:install-available'));
    }
    function installed() {
      installEvent = undefined;
      window.dispatchEvent(new Event('workspace:install-available'));
    }
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', installed);
    void registerWorkspaceWorker(scope);
    return () => {
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', installed);
      installed();
    };
  }, [scope]);
  return null;
}
