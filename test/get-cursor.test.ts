
import {
  GetCursor,
} from '../src/rest';

describe('GetCursor', () => 
{
  it('GetCursor.nextBatch returns next batch until done.', async () => 
  {
    const expectedBatches = 
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8],
    ];

    // create a "database" of expected batches
    const db = [...expectedBatches];

    // basically pop-front on db each time
    const request = jest.fn()
      .mockImplementation(
        () => Promise.resolve(
          {
            total: db.flat().length,
            results: db.shift(),
          },
        ),
      )
    ;

    const cursor = new GetCursor<number>(
      { request },
      'my-resource',
    );

    const batches : typeof expectedBatches = [];

    while (!cursor.batchesEmpty())
    {
      batches.push(await cursor.nextBatch().then(({results}) => results));
    }

    expect(request)
      .toHaveBeenCalledTimes(expectedBatches.length);

    expect(batches)
      .toStrictEqual(expectedBatches);

    expect(JSON.parse(JSON.stringify(request.mock.calls)))
      .toStrictEqual(
        [
          ['GET', 'my-resource?'],
          ['GET', 'my-resource?after=3'],
          ['GET', 'my-resource?after=6'],
        ],    
      );
  });

  it('GetCursor.forEach calls callback for every single element.', async () => 
  {
    const expectedBatches = 
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8],
    ];

    // create a "database" of expected batches
    const db = [...expectedBatches];

    // basically pop-front on db each time
    const request = jest.fn()
      .mockImplementation(
        () => Promise.resolve(
          {
            total: db.flat().length,
            results: db.shift(),
          },
        ),
      )
    ;

    const cursor = new GetCursor<number>(
      { request },
      'my-resource',
    );

    const elements = await cursor.toArray();

    expect(elements)
      .toStrictEqual(expectedBatches.flat());
  });

});
