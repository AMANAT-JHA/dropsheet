"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function parseInvoice(base64Image: string, mimeType: string) {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
Extract all receipt or invoice data from this document into clean JSON matching this structure:
{
  "vendor": "Store or Vendor name",
  "date": "YYYY-MM-DD or readable date",
  "invoiceNumber": "Invoice/Bill ID or empty string",
  "tax": "Total tax/GST amount or 0",
  "total": "Final total amount",
  "items": [
    {
      "description": "Item or product name",
      "quantity": "Quantity or 1",
      "unitPrice": "Price per item",
      "totalPrice": "Total price for this item"
    }
  ]
}
If any field is missing on the receipt, supply an empty string or 0. Return only valid JSON.
`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || "image/jpeg",
        },
      },
      prompt,
    ]);

    const text = result.response.text();
    const parsedData = JSON.parse(text);

    return { success: true, data: parsedData };
  } catch (error: any) {
    console.error("Gemini parse error:", error);
    return { success: false, error: error?.message || "Failed to parse document" };
  }
}