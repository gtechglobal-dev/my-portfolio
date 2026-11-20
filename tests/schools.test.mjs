import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLICATION_STATUSES, PROJECT_STAGES, hashToken, makeSecureToken,
  nextSequenceRef, stageIndex, projectPaymentAmount, parseCsv, safeFileName, validateFileUpload,
} from '../backend/dist/schools/types.js';
import { progressFor } from '../backend/dist/schools/store.js';

test('school application statuses cover the documented pipeline', () => {
  for (const status of ['new', 'contacted', 'proposal_sent', 'accepted', 'converted', 'rejected']) {
    assert.ok(APPLICATION_STATUSES.includes(status));
  }
});

test('project stages are ordered from application to completed', () => {
  assert.equal(stageIndex('application'), 0);
  assert.equal(stageIndex('completed'), PROJECT_STAGES.length - 1);
  assert.ok(stageIndex('development') < stageIndex('testing'));
  assert.ok(stageIndex('testing') < stageIndex('deployment'));
});

test('secure invitation tokens are prefixed, random and hash deterministically', () => {
  const a = makeSecureToken('inv');
  const b = makeSecureToken('inv');
  assert.match(a, /^inv_[0-9a-f]{48}$/);
  assert.notEqual(a, b);
  assert.equal(hashToken(a), hashToken(a));
  assert.notEqual(hashToken(a), hashToken(b));
});

test('sequence references are padded and year-scoped', () => {
  assert.equal(nextSequenceRef('GTECH-APP', 7, 2026), 'GTECH-APP-2026-0007');
  assert.equal(nextSequenceRef('GTECH-SCH', 42, 2027), 'GTECH-SCH-2027-0042');
});

test('project progress is weighted by milestones', () => {
  const projectId = 'p1';
  const milestones = [
    { projectId, weight: 50, status: 'completed' },
    { projectId, weight: 30, status: 'in_progress' },
    { projectId, weight: 20, status: 'pending' },
    { projectId: 'p2', weight: 100, status: 'completed' },
  ];
  assert.equal(progressFor(projectId, milestones), 50);
  assert.equal(progressFor('empty', milestones), 0);
});

test('initial deposit is calculated from configured percentage and never exceeds outstanding', () => {
  assert.equal(projectPaymentAmount(100000, 0, 'deposit', 40), 40000);
  assert.equal(projectPaymentAmount(100000, 40000, 'deposit', 40), 60000);
  assert.equal(projectPaymentAmount(100000, 90000, 'final', 40), 10000);
  assert.equal(projectPaymentAmount(100000, 100000, 'final', 40), 0);
});

test('CSV parsing handles quoted commas and flags malformed rows', () => {
  const result = parseCsv('name,class,note\nAda,"JSS 1A","Likes maths, physics"\nTobi,JSS 2B\n');
  assert.deepEqual(result.headers, ['name', 'class', 'note']);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0][2], 'Likes maths, physics');
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /do not match/);
});

test('file uploads enforce configured type and size restrictions', () => {
  const settings = { fileRestrictions: { maxBytes: 1000, allowedTypes: ['application/pdf'] } };
  assert.equal(validateFileUpload(settings, 'application/pdf', 500), null);
  assert.match(validateFileUpload(settings, 'text/csv', 500), /not allowed/);
  assert.match(validateFileUpload(settings, 'application/pdf', 1001), /exceeds/);
});

test('uploaded file names are sanitized for download headers', () => {
  assert.equal(safeFileName('../../evil?.pdf'), '.._.._evil_.pdf');
});
