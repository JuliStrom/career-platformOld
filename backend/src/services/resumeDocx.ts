import * as yauzl from "yauzl";
import mammoth from "mammoth";

const MAX_EXPANDED_BYTES = 20 * 1024 * 1024;

/** Verify actual streamed output, not just attacker-controlled ZIP size headers. */
export async function readDocx(buffer: Buffer): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true },
      (error, zip) => {
        if (error || !zip) {
          reject(error || new Error("invalid_archive"));
          return;
        }
        let bytes = 0,
          entries = 0,
          hasDocument = false,
          finished = false;
        const fail = (error: Error) => {
          if (finished) return;
          finished = true;
          zip.close();
          reject(error);
        };
        const timeout = setTimeout(
          () => fail(new Error("archive_timeout")),
          5000,
        );
        zip.on("close", () => clearTimeout(timeout));
        zip.on("error", fail);
        zip.on("entry", (entry) => {
          if (
            ++entries > 1000 ||
            entry.uncompressedSize > MAX_EXPANDED_BYTES ||
            entry.isEncrypted()
          ) {
            fail(new Error("invalid_archive"));
            return;
          }
          if (entry.fileName === "word/document.xml") hasDocument = true;
          if (entry.fileName.endsWith("/")) {
            zip.readEntry();
            return;
          }
          zip.openReadStream(entry, (error, stream) => {
            if (error || !stream) {
              fail(error || new Error("invalid_archive"));
              return;
            }
            stream.on("error", fail);
            stream.on("data", (chunk) => {
              bytes += chunk.length;
              if (bytes > MAX_EXPANDED_BYTES) {
                stream.destroy();
                fail(new Error("archive_too_large"));
              }
            });
            stream.on("end", () => {
              if (!finished) zip.readEntry();
            });
          });
        });
        zip.on("end", () => {
          if (finished) return;
          if (!hasDocument) {
            fail(new Error("invalid_docx"));
            return;
          }
          finished = true;
          clearTimeout(timeout);
          resolve();
        });
        zip.readEntry();
      },
    );
  });
  const text = (await mammoth.extractRawText({ buffer })).value;
  if (text.trim().length < 30 || text.length > 80000)
    throw new Error("invalid_resume_length");
  return text;
}
