"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function parseInvoice(base64Image: string, mimeType: string) {
  try {
    const cleanBase64 = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

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

    const candidateModels = [
      "gemini-flash-lite-latest",
      "gemini-2.5-flash-lite",
      "gemini-3.1-flash-lite",
    ];

    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const result = await model.generateContent([
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "application/pdf",
            },
          },
          prompt,
        ]);

        const text = result.response.text();
        return { success: true, data: JSON.parse(text) };
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed:`, err?.message);
        continue;
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error("Gemini parse error:", error);
    return {
      success: false,
      error: error?.message || "Document parsing failed. Please try again.",
    };
  }
}