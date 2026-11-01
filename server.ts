import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Google Sheet live sync proxy endpoint
  // Allows fetching any public Google Sheet without CORS errors
  app.get('/api/sheets/fetch', async (req, res) => {
    try {
      const { url, sheetId, sheetName } = req.query;

      let targetUrl = '';
      if (url && typeof url === 'string') {
        // Extract Sheet ID from URL if provided
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          const id = match[1];
          targetUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
          if (sheetName) {
            targetUrl += `&sheet=${encodeURIComponent(String(sheetName))}`;
          }
        } else if (url.includes('format=csv') || url.includes('output=csv')) {
          targetUrl = url;
        } else {
          targetUrl = url;
        }
      } else if (sheetId && typeof sheetId === 'string') {
        targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
        if (sheetName) {
          targetUrl += `&sheet=${encodeURIComponent(String(sheetName))}`;
        }
      } else {
        return res.status(400).json({ error: 'Missing url or sheetId parameter' });
      }

      console.log('Fetching Google Sheet CSV from:', targetUrl);
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/csv,text/plain,*/*',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Google Sheets responded with status ${response.status}. กรุณาตรวจสอบว่าชีตได้รับการตั้งค่าเป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู" (Anyone with the link can view)`,
        });
      }

      const csvData = await response.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(csvData);
    } catch (err: any) {
      console.error('Error proxying Google Sheet:', err);
      return res.status(500).json({
        error: 'Failed to fetch Google Sheet: ' + (err.message || 'Unknown error'),
      });
    }
  });

  // Sample CSV template endpoint
  app.get('/api/sheets/sample-csv', (req, res) => {
    const csvContent = `วันที่,ประเภท,เลขที่เอกสาร,เลขอ้างอิง,ชื่อลูกค้า/ผู้รับเงิน,เลขประจำตัวผู้เสียภาษี,หมวดบัญชี,รายละเอียด,จำนวนเงิน,ภาษีมูลค่าเพิ่ม,หัก ณ ที่จ่าย 3%,ยอดสุทธิ,ธนาคาร,สถานะ
2026-09-01,RV,RV-202609-001,INV-6901,บจก. เคมีภัณฑ์ไทยแลนด์,0105557019283,รายได้ค่าบริการตรวจสอบบัญชี,ค่าสอบบัญชีประจำปี 2568,120000,8400,3600,124800,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)
2026-09-05,PV,PV-202609-001,CPA-01,นาย ชัยวัฒน์ สุขสวัสดิ์ (CPA),3100800129482,ค่าส่วนต่างค่าสอบบัญชี (40%),ค่าสอบบัญชีงวดที่ 1 (40%),48000,0,1440,46560,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)
2026-09-08,RV,RV-202609-002,INV-6902,บจก. บางกอก ดีไซน์ สตูดิโอ,0105559021145,รายได้ค่าบริการอื่นๆ,ค่าจัดทำระบบบัญชีและภาษีอากร,45000,3150,1350,46800,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)
2026-09-12,PV,PV-202609-002,CMS-02,นาย วีระยุทธ มิตรประสิทธิ์,1100500412891,ค่านายหน้า,ค่านายหน้าแนะนำลูกค้าตรวจสอบบัญชี,18000,0,540,17460,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)
2026-09-18,PV,PV-202609-003,OFF-01,บจก. มณียา เรียลเอสเตท,0105548019281,ค่าเช่าและสาธารณูปโภค,ค่าเช่าพื้นที่สำนักงานประจำเดือน,25000,1750,1250,25500,ธนาคารไทยพาณิชย์ (SCB),ชำระแล้ว (Completed)`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="AccountPlanet_Vouchers_Sample.csv"');
    res.send('\uFEFF' + csvContent);
  });

  // AI Tax & Legal Compliance Assistant endpoint
  app.post('/api/gemini/tax-advisor', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          advice: 'ระบบให้คำแนะนำตามมาตรฐานประมวลรัษฎากร: บริษัทต้องจัดทำใบเสร็จรับเงิน/ใบกำกับภาษีตามมาตรา 86/4 พร้อมหักภาษี ณ ที่จ่าย 3% และออกหนังสือรับรอง 50 ทวิ สำหรับค่าบริการตรวจสอบบัญชีและค่านายหน้า (พร้อมใช้งานระบบคำนวณมาตรฐาน)',
          modelUsed: 'rule-based-fallback',
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const { prompt, voucherContext } = req.body;

      const systemPrompt = `คุณคือผู้เชี่ยวชาญด้านกฎหมายภาษีอากรไทย และมาตรฐานการบัญชีของกรมสรรพากร (Revenue Department of Thailand) สำหรับ "บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด" (สำนักงานบัญชีและสอบบัญชี)
ตอบคำถามอย่างมืออาชีพ ถูกต้องตามประมวลรัษฎากร มาตรา 86/4 (ใบกำกับภาษี), มาตรา 105 (ใบเสร็จรับเงิน), มาตรา 3 เตรส (ภาษีหัก ณ ที่จ่าย 3% ค่าบริการวิชาชีพและค่านายหน้า), และมาตรา 65 ตรี (รายจ่ายต้องห้าม เช่น ค่าส่วนต่างค่าสอบบัญชี 40%) ให้คำแนะนำเป็นข้อๆ ชัดเจน นำไปปฏิบัติได้จริง`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nบริบทเอกสาร: ${JSON.stringify(voucherContext || {})}\n\nคำถาม: ${prompt || 'วิเคราะห์ความถูกต้องและข้อควรระวังในการออกใบกำกับภาษีและใบเสร็จรับเงิน'}` }] },
        ],
      });

      const adviceText = response.text || 'ไม่สามารถสร้างคำตอบได้';
      return res.json({ advice: adviceText, modelUsed: 'gemini-2.5-flash' });
    } catch (error: any) {
      console.error('Gemini Tax Advisor error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
