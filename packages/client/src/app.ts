// @ts-ignore
import createScrollSnap from 'scroll-snap'

window.app = true;

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
