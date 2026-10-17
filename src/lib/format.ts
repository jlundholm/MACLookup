import type { Formats } from './types';

export function formats(canonical: string): Formats {
  return {
    plain: canonical,
    colon: [canonical.slice(0, 2), canonical.slice(2, 4), canonical.slice(4, 6),
            canonical.slice(6, 8), canonical.slice(8, 10), canonical.slice(10, 12)].join(':'),
    cisco: [canonical.slice(0, 4), canonical.slice(4, 8), canonical.slice(8, 12)].join('.'),
    hyphen: [canonical.slice(0, 2), canonical.slice(2, 4), canonical.slice(4, 6),
             canonical.slice(6, 8), canonical.slice(8, 10), canonical.slice(10, 12)].join('-'),
  };
}
