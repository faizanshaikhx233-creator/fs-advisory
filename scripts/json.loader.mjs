// Node ESM loader that lets *any* .json import resolve without needing import attributes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    return {
      format: 'json',
      source: readFileSync(fileURLToPath(url), 'utf8'),
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}