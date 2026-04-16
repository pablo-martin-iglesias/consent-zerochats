const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GHL_API_KEY = 'pit-ec183414-0c73-468c-b9bf-4d855ea5133b';
const GHL_LOCATION_ID = 'pJyuDyDmqRLuYm63c6Oj';
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

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
    // 1. Buscar contacto por email
    const searchRes = await fetch(
      `${GHL_BASE_URL}/contacts/?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(cleanEmail)}`,
      {
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Version': '2021-07-28'
        }
      }
    );

    const searchData = await searchRes.json();
    console.log(`[consent] Búsqueda contacto:`, JSON.stringify(searchData).substring(0, 200));

    let contactId = searchData?.contacts?.[0]?.id;

    // 2. Si no existe, crearlo
    if (!contactId) {
      console.log(`[consent] Contacto no encontrado, creando...`);
      const createRes = await fetch(`${GHL_BASE_URL}/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId: GHL_LOCATION_ID,
          firstName: cleanName,
          email: cleanEmail,
          phone: cleanPhone
        })
      });
      const createData = await createRes.json();
      contactId = createData?.contact?.id;
      console.log(`[consent] Contacto creado: ${contactId}`);
    } else {
      console.log(`[consent] Contacto encontrado: ${contactId}`);
    }

    if (!contactId) throw new Error('No se pudo obtener el ID del contacto');

    // 3. Actualizar consentimiento SMS y llamadas
    const updateRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        smsOptIn: true,
        callOptIn: true
      })
    });

    const updateData = await updateRes.json();
    console.log(`[consent] Actualización consentimiento:`, JSON.stringify(updateData).substring(0, 200));

    console.log(`[consent] ✅ Consentimiento registrado para: ${cleanEmail}`);
    res.json({ success: true, email: cleanEmail, contactId });

  } catch (error) {
    console.error(`[consent] ❌ Error para ${cleanEmail}:`, error.message);
    res.status(500).json({ error: error.message, email: cleanEmail });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Consent server corriendo en puerto ${PORT}`);
});
