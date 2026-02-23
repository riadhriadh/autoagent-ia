import { mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Setup AutoAgent IA\n');

// Créer les répertoires nécessaires
const dirs = [
  'workspace',
  'data',
  'logs',
  'cache',
  'whatsapp-session',
];

console.log('📁 Création des répertoires...');
dirs.forEach((dir) => {
  const path = join(rootDir, dir);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
    console.log(`  ✓ ${dir}`);
  } else {
    console.log(`  ✓ ${dir} (existe déjà)`);
  }
});

// Copier .env.example vers .env si .env n'existe pas
console.log('\n⚙️  Configuration...');
const envExample = join(rootDir, '.env.example');
const envFile = join(rootDir, '.env');

if (!existsSync(envFile)) {
  copyFileSync(envExample, envFile);
  console.log('  ✓ Fichier .env créé à partir de .env.example');
  console.log('  ⚠️  N\'oubliez pas de configurer vos paramètres dans .env');
} else {
  console.log('  ✓ .env existe déjà');
}

console.log('\n✅ Setup terminé!\n');
console.log('📋 Prochaines étapes:\n');
console.log('1. Installer Ollama depuis https://ollama.ai');
console.log('2. Télécharger le modèle: ollama pull phi3:mini');
console.log('3. Configurer .env avec vos paramètres');
console.log('4. Lancer l\'agent: npm run dev\n');
console.log('Pour plus d\'informations, consultez le README.md');
