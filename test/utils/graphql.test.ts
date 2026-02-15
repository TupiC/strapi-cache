import { parseGraphqlPayload, getRootFieldsFromQuery } from '../../server/src/utils/graphql';
import { describe, it, expect } from 'vitest';

describe('parseGraphqlPayload', () => {
  it('should parse the graphql payload', () => {
    const payload = parseGraphqlPayload(
      '{ "query": "query { articles { id } }", "variables": { "limit": 10 } }',
      false
    );
    expect(payload).toEqual({
      query: 'query { articles { id } }',
      variables: { limit: 10 },
      operationName: null,
    });
  });
});

describe('getRootFieldsFromQuery', () => {
  it('should get the root fields from the query', () => {
    const rootFields = getRootFieldsFromQuery('query { article { id } }');
    expect(rootFields).toEqual(['article']);
  });

  //TODO
  //   it('should get the root fields from the query with two fields', () => {
  //     const rootFields = getRootFieldsFromQuery('query { article { id } category { id } }');
  //     expect(rootFields).toEqual(['article', 'category']);
  //   });

  //   it('should get the root fields from the query with three or more fields', () => {
  //     const rootFields = getRootFieldsFromQuery(
  //       'query { article { id } category { id } author { id } }'
  //     );
  //     expect(rootFields).toEqual(['article', 'category', 'author']);
  //   });
});
