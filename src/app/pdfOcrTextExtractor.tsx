'use client'

import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set the worker src (optional if using large PDFs)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';

// Constants for parsing
const CUSTOMER_NAME_LINE = 3;
const ADDRESS_LINES = [CUSTOMER_NAME_LINE+1, CUSTOMER_NAME_LINE+2];

type Purchase = {
  date: string;
  amount: number;
  description: string;
}

class Parser {
  private lines: string[];

  private customerName: string;
  // TODO: Parse address further??
  private address: string;
  private totalDeposits: number;
  private totalAtmWithdrawals: number;
  private walmartPurchases: Purchase[];

  private parsingDeposits: boolean;
  private parsingWithdrawals: boolean;

  public getCustomerName(): string{ return this.customerName; }
  public getAddress(): string{ return this.address; }
  public getTotalDeposits(): number{ return this.totalDeposits; }
  public getTotalAtmWithdrawals(): number{ return this.totalAtmWithdrawals; }
  public getWalmartPurchases(): Purchase[]{ return this.walmartPurchases; }

  constructor(text: string) {
    this.lines = [];
    this.customerName = '';
    this.address = '';
    this.totalDeposits = 0;
    this.totalAtmWithdrawals = 0;
    this.walmartPurchases = [];
    this.parsingDeposits = false;
    this.parsingWithdrawals = false;

    const inputLines = text.split(/\r?\n/); // Split text by line breaks (handles both \n and \r\n)
    for (var line of inputLines) {
      this.lines.push(line);
      this.parseLine(line);
    }
  }

  // Returns true if `bigString` contains `substring`, or false otherwise.
  // NOTE: This function is not case-sensitive
  private stringContains(bigString: string, substrings: string[]): boolean {
    for (var sub of substrings) {
      if (!bigString.toLowerCase().includes(sub.toLowerCase())) {
        return false;
      }
    }
    return true;
  }

  /* Given a sequence of string lists A(n-1),A(n-2),A(n-3),...,A2,A1,A0,
   * checks whether the past n lines contain the corresponding string list,
   * i.e. lines[-k] contains Ak for every k = 0,1,..., n-1.
   * Returns true if all containments hold, or false otherwise.
   * 
   * In particular, calling this function on a single string list checks whether
   * the current line contains all substrings in the list.
  */
  private pastLinesMatch(...substringLists: string[][]): boolean {
    for (var i = substringLists.length-1; i >= 0; i--) {
      var k = substringLists.length - i - 1;
      var subList = substringLists[i];
      const line: string | undefined = this.lines[this.lines.length-1-k];
      if (line === undefined || !this.stringContains(line, subList)) {
        return false;
      }
    }
    return true;
  }

  public parseLine(line: string): void {
    if (this.lines.length === CUSTOMER_NAME_LINE) {
      this.customerName = line
    }
    else if (ADDRESS_LINES.includes(this.lines.length)) {
      this.address += line
      if (ADDRESS_LINES.indexOf(this.lines.length) < ADDRESS_LINES.length-1)
        this.address += ', ';
    }
    else if (this.pastLinesMatch(["Deposits and Other Credits"], ["Date", "Description", "Amount"], [])) {
      this.parsingDeposits = true;
    }
    else if (this.pastLinesMatch(["Withdrawals and Other Debits"])) {
      this.parsingDeposits = false;
    }
    else if (this.pastLinesMatch(["Withdrawals and Other Debits"], ["Date", "Description", "Amount"], [])) {
      this.parsingWithdrawals = true;
    }
    else if (this.pastLinesMatch(["Account Service Charges and Fees"])) {
      this.parsingWithdrawals = false;
    }

    if (this.parsingDeposits) {
        // console.log(`line: ${line}`);
        var row = line.split(/\s+/);
        // console.log(`row length: ${row.length}, row: ${row}`);
        this.totalDeposits += Number(row.at(-1));
    }
    if (this.parsingWithdrawals) {
      var row = line.split(/\s+/);
      let amount = Number(row.at(-1));
      let date = row[0];
      if (this.pastLinesMatch(["ATM WITHDRAWAL"]))
        this.totalAtmWithdrawals += amount;
      if (this.pastLinesMatch(["WAL-MART"]) || this.pastLinesMatch(["WAL-MART"])) {
        let myPurchase: Purchase = {
          date: date,
          amount: amount,
          description: row.slice(1,-1).join(" ")
        }
        this.walmartPurchases.push(myPurchase);
      }
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
      {loading ? <p>Extracting text from PDF...</p> : parser && <pre>NAME: {parser.getCustomerName()}{'\n'}
                                                                    ADDRESS: {parser.getAddress()}{'\n'}
                                                                    TOTAL DEPOSITS: {parser.getTotalDeposits()}{'\n'}
                                                                    TOTAL ATM WITHDRAWALS: {parser.getTotalAtmWithdrawals()}{'\n'}
                                                                    WALMART PURCHASES: {parser.getWalmartPurchases()[0].description}{'\n'}
                                                                    ENTIRE DOC:{'\n' + extractedText}</pre>}
    </div>
  );
};

export default PdfOCRTextExtractor;