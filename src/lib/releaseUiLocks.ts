const MODAL_TRANSITION_MS = 280;

const MANTINE_SCROLL_LOCK_CLASSES = [
  'with-scroll-bars-hidden',
  'width-before-scroll-bar',
  'right-scroll-bar-position',
] as const;

function isSwalOpen(): boolean {
  return Boolean(
    document.querySelector('.swal2-container.swal2-backdrop-show') ||
    document.body.classList.contains('swal2-shown')
  );
}

export function waitForModalClose() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, MODAL_TRANSITION_MS);
  });
}

function removeInteractivityLockClasses() {
  document.body.classList.forEach((className) => {
    if (
      className.startsWith('block-interactivity-') ||
      className.startsWith('allow-interactivity-')
    ) {
      document.body.classList.remove(className);
    }
  });

  document.querySelectorAll('[class*="block-interactivity-"], [class*="allow-interactivity-"]').forEach((el) => {
    el.classList.forEach((className) => {
      if (
        className.startsWith('block-interactivity-') ||
        className.startsWith('allow-interactivity-')
      ) {
        el.classList.remove(className);
      }
    });
  });
}

function cleanupStaleSwalContainers() {
  if (isSwalOpen()) return;

  document.body.classList.remove('swal2-shown', 'swal2-height-auto');
  document.documentElement.classList.remove('swal2-shown', 'swal2-height-auto');

  document.querySelectorAll('.swal2-container').forEach((container) => {
    container.remove();
  });
}

/** Restores pointer events and scroll after Mantine modal interactions. */
export function releaseUiLocks() {
  if (typeof document === 'undefined') return;

  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.body.style.pointerEvents = '';
  document.body.style.removeProperty('--removed-body-scroll-bar-size');
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
  document.documentElement.style.pointerEvents = '';

  MANTINE_SCROLL_LOCK_CLASSES.forEach((className) => {
    document.body.classList.remove(className);
    document.documentElement.classList.remove(className);
  });

  removeInteractivityLockClasses();
  cleanupStaleSwalContainers();
}

export function scheduleUiLockRelease() {
  releaseUiLocks();
  window.setTimeout(releaseUiLocks, 150);
  window.setTimeout(releaseUiLocks, 400);
}
