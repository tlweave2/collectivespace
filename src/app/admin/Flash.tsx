export default function Flash({ msg, tone }: { msg?: string; tone?: string }) {
  if (!msg) return null;
  return <div className={`alert ${tone === "bad" ? "bad" : "ok"}`}>{msg}</div>;
}
