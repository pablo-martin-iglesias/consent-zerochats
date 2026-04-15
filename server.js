const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

app.post('/consent', async (req, res) => {
  const { name, phone, email } = req.body;
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.goto('https://api.leadconnectorhq.com/widget/form/vDjYVcgTJpZZ2Mf0L0TW');
    await new Promise(r => setTimeout(r, 3000));
    
    await page.type('input[name="first_name"]', name);
    await page.type('input[name="phone"]', phone);
    await page.type('input[name="email"]', email);
    await page.click('input[name="terms_and_conditions"]');
    await page.click('button[type="submit"]');
    
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
    
    res.json({ success: true, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));