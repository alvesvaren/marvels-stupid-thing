import fs from 'fs';
import path from 'path';

// Read the HTML file
const htmlPath = path.join(__dirname, '..', 'data', 'heroes.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Extract hero IDs and names from the HTML
const heroMatches = html.matchAll(/<img[\s\S]*?img_heroportrait_(\d+)0010_portrait\.png[\s\S]*?alt="([^"]+)"[\s\S]*?>/g);
const heroes = Array.from(heroMatches).map(([_, id, name]) => ({
  id: id,
  name: name
}));

// Create the hero mappings
const heroMappings = heroes.reduce((acc, hero) => {
  acc[hero.id] = hero.name;
  return acc;
}, {} as Record<string, string>);

// Generate the TypeScript file
const output = `export const heroNames: Record<string, string> = ${JSON.stringify(heroMappings, null, 2)};`;

// Write the output
const outputPath = path.join(__dirname, '..', 'data', 'hero-mappings.ts');
fs.writeFileSync(outputPath, output);

console.log('Hero mappings generated successfully!'); 