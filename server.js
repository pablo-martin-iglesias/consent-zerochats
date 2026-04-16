const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GHL_API_KEY = 'pit-ec183414-0c73-468c-b9bf-4d855ea5133b';
const GHL_LOCATION_ID = 'pJyuDyDmqRLuYm63c6Oj';
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

const GHL_HEADERS = {
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json'
};

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
    let contactId = null;

    // 1. Intentar crear contacto — si ya existe, GHL devuelve el contactId en el error
    const createRes = await fetch(`${GHL_BASE_URL}/contacts/`, {
      method: 'POST',
      headers: GHL_HEADERS,
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        firstName: cleanName,
        email: cleanEmail,
        phone: cleanPhone
      })
    });

    const createData = await createRes.json();
    console.log(`[consent] Crear/buscar contacto:`, JSON.stringify(createData).substring(0, 300));

    if (createData?.contact?.id) {
      // Contacto creado nuevo
      contactId = createData.contact.id;
      console.log(`[consent] Contacto nuevo: ${contactId}`);
    } else if (createData?.meta?.contactId) {
      // Contacto ya existía — GHL devuelve el id en meta
      contactId = createData.meta.contactId;
      console.log(`[consent] Contacto existente: ${contactId}`);
    }

    if (!contactId) throw new Error('No se pudo obtener el ID del contacto');

    // 2. Actualizar consentimiento
    const updateRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
      method: 'PUT',
      headers: GHL_HEADERS,
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        smsOptIn: true,
        callOptIn: true
      })
    });

    const updateData = await updateRes.json();
    console.log(`[consent] Update:`, JSON.stringify(updateData).substring(0, 300));

    console.log(`[consent] ✅ Consentimiento registrado para: ${cleanEmail}`);
    res.json({ success: true, email: cleanEmail, contactId });

  } catch (error) {
    console.error(`[consent] ❌ Error:`, error.message);
    res.status(500).json({ error: error.message, email: cleanEmail });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Consent server corriendo en puerto ${PORT}`);
});
