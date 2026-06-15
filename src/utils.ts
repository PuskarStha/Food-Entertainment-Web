import { toCanvas } from 'html-to-image';

/**
 * A safe wrapper for capturing the element.
 * We switched from html2canvas to html-to-image which has much better
 * support for modern CSS features like oklch(), color-mix(), and Tailwind v4.
 */
export async function safeHtml2Canvas(element: HTMLElement, options: any = {}) {
  const htiOptions: any = {
    pixelRatio: options.scale || 1,
    backgroundColor: options.backgroundColor === null ? 'transparent' : options.backgroundColor,
  };
  
  return await toCanvas(element, htiOptions);
}
