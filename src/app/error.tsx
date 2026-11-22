"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="system-page"><div><h1>Die Seite konnte gerade nicht geladen werden.</h1><p>Bitte versuchen Sie es erneut.</p><button onClick={reset}>Erneut versuchen</button></div></main>;
}
