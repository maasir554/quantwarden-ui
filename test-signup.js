fetch('http://localhost:3000/api/auth/sign-up/email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:3000'
  },
  body: JSON.stringify({
    email: 'test3@example.com',
    password: 'password1234',
    name: 'Test User'
  })
}).then(res => res.json()).then(console.log).catch(console.error);
