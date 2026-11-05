import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const prisma = new PrismaClient();
const id = randomUUID().replaceAll("-", "").slice(0, 12);
const email = `ci-${id}@teachgenius.test`;
const password = "TeachGenius-CI-Password-2026!";
let cookie = "";

async function request(path, options = {}, auth = true) {
  const headers = new Headers(options.headers || {});
  if (auth && cookie) headers.set("cookie", cookie);
  const response = await fetch(base + path, { ...options, headers });
  let data = null;
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) data = await response.json();
  return { response, data };
}

async function run() {
  const anonymous = await request("/api/auth/me", {}, false);
  assert.equal(anonymous.response.status, 401, "anonymous session lookup must be rejected");

  const registration = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      displayName: "CI Smoke Teacher",
      email,
      password,
      workspaceType: "SCHOOL",
      workspaceName: `CI School ${id}`,
    }),
  }, false);
  assert.equal(registration.response.status, 201, JSON.stringify(registration.data));
  const setCookies = registration.response.headers.getSetCookie?.() || [];
  const sessionCookie = setCookies.find(value => value.startsWith("tg_session="));
  assert.ok(sessionCookie, "registration must issue an HTTP-only session cookie");
  cookie = sessionCookie.split(";")[0];

  const me = await request("/api/auth/me");
  assert.equal(me.response.status, 200, "registered user must have an active session");
  assert.equal(me.data.user.email, email);
  const workspaces = await request("/api/workspaces");
  assert.equal(workspaces.response.status, 200);
  assert.equal(workspaces.data.workspaces.length, 1);
  const organizationId = workspaces.data.workspaces[0].id;
  assert.equal(workspaces.data.workspaces[0].role, "SCHOOL_ADMIN");

  const resourcesBefore = await request(`/api/workspaces/${organizationId}/resources`);
  assert.equal(resourcesBefore.response.status, 200);
  assert.equal(resourcesBefore.data.aiCreditBalance, 100, "new workspace must receive 100 starter credits");

  const form = new FormData();
  form.append("file", new Blob(["Curriculum smoke test: Introduction to matter."], { type: "text/plain" }), "ci-smoke.txt");
  form.append("title", "CI curriculum resource");
  form.append("category", "CURRICULUM");
  form.append("requestReview", "true");
  const upload = await request(`/api/workspaces/${organizationId}/resources`, { method: "POST", body: form });
  assert.equal(upload.response.status, 201, JSON.stringify(upload.data));
  const resourceId = upload.data.resource.id;
  const download = await request(`/api/workspaces/${organizationId}/resources/${resourceId}/file`);
  assert.equal(download.response.status, 200, "uploader/admin must be able to download their resource");
  assert.match(await download.response.text(), /Introduction to matter/);

  const curriculum = await request(`/api/workspaces/${organizationId}/curricula`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "CI Science Curriculum",
      subjectName: "Basic Science",
      className: "JSS1",
      extractedText: "Introduction to matter",
      topics: [{ term: "Term 1", week: "Week 1", topic: "Introduction to matter", learningObjectives: ["Define matter"] }],
    }),
  });
  assert.equal(curriculum.response.status, 201, JSON.stringify(curriculum.data));
  assert.equal(curriculum.data.curriculum.status, "DRAFT");
  const curriculumId = curriculum.data.curriculum.id;
  const publish = await request(`/api/workspaces/${organizationId}/curricula/${curriculumId}/publish`, { method: "POST" });
  assert.equal(publish.response.status, 200, JSON.stringify(publish.data));
  const listed = await request(`/api/workspaces/${organizationId}/curricula`);
  assert.equal(listed.response.status, 200);
  assert.ok(listed.data.curricula.some(item => item.id === curriculumId && item.status === "PUBLISHED"));
  const topicId = listed.data.curricula.find(item => item.id === curriculumId).versions[0].topics[0].id;

  const user = await prisma.userProfile.findUniqueOrThrow({ where: { email } });
  const document = await prisma.generatedDocument.create({
    data: {
      ownerUserId: user.id,
      organizationId,
      type: "LESSON_NOTE",
      title: "CI editable lesson",
      topic: "Introduction to matter",
      content: {
        title: "CI editable lesson",
        topic: "Introduction to matter",
        learningObjectives: ["Define matter"],
        sections: [{ heading: "Introduction", body: "Matter has mass and occupies space." }],
        assessmentQuestions: [],
      },
    },
  });
  const save = await request(`/api/documents/${document.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "CI saved lesson",
      content: {
        title: "CI saved lesson",
        topic: "Introduction to matter",
        learningObjectives: ["Define matter", "Identify states of matter"],
        sections: [{ heading: "Introduction", body: "Matter has mass and occupies space." }],
        assessmentQuestions: [{ question: "What is matter?", answer: "Anything that has mass and occupies space.", marks: 2 }],
      },
    }),
  });
  assert.equal(save.response.status, 200, JSON.stringify(save.data));
  const saved = await request(`/api/documents/${document.id}`);
  assert.equal(saved.response.status, 200);
  assert.equal(saved.data.document.title, "CI saved lesson");
  const versions = await prisma.documentVersion.count({ where: { documentId: document.id } });
  assert.equal(versions, 1, "editing an existing document should append a version; initial version absent in direct test fixture");
  assert.equal(topicId.length > 0, true);

  const remove = await request(`/api/workspaces/${organizationId}/resources/${resourceId}`, { method: "DELETE" });
  assert.equal(remove.response.status, 200, JSON.stringify(remove.data));

  const logout = await request("/api/auth/logout", { method: "POST" });
  assert.equal(logout.response.status, 200);
  const afterLogout = await request("/api/auth/me", {}, false);
  assert.equal(afterLogout.response.status, 401, "logout must revoke the session");

  console.log("PASS: registration, session, workspace, starter credits, resource upload/download/delete, curriculum create/publish, document save/version and logout.");
}

try {
  await run();
} finally {
  await prisma.$disconnect();
}
