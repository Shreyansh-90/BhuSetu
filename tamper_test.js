const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function simulateTamperingTest() {
  console.log("Starting Tampering Test Simulation...");

  // 1. Generate Legitimate Award PDF
  console.log("Generating legitimate PDF...");
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  page.drawText('FINAL AWARD DOCUMENT - LEGITIMATE', { x: 50, y: 350, size: 16 });
  page.drawText('Compensation: Rs. 100,000', { x: 50, y: 300, size: 12 });
  const legitimateBytes = await pdfDoc.save();

  // 2. Hash and store
  const legitimateHash = crypto.createHash('sha256').update(Buffer.from(legitimateBytes)).digest('hex');
  console.log("Legitimate Hash: ", legitimateHash);
  
  // 3. Save to disk (simulating storage)
  const testPdfPath = path.join(__dirname, 'test_award.pdf');
  fs.writeFileSync(testPdfPath, legitimateBytes);
  console.log("PDF Stored locally.");

  // 4. Retrieve PDF and verify success (baseline)
  const retrievedLegitimateBytes = fs.readFileSync(testPdfPath);
  const verifyHash1 = crypto.createHash('sha256').update(retrievedLegitimateBytes).digest('hex');
  if (verifyHash1 === legitimateHash) {
    console.log("Baseline Verify: SUCCESS. Hashes match.");
  } else {
    console.log("Baseline Verify: FAILED. This is a fatal error in the test harness.");
  }

  // 5. Tamper with the PDF
  console.log("Tampering with the PDF (changing compensation value)...");
  const tamperedDoc = await PDFDocument.load(retrievedLegitimateBytes);
  const pages = tamperedDoc.getPages();
  pages[0].drawText('EXTRA 50,000 ADDED ILLEGALLY', { x: 50, y: 250, size: 12, color: { type: 'RGB', red: 1, green: 0, blue: 0 } });
  const tamperedBytes = await tamperedDoc.save();
  
  // Save tampered PDF back to disk
  fs.writeFileSync(testPdfPath, tamperedBytes);
  console.log("Tampered PDF saved.");

  // 6. Run Application Verification Mechanism
  const retrievedTamperedBytes = fs.readFileSync(testPdfPath);
  const verifyHash2 = crypto.createHash('sha256').update(retrievedTamperedBytes).digest('hex');
  
  console.log("Re-calculated Hash: ", verifyHash2);
  if (verifyHash2 === legitimateHash) {
    console.log("Tamper Detection: FAILED (Hashes incorrectly matched).");
  } else {
    console.log("Tamper Detection: SUCCESS. Tampering detected! Hash mismatch.");
  }

  // Cleanup
  fs.unlinkSync(testPdfPath);
  console.log("Cleanup complete.");
}

simulateTamperingTest().catch(console.error);
