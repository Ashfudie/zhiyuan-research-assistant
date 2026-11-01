import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Database,
  FileInput,
  FileSearch,
  Layers3,
  Quote,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from 'lucide-react'
import type { Health } from './types'

const steps = [
  { number: '01', title: '资料导入', subtitle: 'INGEST', icon: FileInput, description: '上传 TXT、Markdown 或 PDF 文档，保留标题、分类与标签等资料信息。', detail: '多格式解析 · 本地存储' },
  { number: '02', title: '切分与向量化', subtitle: 'CHUNK & EMBED', icon: Layers3, description: '按语义与篇幅切分原文，将文本转化为向量，同时保留章节和页码。', detail: '语义切片 · 向量索引' },
  { number: '03', title: 'seekdb 混合检索', subtitle: 'HYBRID SEARCH', icon: ScanSearch, description: '融合关键词匹配与向量语义检索，找到字面相关及含义相近的内容。', detail: '关键词 + 语义 · 统一排序' },
  { number: '04', title: '原文溯源', subtitle: 'CITATION', icon: BookOpenCheck, description: '从检索结果返回原始切片，核对上下文、来源文档与所在位置。', detail: '来源可查 · 证据可核' },
]

export default function About({ health, onStart }: { health: Health | null; onStart: () => void }) {
  return (
    <div className="page about-page">
      <header className="page-header about-header">
        <div>
          <span className="eyebrow"><Waypoints size={14} /> ABOUT ZHIYUAN</span>
          <h1>让研学检索，<br /><span>既有答案，也有来处</span></h1>
          <p>知源是一套面向研学场景的轻量资料检索助手。它不止寻找相似文字，更帮助你建立从问题到证据的可靠路径。</p>
        </div>
        <div className="about-seal" aria-hidden="true"><span>知</span><small>知所来<br />方有得</small></div>
      </header>

      <section className="architecture-section">
        <div className="section-heading">
          <div><span className="section-kicker">工作原理</span><h2>从一份资料，到一条可信线索</h2></div>
          <span className="architecture-badge"><Database size={15} />由 seekdb 驱动</span>
        </div>
        <div className="architecture-flow">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div className="architecture-step-wrap" key={step.number}>
                <article className="architecture-step">
                  <div className="step-top"><span>{step.number}</span><Icon size={23} strokeWidth={1.6} /></div>
                  <small>{step.subtitle}</small>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <div className="step-detail"><Check size={13} />{step.detail}</div>
                </article>
                {index < steps.length - 1 && <div className="flow-arrow" aria-hidden="true"><span /><ArrowRight size={18} /></div>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="about-two-columns">
        <div className="value-section">
          <div className="section-heading simple"><div><span className="section-kicker">项目价值</span><h2>为认真求知而设计</h2></div></div>
          <div className="value-list">
            <article><div className="value-icon"><FileSearch size={21} /></div><div><h3>不止于“找到”</h3><p>混合检索兼顾精确关键词与自然语言问题，减少资料中翻找的时间，把注意力留给理解与思考。</p></div></article>
            <article><div className="value-icon"><Quote size={21} /></div><div><h3>每条线索都有出处</h3><p>结果关联到具体文档和原文切片，章节、页码与来源清晰可见，让引用和复核成为自然的一步。</p></div></article>
            <article><div className="value-icon"><ShieldCheck size={21} /></div><div><h3>自己的资料，自己的知识库</h3><p>围绕本地研学资料构建索引，支持自主导入、分类与删除，逐步沉淀可重复使用的知识资产。</p></div></article>
          </div>
        </div>

        <aside className="engine-card">
          <span className="eyebrow"><Sparkles size={14} /> RETRIEVAL ENGINE</span>
          <div className="engine-logo"><Database size={28} /><span>seek<strong>db</strong></span></div>
          <h3>轻量而完整的检索底座</h3>
          <p>以 seekdb 承载文档切片与向量索引，在一个引擎中完成混合检索，减少复杂组件，让研学工具更易部署与使用。</p>
          <dl>
            <div><dt>检索引擎</dt><dd>{health?.engine || 'seekdb'}</dd></div>
            <div><dt>运行模式</dt><dd>{health?.mode || 'embedded'}</dd></div>
            <div><dt>向量模型</dt><dd>{health?.model || '本地语义模型'}</dd></div>
            <div><dt>当前索引</dt><dd>{health ? `${health.documents} 份文档 / ${health.chunks} 个切片` : '等待服务连接'}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="about-cta">
        <div className="cta-mark"><BookOpenCheck size={27} /></div>
        <div><span className="section-kicker">START WITH A QUESTION</span><h2>下一个发现，从好问题开始</h2><p>检索你的资料，也重新发现知识之间的联系。</p></div>
        <button className="primary-button" onClick={onStart}>进入检索工作台<ArrowRight size={17} /></button>
      </section>
    </div>
  )
}
