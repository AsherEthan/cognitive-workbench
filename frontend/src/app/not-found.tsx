import Link from "next/link";

export default function NotFound() {
  return <section className="workbench-page flex min-h-[65vh] flex-col items-center justify-center text-center">
    <p className="mb-5 text-sm tracking-widest text-ink-3">404 · 頁面不存在</p>
    <h1 className="mb-4 text-3xl text-ink-1">回到熟悉的方向</h1>
    <p className="mb-8 text-sm text-ink-2">這個位置已經移動，或尚未建立。</p>
    <Link href="/telos" className="rounded border border-line-2 bg-surface-2 px-5 py-3 text-sm text-accent-blue hover:bg-surface-3">回到認知工作台</Link>
  </section>;
}
