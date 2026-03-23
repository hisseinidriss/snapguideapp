
-- Fix Career Portal Overview Step 1 (Search): use aria-label selector
UPDATE tour_steps 
SET selector = 'input[aria-label="Search by Keyword"]',
    fallback_selectors = '["input.keywordsearch-q", "#search-wrapper input:nth-of-type(2)", "input.columnized-search"]'::jsonb,
    element_metadata = '{"tag": "input", "ariaLabel": "Search by Keyword", "type": "text", "name": "q"}'::jsonb
WHERE id = 'cb9a6f2e-d9e0-4fac-8786-27cae512c087';

-- Fix Career Portal Overview Step 2 (Search Jobs): use value-based selector
UPDATE tour_steps 
SET selector = 'input.keywordsearch-button[value="Search Jobs"]',
    fallback_selectors = '["input[value=\"Search Jobs\"]", "input.keywordsearch-button", ".search-submit input[type=\"submit\"]"]'::jsonb,
    element_metadata = '{"tag": "input", "type": "submit", "textContent": "Search Jobs"}'::jsonb
WHERE id = '2c997527-cff7-47e2-94f8-5068099bb679';
