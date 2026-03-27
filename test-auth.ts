import { auth } from './src/lib/auth';

async function test() {
  try {
    const session = await auth.getSession();
    console.log("Session:", session);
  } catch (err) {
    console.error("Error in auth.getSession():", err);
  }
}

test();
