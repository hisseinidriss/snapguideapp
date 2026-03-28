/**
 * Instruction generator - converts raw recorded browser events into human-readable instructions
 * Used by the Scribe recording feature to auto-label captured steps (Hissein 3-21-2026)
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
  // Truncate long text to keep instructions readable - Hissein
  const truncatedText = text.length > 50 ? text.slice(0, 47) + '...' : text;

  switch (actionType) {
    // Click action - generates contextual descriptions based on element type (3-14-2026)
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

    // Type action - describes text entry with field name extracted from selector (Hissein 3-21-2026)
    case 'type': {
      const fieldName = getLabelFromSelector(selector) || 'field';
      if (inputValue) {
        const truncVal = inputValue.length > 40 ? inputValue.slice(0, 37) + '...' : inputValue;
        return `Enter "${truncVal}" in the ${fieldName}`;
      }
      return `Type in the ${fieldName}`;
    }

    // Select action - dropdown/combobox selection - Hissein
    case 'select': {
      const dropdownName = getLabelFromSelector(selector) || 'dropdown';
      if (inputValue) {
        return `Select "${inputValue}" from the ${dropdownName}`;
      }
      return `Make a selection from the ${dropdownName}`;
    }

    // Navigate action - page transition with URL path extraction (3-18-2026)
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

    // Hover action - mouse-over interaction
    case 'hover': {
      if (truncatedText) return `Hover over "${truncatedText}"`;
      return `Hover over the ${tag || 'element'}`;
    }

    default:
      return truncatedText ? `Interact with "${truncatedText}"` : 'Perform an action';
  }
}

/**
 * Extract a human-readable field name from a CSS selector (3-11-2026)
 * Parses ID, name attribute, and placeholder patterns to generate readable labels
 */
function getLabelFromSelector(selector: string | null): string {
  if (!selector) return '';
  // Try to extract readable name from ID selector (e.g., #firstName → "First Name field") - Hissein
  const idMatch = selector.match(/#([a-zA-Z][\w-]*)/);
  if (idMatch) {
    return idMatch[1]
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
      + ' field';
  }
  // Try name attribute (e.g., [name="email"] → "Email field") (Hissein 3-21-2026)
  const nameMatch = selector.match(/\[name="([^"]+)"\]/);
  if (nameMatch) {
    return nameMatch[1]
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
      + ' field';
  }
  // Try placeholder attribute for input fields
  const placeholderMatch = selector.match(/\[placeholder="([^"]+)"\]/);
  if (placeholderMatch) return placeholderMatch[1] + ' field';
  return '';
}
