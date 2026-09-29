import { readFileSync } from 'node:fs';
import path from 'node:path';

import tailwindcss from '@tailwindcss/postcss';

const fontUrl = /url\((['"]?)([^'"()]+\.(woff2?))\1\)/g;
const workspaceNodeModules = path.resolve(import.meta.dirname, '../node_modules') + path.sep;

const inlineLocalFonts = {
  postcssPlugin: 'inline-local-fonts',
  Once(root) {
    const cssFile = root.source?.input.file;
    if (cssFile === undefined) return;
    root.walkDecls((declaration) => {
      if (!declaration.value.includes('.woff')) return;
      declaration.value = declaration.value.replace(
        fontUrl,
        (_match, _quote, relativePath, extension) => {
          const assetPath = path.resolve(path.dirname(cssFile), relativePath);
          if (!assetPath.startsWith(workspaceNodeModules)) {
            throw new Error(`Font asset is outside the workspace dependencies: ${relativePath}`);
          }
          return `url(data:font/${extension};base64,${readFileSync(assetPath).toString('base64')})`;
        },
      );
    });
  },
};

export default { plugins: [tailwindcss(), inlineLocalFonts] };
