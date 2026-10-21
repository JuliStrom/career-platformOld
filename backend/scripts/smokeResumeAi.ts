import dotenv from "dotenv";
import path from "path";
import {
  extractResume,
  evaluateResume,
  AnalysisError,
} from "../src/services/resumeAi";
import { renderPdfPages } from "../src/services/resumePdf";
import { resumeLevel } from "../src/schemas/resumeAnalysis";

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const requestedModel = process.argv
  .find((value) => value.startsWith("--model="))
  ?.slice(8);
if (requestedModel) process.env.AI_MODEL = requestedModel;

function syntheticPdf(text: string) {
  const lines = text
    .split("\n")
    .flatMap((line) => line.match(/.{1,85}(?:\s|$)/g) || [line]);
  const commands = [
    "BT /F1 10 Tf 40 790 Td",
    ...lines.flatMap((line, index) => [
      ...(index ? ["0 -16 Td"] : []),
      `(${line.replace(/[\\()]/g, "\\$&")}) Tj`,
    ]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((value) => `${String(value).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

async function syntheticScan(text: string) {
  const [url] = await renderPdfPages(syntheticPdf(text));
  const { createCanvas, loadImage } = require("@napi-rs/canvas");
  const image = await loadImage(Buffer.from(url.split(",")[1], "base64"));
  const canvas = createCanvas(image.width, image.height);
  canvas.getContext("2d").drawImage(image, 0, 0);
  const jpeg: Buffer = canvas.toBuffer("image/jpeg");
  const commands = "q 595 0 0 842 0 0 cm /Im1 Do Q";
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>"),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, Buffer.from("\nendstream")]),
    Buffer.from(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`),
  ];
  const chunks = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from("\nendobj\n"));
  }
  const xref = Buffer.concat(chunks).length;
  chunks.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return Buffer.concat(chunks);
}

async function main() {
  const signal = new AbortController().signal;
  // Synthetic fixture only: no real personal data is sent by this script.
  const text = `Resume. Alex Example. Frontend Developer. Minsk, Belarus.
Experience: Example Studio, Frontend Developer, January 2022 to September 2025.
Built React and TypeScript dashboards, integrated REST APIs and wrote unit tests.
Reduced initial page load time by 20 percent by splitting bundles.
Skills: React, TypeScript, JavaScript, CSS, Git, REST APIs, Jest.
Education: Example University, Computer Science bachelor, 2017 to 2021.
Languages: Russian native, English B2. Seeking remote frontend work in Germany.`;
  const extracted = await extractResume(
    process.argv.includes("--scan")
      ? { kind: "pdf", name: "synthetic-scan.pdf", data: await syntheticScan(text) }
      : process.argv.includes("--pdf")
      ? { kind: "pdf", name: "synthetic-resume.pdf", data: syntheticPdf(text) }
      : { kind: "text", name: "synthetic-resume.txt", text },
    signal,
  );
  console.log(
    JSON.stringify({
      stage: "extracted",
      model: extracted.model,
      language: extracted.value.language,
    }),
  );
  if (process.argv.includes("--extract-only")) return;
  const evaluated = await evaluateResume(
    extracted.value,
    {
      jobLocation: "abroad",
      targetCountry: "Germany",
      desiredRole: "Frontend Developer",
      outputLanguage: "en",
      responseLanguage: "ru",
      consent: "true",
    },
    signal,
  );
  const score = Object.values(evaluated.value.criteria).reduce(
    (sum, value) => sum + value.score,
    0,
  );
  console.log(
    JSON.stringify({
      stage: "evaluated",
      model: evaluated.model,
      score,
      level: resumeLevel(score),
      problems: evaluated.value.problems.length,
      outputLanguage: evaluated.value.improvedResume.language,
    }),
  );
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : "smoke_failed",
      ...(error instanceof AnalysisError
        ? { upstreamStatus: error.upstreamStatus, diagnostic: error.diagnostic }
        : {}),
    }),
  );
  process.exitCode = 1;
});
