#!/usr/bin/env node

/**
 * Génère un JWT de test signé avec une clé locale pour vérifier la vérification
 * JWT avant le déploiement avec Cloudflare Access.
 *
 * Ce script génère une clé RSA et un JWT en mémoire — la clé n'est jamais
 * sauvegardée sur disque ni exposée en production. Le JWT généré est valide
 * pour la signature et les réclamations, mais signé avec une clé locale.
 *
 * Pour utiliser ce jeton en local avec Cloudflare Access actif :
 * 1. Créer un petit serveur qui expose la clé publique en JWKS sur localhost
 * 2. Configurer CF_ACCESS_TEAM_DOMAIN et USE_LOCAL_JWKS
 * Cette approche n'est recommandée que pour le développement : jamais en production.
 *
 * Usage:
 *   node scripts/generate-test-jwt.js <email> [aud]
 *
 * Exemple:
 *   node scripts/generate-test-jwt.js frederic@frdigital.fr 050126b5a263e33a60286081066478dcab4ec98f0412022516a38478cfa6c938
 */

import { generateKeyPairSync } from 'crypto';
import { SignJWT, exportSPKI } from 'jose';

const email = process.argv[2];
const aud = process.argv[3] || '050126b5a263e33a60286081066478dcab4ec98f0412022516a38478cfa6c938';

if (!email) {
  console.error('Usage: node scripts/generate-test-jwt.js <email> [aud]');
  console.error('Exemple: node scripts/generate-test-jwt.js frederic@frdigital.fr');
  process.exit(1);
}

async function generateTestJWT() {
  try {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 86400;

    const jwt = await new SignJWT({
      email: email.toLowerCase(),
      aud: [aud],
      iss: 'https://le47.cloudflareaccess.com',
      sub: email,
      iat: now,
      exp: now + expiresIn,
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .sign(privateKey);

    const publicKeyPem = await exportSPKI(publicKey);

    console.log('\n' + '='.repeat(80));
    console.log('JWT DE TEST (CLÉ LOCALE — DÉVELOPPEMENT UNIQUEMENT)');
    console.log('='.repeat(80) + '\n');

    console.log('Email:', email.toLowerCase());
    console.log('Audience (AUD):', aud);
    console.log('Issuer: https://le47.cloudflareaccess.com');
    console.log('Valide jusqu\'au:', new Date((now + expiresIn) * 1000).toISOString());

    console.log('\n' + '─'.repeat(80));
    console.log('JETON JWT:');
    console.log('─'.repeat(80));
    console.log(jwt);

    console.log('\n' + '─'.repeat(80));
    console.log('UTILISATION AVEC CURL:');
    console.log('─'.repeat(80));
    console.log(`curl -H "Cf-Access-Jwt-Assertion: ${jwt}" \\`);
    console.log('  http://localhost:3000/api/whoami');

    console.log('\n' + '─'.repeat(80));
    console.log('POUR TESTER AVEC LA VÉRIFICATION JWT EN LOCAL:');
    console.log('─'.repeat(80));
    console.log('⚠ La clé utilisée ici est LOCALE et ne fonctionnera PAS avec Cloudflare.');
    console.log('');
    console.log('1. En développement (simple): EDIT_ENABLED=true, pas de JWT requis');
    console.log('');
    console.log('2. Pour tester la vérification JWT avec une clé locale:');
    console.log('   a) Créer un serveur JWKS local qui expose publicKey');
    console.log('   b) Configurer CF_ACCESS_TEAM_DOMAIN=localhost:port');
    console.log('   c) Utiliser le JWT ci-dessus');
    console.log('');
    console.log('3. En production: Cloudflare Access génère et signe les jetons');
    console.log('   Aucune clé locale n\'est utilisée.');

    console.log('\n' + '─'.repeat(80));
    console.log('CLÉ PUBLIQUE (pour test local avec serveur JWKS):');
    console.log('─'.repeat(80));
    console.log(publicKeyPem);

    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

generateTestJWT();
