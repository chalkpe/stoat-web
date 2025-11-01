// window.app = true;

export function goToContent() {
  if (!window.app) return;
  document.querySelector('#content')!.scrollIntoView({ behavior: 'smooth' });
}

export function goToSidebar() {
  if (!window.app) return;
  document.querySelector('#sidebar')!.scrollIntoView({ behavior: 'smooth' });
}
