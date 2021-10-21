
/**
 * @param appId appId
 * @returns fake API-token that can be used for local testing
 */
export function createApiToken(appId: string)
{
  return Buffer.from(
    JSON.stringify(
      {payload: {data: { appId }}},
    ),
  ).toString('base64');
}
