const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FORM_URL = 'https://api.leadconnectorhq.com/widget/form/vDjYVcgTJpZZ2Mf0L0TW';

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Consent server running' });
});

app.post('/consent', async (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'Faltan campos: name, phone, email' });
  }

  console.log(`[consent] Procesando: ${email}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });

    const page = await browser.newPage();

    // User agent realista para evitar bloqueos
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1280, height: 800 });

    console.log(`[consent] Navegando al formulario...`);
    await page.goto(FORM_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Esperar a que el formulario esté listo
    await page.waitForSelector('input[name="first_name"]', { timeout: 15000 });
    console.log(`[consent] Formulario cargado`);

    // Rellenar campos con pequeño delay entre keystrokes (más humano)
    await page.type('input[name="first_name"]', name, { delay: 50 });
    await new Promise(r => setTimeout(r, 300));

    await page.type('input[name="phone"]', phone, { delay: 50 });
    await new Promise(r => setTimeout(r, 300));

    await page.type('input[name="email"]', email, { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

    // Click en checkbox de consentimiento
    const checkbox = await page.$('input[name="terms_and_conditions"]');
    if (!checkbox) throw new Error('Checkbox de consentimiento no encontrado');
    await checkbox.click();
    await new Promise(r => setTimeout(r, 500));

    // Submit
    const submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) throw new Error('Botón submit no encontrado');
    await submitBtn.click();

    // Esperar confirmación (éxito o redirección)
    await new Promise(r => setTimeout(r, 4000));

    // Verificar si el formulario fue enviado (opcional: buscar mensaje de éxito)
    const pageContent = await page.content();
    const submitted = pageContent.includes('success') || 
                      pageContent.includes('gracias') || 
                      pageContent.includes('thank') ||
                      pageContent.includes('submitted');

    console.log(`[consent] ✅ Completado para: ${email}`);
    res.json({ success: true, email, submitted });

  } catch (error) {
    console.error(`[consent] ❌ Error para ${email}:`, error.message);
    res.status(500).json({ error: error.message, email });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Consent server corriendo en puerto ${PORT}`);
});
//coment