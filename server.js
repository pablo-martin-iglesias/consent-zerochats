const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FORM_URL = 'https://api.leadconnectorhq.com/widget/form/vDjYVcgTJpZZ2Mf0L0TW';

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Consent server running' });
});

app.post('/consent', async (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'Faltan campos: name, phone, email' });
  }

  const cleanName = String(name).replace(/^=/, '').trim();
  const cleanPhone = String(phone).replace(/^=/, '').trim();
  const cleanEmail = String(email).replace(/^=/, '').trim();

  console.log(`[consent] Procesando: ${cleanEmail}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
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
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`[consent] Navegando al formulario...`);
    await page.goto(FORM_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    await page.waitForSelector('input[name="first_name"]', { visible: true, timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    console.log(`[consent] Formulario cargado`);

    // Forzar valores via JavaScript para compatibilidad con Vue/React
    await page.evaluate((name, phone, email) => {
      const setVal = (selector, value) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error('Campo no encontrado: ' + selector);
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      };
      setVal('input[name="first_name"]', name);
      setVal('input[name="phone"]', phone);
      setVal('input[name="email"]', email);
    }, cleanName, cleanPhone, cleanEmail);

    console.log(`[consent] Campos rellenados`);
    await new Promise(r => setTimeout(r, 1000));

    // Checkbox
    const checkbox = await page.$('input[name="terms_and_conditions"]');
    if (!checkbox) throw new Error('Checkbox no encontrado');
    const isChecked = await page.evaluate(el => el.checked, checkbox);
    if (!isChecked) await checkbox.click();
    console.log(`[consent] Checkbox marcado`);
    await new Promise(r => setTimeout(r, 500));

    // Submit
    const submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) throw new Error('Boton submit no encontrado');
    await submitBtn.click();
    console.log(`[consent] Formulario enviado`);

    await new Promise(r => setTimeout(r, 5000));

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('[consent] Post-submit:', bodyText.substring(0, 200));

    const submitted = !bodyText.includes('captcha') && !bodyText.includes('Captcha');

    console.log(`[consent] ✅ Completado para: ${cleanEmail} | submitted: ${submitted}`);
    res.json({ success: true, email: cleanEmail, submitted });

  } catch (error) {
    console.error(`[consent] ❌ Error:`, error.message);
    res.status(500).json({ error: error.message, email: cleanEmail });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`✅ Consent server corriendo en puerto ${PORT}`);
});
