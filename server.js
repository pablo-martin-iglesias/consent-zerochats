const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FORM_ID = 'vDjYVcgTJpZZ2Mf0L0TW';
const LOCATION_ID = 'pJyuDyDmqRLuYm63c6Oj';
const FORM_SUBMIT_URL = `https://backend.leadconnectorhq.com/forms/submit?formId=${FORM_ID}&locationId=${LOCATION_ID}`;

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

  try {
    const sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    const timestamp = Date.now();

    const payload = new URLSearchParams({
      formId: FORM_ID,
      locationId: LOCATION_ID,
      formData: JSON.stringify({
        first_name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        terms_and_conditions: 'Al registrarte, confirmas que has leído y aceptas los Términos y Condiciones',
        formId: FORM_ID,
        location_id: LOCATION_ID,
        sessionId: sessionId,
        eventData: {
          source: 'direct',
          referrer: '',
          keyword: '',
          adSource: '',
          url_params: {},
          page: {
            url: `https://api.leadconnectorhq.com/widget/form/${FORM_ID}`,
            title: ''
          },
          timestamp: timestamp,
          campaign: '',
          contactSessionIds: { ids: [sessionId] },
          fbp: '',
          fbc: '',
          type: 'page-visit',
          parentId: FORM_ID,
          pageVisitType: 'form',
          domain: 'api.leadconnectorhq.com',
          version: 'v3',
          parentName: 'aceptar términos y condiciones',
          fingerprint: null,
          documentURL: `https://api.leadconnectorhq.com/widget/form/${FORM_ID}`,
          fbEventId: sessionId,
          medium: 'form',
          mediumId: FORM_ID
        },
        Timezone: 'Europe/Madrid (GMT+02:00)',
        paymentContactId: {},
        timeSpent: 10
      }),
      captchaV3: 'bypass'
    });

    const submitRes = await fetch(FORM_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://api.leadconnectorhq.com',
        'Referer': `https://api.leadconnectorhq.com/widget/form/${FORM_ID}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: payload.toString()
    });

    const responseText = await submitRes.text();
    console.log(`[consent] Submit response ${submitRes.status}:`, responseText.substring(0, 300));

    if (submitRes.status === 201 || submitRes.status === 200) {
      console.log(`[consent] ✅ Formulario enviado para: ${cleanEmail}`);
      res.json({ success: true, email: cleanEmail });
    } else {
      throw new Error(`Submit falló con status ${submitRes.status}: ${responseText.substring(0, 200)}`);
    }

  } catch (error) {
    console.error(`[consent] ❌ Error:`, error.message);
    res.status(500).json({ error: error.message, email: cleanEmail });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Consent server corriendo en puerto ${PORT}`);
});
