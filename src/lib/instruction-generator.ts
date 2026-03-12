/**
 * Generates human-readable instructions from recorded browser events
 */
export function generateInstruction(
  actionType: string,
  elementTag: string | null,
  elementText: string | null,
  inputValue: string | null,
  selector: string | null,
  targetUrl: string | null
): string {
  const tag = (elementTag || '').toLowerCase();
  const text = (elementText || '').trim();
  const truncatedText = text.length > 50 ? text.slice(0, 47) + '...' : text;

  switch (actionType) {
    case 'click': {
      if (tag === 'button' || tag === 'a') {
        return `Click "${truncatedText || 'button'}"`;
      }
      if (tag === 'input' && !inputValue) {
        const label = getLabelFromSelector(selector);
        return `Click the ${label || 'input field'}`;
      }
      if (tag === 'select') {
        return `Click the ${getLabelFromSelector(selector) || 'dropdown'}`;
      }
      if (truncatedText) {
        return `Click "${truncatedText}"`;
      }
      return `Click the ${tag || 'element'}`;
    }

    case 'type': {
      const fieldName = getLabelFromSelector(selector) || 'field';
      if (inputValue) {
        const truncVal = inputValue.length > 40 ? inputValue.slice(0, 37) + '...' : inputValue;
        return `Enter "${truncVal}" in the ${fieldName}`;
      }
      return `Type in the ${fieldName}`;
    }

    case 'select': {
      const dropdownName = getLabelFromSelector(selector) || 'dropdown';
      if (inputValue) {
        return `Select "${inputValue}" from the ${dropdownName}`;
      }
      return `Make a selection from the ${dropdownName}`;
    }

    case 'navigate': {
      if (targetUrl) {
        try {
          const url = new URL(targetUrl);
          return `Navigate to ${url.pathname || targetUrl}`;
        } catch {
          return `Navigate to ${targetUrl}`;
        }
      }
      return 'Navigate to a new page';
    }

    case 'scroll': {
      return 'Scroll down the page';
    }

    case 'hover': {
      if (truncatedText) return `Hover over "${truncatedText}"`;
      return `Hover over the ${tag || 'element'}`;
    }

    default:
      return truncatedText ? `Interact with "${truncatedText}"` : 'Perform an action';
  }
}

function getLabelFromSelector(selector: string | null): string {
  if (!selector) return '';
  // Try to extract readable name from common patterns
  const idMatch = selector.match(/#([a-zA-Z][\w-]*)/);
  if (idMatch) {
    return idMatch[1]
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
      + ' field';
  }
  const nameMatch = selector.match(/\[name="([^"]+)"\]/);
  if (nameMatch) {
    return nameMatch[1]
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
      + ' field';
  }
  const placeholderMatch = selector.match(/\[placeholder="([^"]+)"\]/);
  if (placeholderMatch) return placeholderMatch[1] + ' field';
  return '';
}
