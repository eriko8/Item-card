// Express server to serve static files and inject API key/base via meta tags for the front-end.
const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY || 'public-demo-key-12345';
const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE || 'http://localhost:5000';

app.use(express.static(__dirname, { extensions: ['html'] }));

function injectMeta(html) {
    const keyMeta = `<meta name="public-api-key" content="${PUBLIC_API_KEY}">`;
    const baseMeta = `<meta name="public-api-base" content="${PUBLIC_API_BASE}">`;
    // Remove any existing injected meta tags so updated .env values take effect after restart
    let updated = html.replace(/<meta name="public-api-(key|base)"[^>]*>/g, '');
    // Inject fresh tags
    updated = updated.replace(/<head(.*?)>/i, (m) => `${m}\n    ${keyMeta}\n    ${baseMeta}`);
    return updated;
}

['/', '/shop', '/shop.html'].forEach(route => {
    app.get(route, (req, res, next) => {
        const file = path.join(__dirname, 'shop.html');
        fs.readFile(file, 'utf8', (err, data) => {
            if (err) return next(err);
            res.type('html').send(injectMeta(data));
        });
    });
});

app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
    console.log(`Item-card server running: http://localhost:${PORT}`);
    console.log('Meta tags injected: public-api-key, public-api-base');
});