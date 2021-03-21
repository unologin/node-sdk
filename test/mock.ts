
import express from 'express';

// eslint-disable-next-line new-cap
const router = express.Router();

export default router;

const tokens : { [token: string]: object } = {};

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
    res.send(
      {
        result: tokens[appLoginToken],
        error: { code: 200 },
      },
    );
  }
  else
  {
    res.send(
      {
        error:
        {
          code: 401,
          msg: 'invalid token',
          data: { param: 'user' },
        },
      },
    );
  }

});
