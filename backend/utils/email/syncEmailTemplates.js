require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, 'templates');
const TEMPLATES = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, 'templates.json'), 'utf-8'));

async function createTemplate(authKey, { name, slug, subject, file }) {
    const body = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8');

    const res = await fetch('https://control.msg91.com/api/v5/email/templates', {
        method: 'POST',
        headers: {
            authkey: authKey,
            accept: 'application/json',
            'content-type': 'application/json',
        },
        body: JSON.stringify({ name, slug, subject, body }),
    });

    const data = await res.json();
    return { slug, status: res.status, data };
}

async function main() {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
        console.error('MSG91_AUTH_KEY not set in .env');
        process.exit(1);
    }

    console.log('Syncing email templates to MSG91...\n');

    for (const tpl of TEMPLATES) {
        const result = await createTemplate(authKey, tpl);
        if (result.status === 200 || result.status === 201) {
            console.log(`  [OK] ${tpl.slug}`);
        } else {
            console.log(`  [FAIL] ${tpl.slug} — ${result.status}:`, result.data);
        }
    }

    console.log('\nDone.');
}

main();
