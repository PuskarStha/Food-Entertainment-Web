import html2canvas from 'html2canvas';

/**
 * Robustly sanitizes a raw CSS stylesheet string by replacing modern,
 * unsupported CSS color functions (like oklch, oklab, and color-mix)
 * which would normally cause html2canvas's built-in CSS parser to throw.
 */
export function cleanUnsupportedCSS(cssText: string): string {
  if (!cssText) return '';
  
  // 1. Strip color-space prefixes in gradients such as "in oklab," and "in oklch,"
  let cleaned = cssText
    .replace(/in\s+oklab\s*,/gi, '')
    .replace(/in\s+oklch\s*,/gi, '');
    
  // 2. Locate and parse nested parenthesis blocks for oklab(, oklch(, and color-mix(
  // and replace them with standard fallback 'transparent' keyword
  const targets = ['oklab(', 'oklch(', 'color-mix('];
  let result = '';
  let i = 0;
  const len = cleaned.length;
  while (i < len) {
    let flag = false;
    for (const target of targets) {
      if (cleaned.substring(i, i + target.length).toLowerCase() === target) {
        flag = true;
        let openCount = 1;
        let j = i + target.length;
        while (j < len && openCount > 0) {
          if (cleaned[j] === '(') openCount++;
          else if (cleaned[j] === ')') openCount--;
          j++;
        }
        result += 'transparent';
        i = j;
        break;
      }
    }
    if (!flag) {
      result += cleaned[i];
      i++;
    }
  }
  return result;
}

/**
 * A safe wrapper for html2canvas that ensures oklch and oklab styles
 * do not cause a crash. All document style sheets are temporarily cleaned
 * and automatically restored right after rendering.
 */
export async function safeHtml2Canvas(element: HTMLElement, options: any = {}) {
  const styleElements = Array.from(document.querySelectorAll('style'));
  const originalContents = new Map<HTMLStyleElement, string>();

  try {
    for (const style of styleElements) {
      const text = style.textContent || '';
      if (
        text.includes('oklab') || 
        text.includes('oklch') || 
        text.includes('color-mix')
      ) {
        originalContents.set(style, text);
        style.textContent = cleanUnsupportedCSS(text);
      }
    }

    return await html2canvas(element, options);
  } finally {
    // Instantly restore all stylesheets
    for (const [style, originalText] of originalContents.entries()) {
      style.textContent = originalText;
    }
  }
}
