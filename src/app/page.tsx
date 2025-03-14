'use client'

import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set the worker src (optional if using large PDFs)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';

const PdfOCRTextExtractor = () => {
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      {loading ? <p>Extracting text from PDF...</p> : extractedText && <pre>{extractedText}</pre>}
    </div>
  );
};

export default PdfOCRTextExtractor;