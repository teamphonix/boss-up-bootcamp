const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
const dataJs = fs.readFileSync(path.join(root, 'app', 'data.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app', 'styles.css'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'app', 'admin.html'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, 'app', 'admin.js'), 'utf8');
const vercelConfig = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');
const requiredHtml = ['Boss Up Bootcamp', 'Reserve a Spot', '$25 Registration', 'showcase-grid', 'checkout-form', 'Continue to Stripe', 'The H.I.P.H.O.P. Academy'];
const requiredData = ['DJ Just Pray', 'Voices of the Sun', 'Event + Promo Design', 'AI Generated Commercials', 'The H.I.P.H.O.P. Academy', 'Student Project Pipeline'];
const errors = [];
for (const marker of requiredHtml) if (!html.includes(marker)) errors.push(`Missing HTML marker: ${marker}`);
for (const marker of requiredData) if (!dataJs.includes(marker)) errors.push(`Missing data marker: ${marker}`);
if (!appJs.includes('renderProjects')) errors.push('Missing project renderer.');
if (!css.includes('@media')) errors.push('Missing responsive CSS media queries.');
if (!adminHtml.includes('Boss Up Control Room')) errors.push('Missing admin control room page.');
if (!adminJs.includes('/api/admin-data')) errors.push('Missing admin data API binding.');
if (!vercelConfig.includes('api/**/*.js') || !vercelConfig.includes('/admin/?')) errors.push('Missing Vercel API/admin routing.');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Boss Up Bootcamp skeleton audit passed.');
