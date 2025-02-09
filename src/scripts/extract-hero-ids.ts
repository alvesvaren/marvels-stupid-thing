import fs from 'fs';
import path from 'path';

// Read the HTML file
const htmlPath = path.join(__dirname, '..', 'data', 'heroes.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Extract hero IDs, names and classes from the HTML
const heroMatches = html.matchAll(/<img[\s\S]*?img_heroportrait_(\d+)0010_portrait\.png[\s\S]*?alt="([^"]+)"[\s\S]*?<img class="hero-class" width="24" src="\/images\/(\w+)\.png" alt="([^"]+)" \/>/g);
const heroes = Array.from(heroMatches).map(([_, id, name, heroClass]) => ({
  id: id,
  name: name,
  class: heroClass.trim()
}));

// Create the hero mappings
const heroNames = heroes.reduce((acc, hero) => {
  acc[hero.id] = hero.name;
  return acc;
}, {} as Record<string, string>);

const heroClasses = heroes.reduce((acc, hero) => {
  acc[hero.id] = hero.class;
  return acc;
}, {} as Record<string, string>);

// Generate the TypeScript file
const output = `export const heroNames: Record<string, string> = ${JSON.stringify(heroNames, null, 2)};

export const heroClasses: Record<string, string> = ${JSON.stringify(heroClasses, null, 2)};`;

// Write the output
const outputPath = path.join(__dirname, '..', 'data', 'hero-mappings.ts');
fs.writeFileSync(outputPath, output);

console.log('Hero mappings generated successfully!'); 