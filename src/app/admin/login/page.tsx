import { login } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="wrap" style={{ maxWidth: 400, paddingTop: 100 }}>
      <form action={login} className="card stack">
        <div><div className="eyebrow">The Collective Space</div><h2 style={{ margin: 0 }}>Admin sign in</h2></div>
        {error && <div className="alert bad" style={{ margin: 0 }}>That password didn&apos;t match.</div>}
        <div className="field"><label htmlFor="pw">Password</label><input id="pw" name="password" type="password" autoFocus required /></div>
        <button className="btn block">Sign in</button>
      </form>
    </div>
  );
}
