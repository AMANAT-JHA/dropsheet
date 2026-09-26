'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function parseInvoiceFile(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No document provided.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

    const prompt = `
      You are an expert invoice and receipt scanner. Extract transaction details from this file.
      Return ONLY a clean JSON object (no markdown, no backticks, no extra text) with these exact keys:
      {
        "vendor_name": "Merchant or supplier name",
        "invoice_number": "Invoice or bill ID if present, otherwise 'N/A'",
        "date": "YYYY-MM-DD or date listed",
        "currency": "Currency symbol or code (e.g. ₹, $, INR, USD)",
        "subtotal": 0.00,
        "tax_amount": 0.00,
        "total_amount": 0.00,
        "category": "Meals, Travel, Software, Utilities, Retail, etc."
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type || 'image/jpeg',
        },
      },
    ]);

    let rawText = result.response.text().trim();
    // Strip markdown formatting if the model wraps in ```json
    rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();

    const data = JSON.parse(rawText);
    return { success: true, data };
  } catch (error: any) {
    console.error('Invoice parse error:', error);
    return { success: false, error: error.message || 'Failed to parse invoice' };
  }
}