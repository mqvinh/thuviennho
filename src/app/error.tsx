"use client";
import Link from "next/link";
import { Feedback } from "@/components/ui-provider";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="panel empty">
      <Feedback message="Thư viện chưa mở được. Em thử lại sau một chút nhé!" />
      <h1>Thư viện chưa mở được</h1>
      <p>Em thử lại sau một chút nhé!</p>
      <div className="actions justify-center">
        <button className="button" onClick={() => retry()}>
          Thử lại
        </button>
        <Link className="button secondary" href="/tu-sach">
          Về tủ sách
        </Link>
      </div>
    </section>
  );
}
