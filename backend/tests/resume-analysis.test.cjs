const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const express = require("express");
const { once } = require("node:events");
const { z } = require("zod");
const Resume = require("../dist/src/models/ResumeAnalysis").default;
const User = require("../dist/src/models/User").default;
const Job = require("../dist/src/models/Job").default;
const {
  extractionSchema,
  evaluationSchema,
  publicPreview,
  resumeLevel,
} = require("../dist/src/schemas/resumeAnalysis");
const {
  extractResume,
  evaluateResume,
} = require("../dist/src/services/resumeAi");
const { rankJobs } = require("../dist/src/services/resumeMatching");
const queue = require("../dist/src/services/resumeQueue");
const { generateAccessToken } = require("../dist/src/utils/tokenService");
const guest = require("../dist/src/routes/guestAnalysis");
const JSZip = require("jszip");
const { readDocx } = require("../dist/src/services/resumeDocx");

const profile = {
  role: "Frontend developer",
  direction: "IT",
  level: "Middle",
  location: "Minsk",
  experience: [],
  skills: ["React", "TypeScript"],
  education: [],
  languages: [{ language: "Russian", level: null }],
};
const extraction = {
  isResume: true,
  language: "ru",
  extractedText: "Frontend developer with React and TypeScript experience.",
  profile,
};
const criterion = (score) => ({
  score,
  explanation: "Evidence-based explanation",
});
const evaluation = {
  criteria: {
    goalFit: criterion(20),
    experience: criterion(20),
    skills: criterion(15),
    structure: criterion(10),
    completeness: criterion(8),
  },
  problems: [
    { title: "Missing outcomes", explanation: "No quantified achievements" },
    { title: "Unclear dates", explanation: "Dates are missing" },
  ],
  strengths: ["React"],
  recommendations: ["Add dates"],
  questions: ["When did you start?"],
  improvedResume: {
    language: "ru",
    sections: [{ title: "Skills", content: "React, TypeScript" }],
    markdown: "# Skills\nReact, TypeScript",
  },
};
const goal = {
  jobLocation: "abroad",
  targetCountry: "Germany",
  desiredRole: "Frontend developer",
  outputLanguage: "original",
  responseLanguage: "ru",
  consent: "true",
};
const jobs = [
  {
    _id: "1",
    title: "Frontend developer",
    company: "Company",
    description: "React and TypeScript",
    direction: "IT",
    level: "Middle",
    workFormat: "Office",
    location: "Germany",
    requirements: ["React", "TypeScript"],
    responsibilities: ["Develop software"],
    isActive: true,
  },
  {
    _id: "2",
    title: "Frontend developer",
    company: "Remote company",
    description: "React",
    direction: "IT",
    level: "Middle",
    workFormat: "Remote",
    location: "Poland",
    requirements: ["React"],
    responsibilities: ["Develop"],
    isActive: true,
  },
  {
    _id: "3",
    title: "Chef",
    company: "Restaurant",
    description: "Kitchen",
    direction: "HoReCa",
    level: "Middle",
    workFormat: "Office",
    location: "Germany",
    requirements: ["Cooking"],
    responsibilities: ["Cook"],
    isActive: true,
  },
];
const id = "507f1f77bcf86cd799439011";
const secret = "a".repeat(64);
const secretHash = crypto.createHash("sha256").update(secret).digest("hex");
let server, base;
const realFetch = global.fetch;

before(async () => {
  process.env.AI_PROVIDER = "openrouter";
  const app = express();
  app.use(express.json());
  app.use("/api/guest/analyses", guest.default);
  app.use((error, req, res, next) =>
    res.status(500).json({ error: "internal_error" }),
  );
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api/guest/analyses`;
});
after(() => server.close());

function mock(t, object, key, implementation) {
  const original = object[key];
  object[key] = implementation;
  t.after(() => {
    object[key] = original;
  });
}
function task(extra = {}) {
  return {
    _id: id,
    status: "completed",
    secretHash,
    ownerId: null,
    sourceExpiresAt: new Date(Date.now() + 100000),
    expiresAt: new Date(Date.now() + 100000),
    ...extra,
  };
}
function guestLookup(t, value) {
  mock(t, Resume, "findById", () => ({ select: async () => value }));
}
function token(userId) {
  return generateAccessToken({
    userId,
    email: "test@example.com",
    role: "SPECIALIST",
  });
}
function authenticated(t) {
  process.env.JWT_SECRET = "test-only-jwt-secret";
  mock(t, User, "findById", async (userId) => ({
    _id: { toString: () => userId },
    email: "test@example.com",
    role: "SPECIALIST",
    isBlocked: false,
    isDeleted: false,
  }));
}

test("schemas reject inconsistent bounds and missing fields; null profile values are valid", () => {
  assert.equal(
    extractionSchema.parse(extraction).profile.languages[0].level,
    null,
  );
  assert.throws(() => evaluationSchema.parse({ ...evaluation, problems: [] }));
  assert.throws(() =>
    evaluationSchema.parse({
      ...evaluation,
      criteria: { ...evaluation.criteria, goalFit: criterion(26) },
    }),
  );
  assert.deepEqual([0, 39, 40, 69, 70, 100].map(resumeLevel), [
    "weak",
    "weak",
    "average",
    "average",
    "strong",
    "strong",
  ]);
  assert.ok(z.toJSONSchema(extractionSchema).properties.profile);
});

test("matching respects country, role/skills and remote uncertainty without inventing jobs", () => {
  const result = rankJobs(jobs, profile, goal);
  assert.deepEqual(
    result.map((job) => job.id),
    ["1", "2"],
  );
  assert.equal(result[0].matchScore, 100);
  assert.equal(result[1].locationNeedsConfirmation, true);
  assert.equal(rankJobs([], profile, goal).length, 0);
  assert.equal(
    rankJobs([jobs[0]], profile, { ...goal, targetCountry: "Poland" }).length,
    0,
  );
  assert.equal(
    rankJobs([{ ...jobs[0], location: "Германия" }], profile, goal).length,
    1,
  );
  assert.equal(
    rankJobs(
      [{ ...jobs[0], description: "Proactive TypeScript", requirements: [] }],
      { ...profile, skills: ["React"] },
      goal,
    )[0].matchedSkills.length,
    0,
  );
});

test("guest preview is a strict allowlist, including counts for zero, one and many matches", () => {
  for (const count of [0, 1, 3, 10]) {
    const result = publicPreview({
      ...extraction,
      ...evaluation,
      score: 73,
      level: "strong",
      jobs: Array.from({ length: count }, (_, i) => ({ id: i })),
      secret: "private",
      improvedResume: "private",
    });
    assert.equal(result.jobs.length, Math.min(3, count));
    assert.equal(result.totalJobs, count);
    assert.deepEqual(Object.keys(result).sort(), [
      "jobs",
      "level",
      "problems",
      "score",
      "totalJobs",
    ]);
  }
});

function textPdf(text) {
  const stream = `BT /F1 12 Tf 40 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test("text PDFs are read locally; PDFs without text retain free parser fallback; DOCX validates", async (t) => {
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.AI_MODEL = "openrouter/free";
  const requests = [];
  mock(t, global, "fetch", async (url, options) => {
    requests.push(JSON.parse(options.body));
    return new Response(
      JSON.stringify({
        model: "provider/free-model",
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(extraction) },
          },
        ],
      }),
    );
  });
  const result = await extractResume(
    { kind: "pdf", name: "resume.pdf", data: textPdf("") },
    new AbortController().signal,
  );
  assert.equal(result.model, "provider/free-model");
  assert.equal(requests[0].plugins[0].pdf.engine, "cloudflare-ai");
  assert.match(
    requests[0].messages[1].content[1].file.file_data,
    /^data:application\/pdf;base64,/,
  );
  assert.equal(requests[0].response_format.type, "json_schema");
  const localPdf = await extractResume(
    { kind: "pdf", name: "resume.pdf", data: textPdf(extraction.extractedText) },
    new AbortController().signal,
  );
  assert.match(requests[1].messages[1].content, /Frontend developer/);
  assert.equal(requests[1].plugins, undefined);
  assert.equal(localPdf.value.extractedText, extraction.extractedText);
  assert.equal(requests[1].response_format.json_schema.schema.properties.extractedText, undefined);
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    "word/document.xml",
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Frontend developer with React and TypeScript experience.</w:t></w:r></w:p></w:body></w:document>',
  );
  await extractResume(
    {
      kind: "docx",
      name: "resume.docx",
      data: await zip.generateAsync({ type: "nodebuffer" }),
    },
    new AbortController().signal,
  );
  assert.match(requests[2].messages[1].content, /Frontend developer/);
  assert.equal(requests[2].plugins, undefined);
});

test("evaluation transmits country/goal and requested rewrite language", async (t) => {
  mock(t, global, "fetch", async (url, options) => {
    const request = JSON.parse(options.body);
    assert.match(request.messages[0].content, /Rewrite language: English/);
    const input = JSON.parse(request.messages[1].content);
    assert.equal(input.goal.targetCountry, "Germany");
    return new Response(
      JSON.stringify({
        model: "free",
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(evaluation) },
          },
        ],
      }),
    );
  });
  const result = await evaluateResume(
    extraction,
    { ...goal, outputLanguage: "en" },
    new AbortController().signal,
  );
  assert.equal(result.value.improvedResume.markdown, "## Skills\n\nReact, TypeScript");
});

test("provider failures and malformed outputs fail explicitly; paid models are refused", async (t) => {
  process.env.OPENROUTER_API_KEY = "test-key";
  mock(t, global, "fetch", async () => new Response("{}", { status: 429 }));
  await assert.rejects(
    extractResume(
      { kind: "text", name: "resume.txt", text: extraction.extractedText },
      new AbortController().signal,
    ),
    /provider_limit/,
  );
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [{ finish_reason: "stop", message: { content: "not JSON" } }],
      }),
    );
  await assert.rejects(
    extractResume(
      { kind: "text", name: "resume.txt", text: extraction.extractedText },
      new AbortController().signal,
    ),
    /invalid_ai_response/,
  );
  process.env.AI_MODEL = "paid/model";
  await assert.rejects(
    extractResume(
      { kind: "text", name: "resume.txt", text: extraction.extractedText },
      new AbortController().signal,
    ),
    /free_model_required/,
  );
  process.env.AI_MODEL = "openrouter/free";
});

test("HTTP guest read requires the secret and never reveals full analysis", async (t) => {
  guestLookup(
    t,
    task({
      result: {
        ...evaluation,
        ...extraction,
        score: 73,
        level: "strong",
        jobs,
      },
    }),
  );
  assert.equal((await realFetch(`${base}/${id}`)).status, 404);
  assert.equal(
    (
      await realFetch(`${base}/${id}`, {
        headers: { "X-Analysis-Secret": "b".repeat(64) },
      })
    ).status,
    404,
  );
  const response = await realFetch(`${base}/${id}`, {
    headers: { "X-Analysis-Secret": secret },
  });
  const data = await response.json();
  assert.equal(data.preview.score, 73);
  assert.equal(data.preview.profile, undefined);
  assert.equal(data.preview.improvedResume, undefined);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("expired guest credentials are rejected before Mongo TTL cleanup", async (t) => {
  guestLookup(t, task({ expiresAt: new Date(0) }));
  assert.equal(
    (
      await realFetch(`${base}/${id}`, {
        headers: { "X-Analysis-Secret": secret },
      })
    ).status,
    404,
  );
});

test("claim checks authenticated user and atomically refuses another owner", async (t) => {
  authenticated(t);
  guestLookup(t, task());
  const headers = {
    "X-Analysis-Secret": secret,
    Authorization: `Bearer ${token("owner")}`,
  };
  mock(t, Resume, "findOneAndUpdate", async (query) => {
    assert.equal(query.$or[1].ownerId, "owner");
    return null;
  });
  assert.equal(
    (await realFetch(`${base}/${id}/claim`, { method: "POST", headers }))
      .status,
    403,
  );
  Resume.findOneAndUpdate = async () => task({ ownerId: "owner" });
  assert.equal(
    (await realFetch(`${base}/${id}/claim`, { method: "POST", headers }))
      .status,
    200,
  );
  assert.equal(
    (
      await realFetch(`${base}/${id}/claim`, {
        method: "POST",
        headers: { "X-Analysis-Secret": secret },
      })
    ).status,
    401,
  );
});

test("full JSON and file download are restricted to the owner", async (t) => {
  authenticated(t);
  const full = {
    ...extraction,
    ...evaluation,
    score: 73,
    level: "strong",
    jobs,
  };
  mock(t, Resume, "findOne", (query) => ({
    select: async () =>
      query.ownerId === "owner"
        ? task({ ownerId: "owner", result: full })
        : null,
  }));
  assert.equal((await realFetch(`${base}/${id}/full`)).status, 401);
  assert.equal(
    (
      await realFetch(`${base}/${id}/full`, {
        headers: { Authorization: `Bearer ${token("other")}` },
      })
    ).status,
    404,
  );
  const response = await realFetch(`${base}/${id}/full?download=1`, {
    headers: { Authorization: `Bearer ${token("owner")}` },
  });
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-disposition"),
    /resume-analysis\.json/,
  );
  assert.equal(
    (await response.json()).improvedResume.markdown,
    evaluation.improvedResume.markdown,
  );
});

test("upload validates actual file format and accepts text into an asynchronous task", async (t) => {
  process.env.OPENROUTER_API_KEY = "test-key";
  mock(t, Resume, "create", async (value) => value);
  mock(t, queue, "launchAnalysis", (id) => queue.releaseAnalysis(id));
  const form = () => {
    const body = new FormData();
    for (const [key, value] of Object.entries(goal)) body.append(key, value);
    return body;
  };
  let body = form();
  body.append("file", new Blob(["not a PDF"]), "resume.pdf");
  assert.equal((await realFetch(base, { method: "POST", body })).status, 400);
  body = form();
  body.append("resumeText", extraction.extractedText);
  const response = await realFetch(base, { method: "POST", body });
  assert.equal(response.status, 202);
  const data = await response.json();
  assert.match(data.secret, /^[a-f0-9]{64}$/);
  assert.equal(data.status, "pending");
});

test("retry never restarts running work and refuses expired source", async (t) => {
  guestLookup(t, task({ status: "reading" }));
  let response = await realFetch(`${base}/${id}/retry`, {
    method: "POST",
    headers: { "X-Analysis-Secret": secret },
  });
  assert.equal(response.status, 202);
  assert.equal((await response.json()).status, "reading");
  Resume.findById = () => ({
    select: async () =>
      task({ status: "failed", sourceExpiresAt: new Date(0) }),
  });
  response = await realFetch(`${base}/${id}/retry`, {
    method: "POST",
    headers: { "X-Analysis-Secret": secret },
  });
  assert.equal(response.status, 410);
});

test("worker stores real stages and server-computed total and clears its processing slot", async (t) => {
  const stages = [];
  let saved;
  mock(t, Resume, "findById", () => ({
    select: async () =>
      task({
        goal,
        source: {
          kind: "text",
          name: "resume.txt",
          text: extraction.extractedText,
        },
      }),
  }));
  mock(t, Resume, "updateOne", async (query, update) => {
    stages.push(update.$set.status);
    if (update.$set.result) saved = update.$set.result;
  });
  mock(t, Job, "find", () => ({ lean: async () => jobs }));
  mock(t, global, "fetch", async (url, options) => {
    const request = JSON.parse(options.body);
    const value = request.messages[0].content.includes("You extract")
      ? extraction
      : evaluation;
    return new Response(
      JSON.stringify({
        model: "test/free",
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(value) },
          },
        ],
      }),
    );
  });
  assert.equal(queue.reserveAnalysis(id), true);
  assert.equal(queue.reserveAnalysis(id), false);
  await queue.runAnalysis(id);
  assert.deepEqual(stages, ["reading", "evaluating", "matching", "completed"]);
  assert.equal(saved.score, 73);
  assert.equal(saved.level, "strong");
  assert.equal(saved.jobs.length, 2);
  assert.equal(queue.reserveAnalysis(id), true);
  queue.releaseAnalysis(id);
});

test("restart fails unfinished tasks and cleanup removes only expired sources/unclaimed tasks", async (t) => {
  const updates = [];
  mock(t, Resume, "updateMany", async (query, update) =>
    updates.push({ query, update }),
  );
  mock(t, Resume, "deleteMany", async (query) => {
    assert.equal(query.ownerId, null);
  });
  await queue.initializeResumeQueue();
  assert.equal(updates[0].update.$set.error, "server_restarted");
  assert.ok(updates[1].query.sourceExpiresAt.$lte instanceof Date);
  assert.deepEqual(updates[1].update, { $unset: { source: 1 } });
});

test("DOCX reader refuses corrupt archives, unrelated ZIP files and excessive expansion", async () => {
  await assert.rejects(readDocx(Buffer.from("not a zip")));
  let zip = new JSZip();
  zip.file("notes.txt", "Not a resume document");
  await assert.rejects(
    readDocx(await zip.generateAsync({ type: "nodebuffer" })),
    /invalid_docx/,
  );
  zip = new JSZip();
  zip.file("word/document.xml", "x".repeat(21 * 1024 * 1024));
  await assert.rejects(
    readDocx(
      await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
    ),
    /invalid_archive/,
  );
});

test("worker has no application deadline and releases capacity on provider failure", async (t) => {
  const stages = [];
  const originalTimeout = global.setTimeout;
  mock(t, Resume, "findById", () => ({
    select: async () =>
      task({
        goal,
        source: {
          kind: "text",
          name: "resume.txt",
          text: extraction.extractedText,
        },
      }),
  }));
  mock(t, Resume, "updateOne", async (query, update) =>
    stages.push(update.$set),
  );
  const deadlines = [];
  mock(t, global, "setTimeout", (callback, duration, ...args) => {
    deadlines.push(duration);
    return originalTimeout(callback, duration, ...args);
  });
  mock(
    t,
    global,
    "fetch",
    async (url, { signal }) => {
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(signal.aborted, false);
      return new Response("{}", { status: 503 });
    },
  );
  assert.equal(queue.reserveAnalysis(id), true);
  await queue.runAnalysis(id);
  assert.equal(stages.at(-1).status, "failed");
  assert.equal(stages.at(-1).error, "provider_unavailable");
  assert.deepEqual(deadlines, []);
  assert.equal(queue.reserveAnalysis(id), true);
  queue.releaseAnalysis(id);
});


test("Groq uses direct schema API, validates output and reports rate limits", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.AI_PROVIDER = "groq";
  process.env.GROQ_API_KEY = "groq-test-key";
  delete process.env.GROQ_MODEL;
  const requests = [];
  mock(t, global, "fetch", async (url, options) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer groq-test-key");
    const body = JSON.parse(options.body);
    requests.push(body);
    assert.equal(body.model, "openai/gpt-oss-120b");
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.provider, undefined);
    assert.equal(body.plugins, undefined);
    assert.equal(body.thinking, undefined);
    assert.equal(body.reasoning, undefined);
    assert.equal(body.reasoning_effort, "low");
    assert.equal(body.include_reasoning, false);
    assert.equal(body.max_completion_tokens, 4096);
    assert.equal(body.max_tokens, undefined);
    assert.equal(body.messages.length, 2);
    assert.ok(body.response_format.json_schema.schema.properties);
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(requests.length === 1 ? extraction : evaluation) } }] }));
  });
  const result = await extractResume({ kind: "text", name: "resume.txt", text: extraction.extractedText }, new AbortController().signal);
  assert.equal(result.value.extractedText, extraction.extractedText);
  const evaluated = await evaluateResume(result.value, goal, new AbortController().signal);
  assert.equal(evaluated.value.criteria.goalFit.score, 20);

  assert.equal(requests.length, 2);
  global.fetch = async () => new Response("{}", { status: 429 });
  await assert.rejects(evaluateResume(result.value, goal, new AbortController().signal), /provider_limit/);
  global.fetch = async () => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: "{}" } }] }));
  await assert.rejects(evaluateResume(result.value, goal, new AbortController().signal), /invalid_ai_response/);
  delete process.env.GROQ_API_KEY;
  await assert.rejects(evaluateResume(result.value, goal, new AbortController().signal), /not_configured/);
});


test("Groq retries short cooldowns, but bounds attempts and refuses long waits", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.AI_PROVIDER = "groq";
  process.env.GROQ_API_KEY = "test-key";
  let calls = 0;
  mock(t, global, "fetch", async () => {
    calls++;
    if (calls === 1) return new Response("{}", { status: 429, headers: { "retry-after": "0" } });
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(extraction) } }] }));
  });
  const source = { kind: "text", name: "resume.txt", text: extraction.extractedText };
  await extractResume(source, new AbortController().signal);
  assert.equal(calls, 2);
  calls = 0;
  global.fetch = async () => { calls++; return new Response("{}", { status: 429, headers: { "retry-after": "0" } }); };
  await assert.rejects(extractResume(source, new AbortController().signal), /provider_limit/);
  assert.equal(calls, 3);
  calls = 0;
  global.fetch = async () => { calls++; return new Response("{}", { status: 429, headers: { "retry-after": "3600" } }); };
  await assert.rejects(extractResume(source, new AbortController().signal), /provider_limit/);
  assert.equal(calls, 1);
});


test("Groq renders scan pages for vision and keeps text PDFs on the text model", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.AI_PROVIDER = "groq";
  process.env.GROQ_API_KEY = "test-key";
  delete process.env.GROQ_VISION_MODEL;
  let request;
  mock(t, global, "fetch", async (url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(extraction) } }] }));
  });
  const result = await extractResume({ kind: "pdf", name: "scan.pdf", data: textPdf("") }, new AbortController().signal);
  assert.equal(result.value.extractedText, extraction.extractedText);
  assert.equal(request.model, "qwen/qwen3.8-27b");
  assert.equal(request.reasoning_effort, "none");
  assert.equal(request.response_format.type, "json_object");
  assert.equal(request.plugins, undefined);
  assert.equal(request.messages.at(-1).content[1].type, "image_url");
  assert.match(request.messages.at(-1).content[1].image_url.url, /^data:image\/png;base64,/);
  await extractResume({ kind: "pdf", name: "text.pdf", data: textPdf(extraction.extractedText) }, new AbortController().signal);
  assert.equal(request.model, "openai/gpt-oss-120b");
  assert.equal(typeof request.messages[1].content, "string");
});


test("scan page limit rejects oversized documents before rendering or AI", async (t) => {
  const { PDFParse } = require("pdf-parse");
  const { renderPdfPages } = require("../dist/src/services/resumePdf");
  mock(t, PDFParse.prototype, "getInfo", async () => ({ total: 4 }));
  mock(t, PDFParse.prototype, "getScreenshot", async () => { assert.fail("must not render oversized scans"); });
  await assert.rejects(renderPdfPages(textPdf("")), /pdf_page_limit/);
});
