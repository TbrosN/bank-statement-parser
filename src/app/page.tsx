'use client'

import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set the worker src (optional if using large PDFs)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';

// Constants for parsing
const CUSTOMER_NAME_LINE = 3;
const ADDRESS_LINES = [CUSTOMER_NAME_LINE+1, CUSTOMER_NAME_LINE+2];

class Purchase {
  private date: string;
  private amount: number;
  private description: string;

  constructor(date: string, amount: number, description: string) {
    this.date = date;
    this.amount = amount;
    this.description = description;
  }
}

class Parser {
  private lineCount: number;
  private customerName: string;
  // TODO: Parse address further??
  private address: string;
  private totalDeposits: number;
  private totalAtmWithdrawals: number;
  private walmartPurchases: Purchase[];

  public getCustomerName(): string{ return this.customerName; }
  public getAddress(): string{ return this.address; }

  constructor(text: string) {
    this.lineCount = 0;
    this.customerName = '';
    this.address = '';
    this.totalDeposits = 0;
    this.totalAtmWithdrawals = 0;
    this.walmartPurchases = [];

    const lines = text.split(/\r?\n/); // Split text by line breaks (handles both \n and \r\n)
    lines.forEach((line, _) => {
      this.parseLine(line);
      this.lineCount += 1;
    });
  }

  public parseLine(line: string): void {
    if (this.lineCount == CUSTOMER_NAME_LINE) {
      this.customerName = line
    }
    else if (ADDRESS_LINES.includes(this.lineCount)) {
      this.address += line
      if (ADDRESS_LINES.indexOf(this.lineCount) < ADDRESS_LINES.length-1)
        this.address += ', ';
    }
  }
}

const PdfOCRTextExtractor = () => {
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [parser, setParser] = useState<Parser | null>(null);

  useEffect(() => {
    extractedText && setParser(new Parser(extractedText));
  }, [extractedText]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        setLoading(true);
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);

        // Load the PDF document
        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        let combinedText = '';

        // Loop through each page and extract text using OCR
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);

          // Set up canvas to render PDF page
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Render PDF page to canvas
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;

          // Perform OCR on the rendered image
          const ocrResult = await Tesseract.recognize(canvas, 'eng', {
            logger: (m) => console.log(m), // Optional logger
          });

          combinedText += ocrResult.data.text;
        }

        setExtractedText(combinedText);
        setLoading(false);
      };

      reader.readAsArrayBuffer(file); // Read file as binary (required for PDF.js)
    }
  };

  return (
    <div>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {loading ? <p>Extracting text from PDF...</p> : parser && <pre>NAME: {parser.getCustomerName()}, ADDRESS: {parser.getAddress()}</pre>}
    </div>
  );
};

export default PdfOCRTextExtractor;