'use client'

import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set the worker src (optional if using large PDFs)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';

// Define types for the transactions
type Transaction = {
  date: string;
  description: string;
  amount: number;
};

type ParsedStatement = {
  deposits: Transaction[];
  withdrawals: Transaction[];
};

// Helper function to clean and split lines
function cleanAndSplit(text: string): string[] {
  return text.split('\n').map(line => line.trim()).filter(line => line);
}

// Helper function to parse a transaction line (for Deposits, Withdrawals, etc.)
function parseTransactionLine(line: string): Transaction | null {
  // Example line: 10/03 PREAUTHORIZED CREDIT ~~ PAYROLL 0987654678990 763.01,10/16 PREAUTHORIZED CREDIT US TREASURY 310 SOC SEC 020802 509499853A SSA 763.01
  const parts = line.split(/\s{2,}/); // Split on 2+ spaces (for description and amount)
  if (parts.length === 3) {
    return {
      date: parts[0],
      description: parts[1].trim(),
      amount: parseFloat(parts[2].replace(/,/g, ''))
    };
  }
  return null;
}

// Main function to parse the statement
function parseStatement(text: string): ParsedStatement {
  const sections: ParsedStatement = {
    deposits: [],
    withdrawals: []
  };

  // Split into sections using known section headers
  const depositsSection = text.split('Deposits and Other Credits')[1]?.split('Withdrawals and Other Debits')[0] || '';
  console.log(`deposits section: ${depositsSection}`);
  const withdrawalsSection = text.split('Withdrawals and Other Debits')[1]?.split('Account Service Charges and Fees')[0] || '';

  // Parse Deposits and Credits
  const depositLines = cleanAndSplit(depositsSection);
  console.log(`deposit lines: ${depositLines}`);
  depositLines.forEach(line => {
    const transaction = parseTransactionLine(line);
    console.log(`transaction: ${transaction}`);
    if (transaction) sections.deposits.push(transaction);
  });

  // Parse Withdrawals and Debits
  const withdrawalLines = cleanAndSplit(withdrawalsSection);
  withdrawalLines.forEach(line => {
    const transaction = parseTransactionLine(line);
    if (transaction) sections.withdrawals.push(transaction);
  });

  return sections;
}

const PdfOCRTextExtractor = () => {
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [parsedStatement, setParsedStatement] = useState<ParsedStatement | null>(null);

  useEffect(() => {
    extractedText && setParsedStatement(parseStatement(extractedText));
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
      {loading ? <p>Extracting text from PDF...</p> : parsedStatement && <pre>
                                                                    FIRST DEPOSIT: {parsedStatement.deposits[0]?.description}{'\n'}
                                                                    FIRST WITHDRAWAL: {parsedStatement.withdrawals[0]?.description}{'\n'}
                                                                    ENTIRE DOC:{'\n' + extractedText}</pre>}
    </div>
  );
};

export default PdfOCRTextExtractor;
