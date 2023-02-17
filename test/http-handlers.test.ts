
describe('parseLogin', () => 
{
  it.todo('returns null when missing token');
  it.todo('returns UserToken if valid');
  it.todo('refreshes cookie if new cookie returned by unologin API'); 
  it.todo('forwards any errors from verifyTokenAndRefresh if next=undefined'); 
});

describe('handleLoginEvent', () => 
{
  it.todo('forwards any non-APIError errors from verifyTokenAndRefresh');
  it.todo('move tests from express-handlers.test.ts in here');
});
