import { expect } from 'chai';
import { safeDeepClone } from '../src/utils/sanitize';

describe('Circular Reference Handling', () => {
  it('handles circular references without throwing an error', () => {
    const obj: any = { a: 'value' };
    obj.circular = obj; // Create a circular reference

    expect(() => safeDeepClone(obj)).to.not.throw();
  });
  it('handles circular references on the first pass', () => {
    const obj: any = { a: 'value' };
    obj.circular = obj; // Create a circular reference

    const cloned = safeDeepClone(obj);

    expect(cloned.circular).to.equal('[Circular]');
  });
});
