// @ts-ignore
import createScrollSnap from 'scroll-snap'
import type { Client } from "stoat.js";

// window.app = true;

export function initializeScrollSnap() {
  if (!window.app) return;

  const layoutElement = document.querySelector('#layout');
  if (layoutElement) {
    createScrollSnap(layoutElement, {
      snapDestinationX: '100vw',
      threshold: 0.6,
    }).bind();
  }
}

export function goToContent() {
  if (!window.app) return;
  document.querySelector('#content')!.scrollIntoView({ behavior: 'smooth' });
}

export function goToSidebar() {
  if (!window.app) return;
  document.querySelector('#sidebar')!.scrollIntoView({ behavior: 'smooth' });
}

declare global {
  interface Window {
    app: boolean;

    ToastApp: {
      subscribePush: (...args: Parameters<Client['account']['webPushSubscribe']>) => void;
    };
  }
}

export function initToastApp(client: Client) {
  if (!window.app) return;
  window.ToastApp = {
    subscribePush: (...args) => client.account.webPushSubscribe(...args),
  };
}
