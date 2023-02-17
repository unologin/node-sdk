
import {
  createApiToken,
} from '../src/test-utils';

import unologin from '../src/main';
import { APIError } from '../src/errors';
  
describe('request', () => 
{
  it('Treats error as response if agent throws on non-2XX status.', async () =>
  {
    const e = 
    {
      response:
      {
        headers: { 'content-type': 'application/json' },
        status: 401,
        text: JSON.stringify(
          {
            code: 401,
            msg: 'bad request',
          },
        ),
      },
    };
  
    unologin.setup(
      { 
        apiKey: createApiToken('6f521a08a74b3154aa112f9b'),
        agent: (() => 
        {
          const request : any = {
            send: () => Promise.reject(e),
          };

          request.set = () => request;
  
          return request;
        }) as any,
      },
    );

    await expect(unologin.request('GET', '/test'))
      .rejects.toBeInstanceOf(APIError);
  });

  it('Forwards any other errors from agent.', async () =>
  {
    /** */
    class SomeError extends Error {}

    unologin.setup(
      { 
        apiKey: createApiToken('6f521a08a74b3154aa112f9b'),
        agent: (() => 
        {
          const request : any = {
            send: () => Promise.reject(new SomeError('Some error.')),
          };

          request.set = () => request;
  
          return request;
        }) as any,
      },
    );

    await expect(unologin.request('GET', '/test'))
      .rejects.toBeInstanceOf(SomeError);
  });
});
  
