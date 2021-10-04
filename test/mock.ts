
import express from 'express';

import jwt from 'jsonwebtoken';

const router = express.Router();

export default router;

const secret = '53cr37';

/**
 * @param user user
 * @returns valid login token for the mock api
 */
export function createToken(user : object)
{
  return jwt.sign(
    {
      ...user,
      r: 60*60,
    },
    secret,
  );
}

router.use(express.json());

router.post('/users/auth', (req, res) => 
{
  const { appLoginToken } = req.body.user;
  
  try 
  {
    res.send(jwt.verify(appLoginToken, secret));
  }
  catch (e)
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

router.post('/users/refresh', (req, res) => 
{
  const { appLoginToken } = req.body.user;
  
  try 
  {
    const user = jwt.verify(appLoginToken, secret);
    res.send(
      [
        user,
        {
          value: jwt.sign(user, secret),
          maxAge: 3000,
        },
      ],
    );
  }
  catch (e)
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

router.get('/public-keys/app-login-token', (req, res) => 
{
  res.send({ data: secret });
});
