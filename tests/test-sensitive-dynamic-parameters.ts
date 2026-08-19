import assert from 'node:assert/strict';
import { findForbiddenParameterKey } from '../apps/api/src/common/sensitive-parameters';

assert.equal(findForbiddenParameterKey({ origin: 'Toshkent', passengers: { adults: 1 }, preferences: { seatLevel: 'LOWER' } }), undefined);
assert.equal(findForbiddenParameterKey({ passportNumber: 'must-not-pass' }), 'passportNumber');
assert.equal(findForbiddenParameterKey({ passenger: { document_number: 'must-not-pass' } }), 'document_number');
assert.equal(findForbiddenParameterKey({ payment: [{ card_number: 'must-not-pass' }] }), 'card_number');
assert.equal(findForbiddenParameterKey({ nested: { otp: 'must-not-pass' } }), 'otp');
console.log('Sensitive dynamic parameter guard covers nested identity and payment fields.');
