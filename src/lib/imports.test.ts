import { describe, expect, it } from 'vitest';
import { csvRows } from './imports';

describe('CSV ingestion validation', () => {
  it('parses headers and rows without frontend fixtures', () => {
    expect(csvRows('email,firstName\ncasey@example.test,Casey')).toEqual([{ email: 'casey@example.test', firstName: 'Casey' }]);
  });
  it('supports quoted commas in business data', () => {
    expect(csvRows('name,description,price\nLamp,"Warm, adjustable light",29')[0].description).toBe('Warm, adjustable light');
  });
});
