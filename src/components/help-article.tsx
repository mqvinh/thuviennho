import Link from "next/link";
import type { HelpGuide } from "@/lib/help-guides";
import { ListeningIcon } from "./listening-icon";

export function HelpArticle({ guide, prefix = "guide", onNavigate }: { guide: HelpGuide; prefix?: string; onNavigate?: () => void }) {
  return <article className="help-article" aria-labelledby={`${prefix}-title`}>
    <p className="help-eyebrow">HƯỚNG DẪN SỬ DỤNG</p>
    <h2 id={`${prefix}-title`} tabIndex={-1}><span aria-hidden="true">{guide.icon}</span>{guide.title}</h2>
    <p className="help-article-summary">{guide.summary}</p>
    <div className="help-article-meta"><span><ListeningIcon name="clock" />{guide.duration}</span><Link href={guide.href} className="button secondary" onNavigate={onNavigate}>Mở {guide.title}<ListeningIcon name="arrow-right" /></Link></div>
    {guide.sections.map((section, index) => <section key={section.title} className="help-instructions">
      <h3><span>{index + 1}</span>{section.title}</h3>
      {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {section.steps && <ol>{section.steps.map(step => <li key={step}>{step}</li>)}</ol>}
    </section>)}
    <section className="help-questions"><h3>Câu hỏi thường gặp</h3>{guide.questions.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
    <p className="help-article-tip"><ListeningIcon name="tip" />Cùng thực hành từng bước. Bạn có thể mở lại hướng dẫn bằng nút hỗ trợ ở góc dưới trang đang sử dụng.</p>
  </article>;
}
