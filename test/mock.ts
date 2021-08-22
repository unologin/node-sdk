
import express from 'express';

const router = express.Router();

export default router;

const tokens : { [token: string]: object } = {};

/**
 * @param user user
 * @returns valid login token for the mock api
 */
export function createToken(user : object)
{
  // make sure all valid tokens start with 'valid-'
  const token = 'valid-' + Math.random().toString(36).substring(7);

  tokens[token] = user;

  return token;
}

router.use(express.json());

router.post('/api/apps/users/auth', (req, res) => 
{
  const { appLoginToken } = req.body.user;
  
  if (appLoginToken in tokens)
  {
    res.send(tokens[appLoginToken]);
  }
  else
  {
    res.status(401).send(
      {
        code: 401,
        msg: 'invalid token',
        data: { param: 'user' },
      },
    );
  }
});
