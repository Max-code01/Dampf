import fs from 'fs';

const filePath = 'src/components/ClashArenaView.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// We want to replace `/images/foo_bar.png` with `/images/foo-bar.png`
// but safely.

content = content.replace(/\/images\/([a-z_]+)\.png/g, (match, p1) => {
  if (p1.startsWith('clash_')) return match;
  return `/images/${p1.replace(/_/g, '-')}.png`;
});

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done replacing image paths');
