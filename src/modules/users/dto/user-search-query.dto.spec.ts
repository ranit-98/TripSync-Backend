import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserSearchQueryDto } from './user-search-query.dto';

describe('UserSearchQueryDto', () => {
  it('accepts the search term with pagination', async () => {
    const query = plainToInstance(UserSearchQueryDto, {
      q: 'ranit',
      page: '2',
      limit: '10',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ q: 'ranit', page: 2, limit: 10 });
  });
});
