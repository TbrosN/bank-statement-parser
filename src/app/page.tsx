'use client'

import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import Parser from './Parser';
import FileUploadButton from './FileUploadButton';
import AccountInformation from './AccountInformation';

// Set the worker src (optional if using large PDFs)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';

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
    <div className="flex justify-center min-h-screen bg-gray-100 py-10 justify-center">
      <div className="flex-column">
        <FileUploadButton onFileChange={handleFileChange} />
        <div className="mt-5">
          {loading && <p>Loading...</p>}
          {parser && <AccountInformation name={parser.getCustomerName()}
                                        address={parser.getAddress()}
                                        totalDeposits={parser.getTotalDeposits()}
                                        totalWithdrawals={parser.getTotalAtmWithdrawals()}
                                        purchases={parser.getWalmartPurchases()} />}
        </div>
      </div>
    </div>
  );
};

export default PdfOCRTextExtractor;