const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
const dataJs = fs.readFileSync(path.join(root, 'app', 'data.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app', 'styles.css'), 'utf8');
const requiredHtml = ['Boss Up Bootcamp', 'Reserve a Spot', '20 seats', 'showcase-grid', 'waitlist-form', 'The H.I.P.H.O.P. Academy'];
const requiredData = ['DJ Just Pray', 'Voices of the Sun', 'Event + Promo Design', 'AI Generated Commercials', 'The H.I.P.H.O.P. Academy', 'Student Project Pipeline'];
const errors = [];
for (const marker of requiredHtml) if (!html.includes(marker)) errors.push(`Missing HTML marker: ${marker}`);
for (const marker of requiredData) if (!dataJs.includes(marker)) errors.push(`Missing data marker: ${marker}`);
if (!appJs.includes('renderProjects')) errors.push('Missing project renderer.');
if (!css.includes('@media')) errors.push('Missing responsive CSS media queries.');
if (!html.includes('data-form-placeholder="true"')) errors.push('Waitlist form should be clearly marked as placeholder until connected.');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Boss Up Bootcamp skeleton audit passed.');
