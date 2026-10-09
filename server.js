import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const APPS_FILE = path.join(__dirname, 'data', 'apps.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MAX_REQUEST_BODY_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_REQUEST_BYTES = 4 * 1024 * 1024;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

async function readApps() {
    try {
        const content = await fs.promises.readFile(APPS_FILE, 'utf8');
        const data = JSON.parse(content);
        if (!Array.isArray(data.apps)) {
            throw new Error('O arquivo de aplicativos possui um formato inválido.');
        }
        return data.apps;
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

async function writeApps(apps, onlyIfMissing = false) {
    await fs.promises.mkdir(path.dirname(APPS_FILE), { recursive: true });
    const content = JSON.stringify({ apps }, null, 2);

    if (onlyIfMissing) {
        try {
            const file = await fs.promises.open(APPS_FILE, 'wx');
            try {
                await file.writeFile(content, 'utf8');
            } finally {
                await file.close();
            }
            return apps;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            return readApps();
        }
    }

    const temporaryFile = `${APPS_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(temporaryFile, content, 'utf8');
    await fs.promises.rename(temporaryFile, APPS_FILE);
    return apps;
}

async function readRequestJson(req, maxBytes = MAX_REQUEST_BODY_BYTES) {
    const chunks = [];
    let size = 0;

    for await (const chunk of req) {
        size += chunk.length;
        if (size > maxBytes) {
            const error = new Error('O conteúdo enviado excede o limite permitido.');
            error.statusCode = 413;
            throw error;
        }
        chunks.push(chunk);
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        const error = new Error('O corpo da requisição deve conter JSON válido.');
        error.statusCode = 400;
        throw error;
    }
}

async function saveUploadedImage(imageData) {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(imageData || '');
    if (!match) {
        const error = new Error('Formato de imagem inválido. Use PNG, JPG ou WEBP.');
        error.statusCode = 400;
        throw error;
    }

    const mimeType = match[1];
    const image = Buffer.from(match[2], 'base64');
    if (image.length > MAX_IMAGE_BYTES) {
        const error = new Error('A imagem excede o limite de 2 MB.');
        error.statusCode = 413;
        throw error;
    }

    const isPng = mimeType === 'image/png' && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = mimeType === 'image/jpeg' && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
    const isWebp = mimeType === 'image/webp' &&
        image.toString('ascii', 0, 4) === 'RIFF' &&
        image.toString('ascii', 8, 12) === 'WEBP';
    if (!isPng && !isJpeg && !isWebp) {
        const error = new Error('O conteúdo do arquivo não corresponde a uma imagem PNG, JPG ou WEBP válida.');
        error.statusCode = 400;
        throw error;
    }

    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/jpeg' ? 'jpg' : 'webp';
    const filename = `${randomUUID()}.${extension}`;
    await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), image, { flag: 'wx' });
    return `/uploads/${filename}`;
}

async function buildManifestResponse(req, pathname) {
    const appId = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams.get('app') || '';
    const apps = await readApps() || [];
    const match = apps.find(app => String(app.id) === String(appId));
    const scriptDirectory = pathname.replace(/\/manifest\.php$/i, '');
    const basePath = scriptDirectory === '/manifest.php' ? '' : scriptDirectory;
    const appName = match?.name || 'AppHub Studio';
    const startUrl = `${basePath}/index.html${appId ? `?app=${encodeURIComponent(appId)}` : ''}`;
    const manifest = {
        id: `${basePath || '/'}${appId ? `?app=${encodeURIComponent(appId)}` : ''}`,
        name: appName,
        short_name: appName.length > 12 ? appName.slice(0, 12) : appName,
        description: 'Aplicativo disponível na AppHub Studio.',
        start_url: startUrl,
        scope: `${basePath || '/'}${basePath ? '/' : ''}`,
        display: 'standalone',
        background_color: '#030712',
        theme_color: '#090d16',
        icons: []
    };
    return manifest;
}

const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
    const isAppsEndpoint = pathname === '/api/apps' || pathname === '/api/apps.php' || pathname === '/apps.php';
    const isBootstrapEndpoint = pathname === '/api/apps/bootstrap' ||
        (pathname === '/api/apps.php' && req.method === 'POST') ||
        (pathname === '/apps.php' && req.method === 'POST');
    const isUploadsEndpoint = pathname === '/api/uploads' || pathname === '/api/uploads.php' || pathname === '/uploads.php';

    if (isAppsEndpoint || pathname === '/api/apps/bootstrap' || isUploadsEndpoint) {
        try {
            if (isUploadsEndpoint && req.method === 'POST') {
                const { image } = await readRequestJson(req, MAX_IMAGE_REQUEST_BYTES);
                sendJson(res, 201, { url: await saveUploadedImage(image) });
                return;
            }

            if (isAppsEndpoint && req.method === 'GET') {
                sendJson(res, 200, { apps: await readApps() });
                return;
            }

            if (isBootstrapEndpoint && req.method === 'POST') {
                const { apps } = await readRequestJson(req);
                if (!Array.isArray(apps)) {
                    sendJson(res, 400, { error: 'A lista de aplicativos é inválida.' });
                    return;
                }
                sendJson(res, 200, { apps: await writeApps(apps, true) });
                return;
            }

            if (isAppsEndpoint && req.method === 'PUT') {
                const { apps } = await readRequestJson(req);
                if (!Array.isArray(apps)) {
                    sendJson(res, 400, { error: 'A lista de aplicativos é inválida.' });
                    return;
                }
                sendJson(res, 200, { apps: await writeApps(apps) });
                return;
            }

            res.setHeader('Allow', isAppsEndpoint ? 'GET, PUT, POST' : 'POST');
            sendJson(res, 405, { error: 'Método não permitido.' });
        } catch (error) {
            console.error('Erro ao processar o catálogo compartilhado:', error);
            sendJson(res, error.statusCode || 500, {
                error: error.statusCode ? error.message : 'Não foi possível acessar o catálogo compartilhado.'
            });
        }
        return;
    }

    if (pathname === '/manifest.php') {
        try {
            const manifest = await buildManifestResponse(req, pathname);
            res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
            res.end(JSON.stringify(manifest, null, 2));
        } catch (error) {
            console.error('Erro ao processar o manifesto:', error);
            sendJson(res, 500, { error: 'Não foi possível carregar os dados do aplicativo.' });
        }
        return;
    }

    if (pathname.startsWith('/uploads/')) {
        const filename = pathname.slice('/uploads/'.length);
        if (req.method !== 'GET' || !/^[a-f0-9-]+\.(?:png|jpg|webp)$/.test(filename)) {
            sendJson(res, 404, { error: 'Imagem não encontrada.' });
            return;
        }

        const filePath = path.join(UPLOADS_DIR, filename);
        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(error.code === 'ENOENT' ? 404 : 500);
                res.end(error.code === 'ENOENT' ? 'Imagem não encontrada.' : 'Erro ao carregar imagem.');
                return;
            }
            res.writeHead(200, {
                'Content-Type': MIME_TYPES[path.extname(filename)],
                'Cache-Control': 'public, max-age=31536000, immutable'
            });
            res.end(content);
        });
        return;
    }

    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.readFile(path.join(__dirname, 'index.html'), (err, indexContent) => {
                    if (err) {
                        res.writeHead(500);
                        res.end('Erro Interno do Servidor');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(indexContent, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end(`Erro no servidor: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const k in interfaces) {
        for (const k2 of interfaces[k]) {
            if (k2.family === 'IPv4' && !k2.internal) {
                addresses.push(k2.address);
            }
        }
    }
    return addresses;
}

server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIpAddresses();
    console.log('\n======================================================');
    console.log(`🚀 AppHub Studio Web App rodando!`);
    console.log(`🌐 No seu computador: http://localhost:${PORT}`);
    if (ips.length > 0) {
        console.log(`📱 Na mesma rede Wi-Fi (celular/outros PCs): http://${ips[0]}:${PORT}`);
    }
    console.log('======================================================\n');
});
