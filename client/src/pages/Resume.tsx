import { useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, Lock, Sparkles, Trash2, Upload, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useApi, useToast } from '../lib/context';
import { Badge, Button, Card, CardHeader, EmptyState, Field, PageHeader, ProgressBar, ScoreRing, Spinner, Textarea } from '../components/ui';

interface Analysis {
  totalExperienceYears: number | null;
  skills: string[];
  sections: Record<string, boolean>;
  summaryText: string | null;
  projectCount: number;
  achievements: string[];
  roleCompatibility: { role: string; score: number; missing: string[] }[];
  atsScore: number;
  atsChecks: { label: string; ok: boolean; tip: string }[];
  atsKeywords: { present: string[]; missing: string[] };
  formatting: { wordCount: number; bulletCount: number; hasEmail: boolean; hasPhone: boolean; hasLinkedIn: boolean };
  jobMatch: null | { score: number; matchedSkills: string[]; missingSkills: string[]; matchedKeywords: string[]; missingKeywords: string[] };
  improvements: string[];
  improvedSummary: string;
  projectRewrites: { original: string; improved: string }[];
  skillRecommendations: string[];
  evaluator: 'ai' | 'offline';
}
interface ResumeRow { id: string; filename: string; size_bytes: number; created_at: string; latest_analysis: { id: string; ats_score: number; match_score: number | null } | null }

export default function Resume() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const list = useApi(() => api.get<{ resumes: ResumeRow[] }>('/resumes'));
  const [active, setActive] = useState<string | null>(null);
  const [jd, setJd] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ id: string; analysis: Analysis } | null>(null);
  const current = active ?? list.data?.resumes[0]?.id ?? null;

  const upload = async (file: File) => {
    if (!/\.(pdf|docx)$/i.test(file.name)) return toast('Only PDF or DOCX files are supported', 'error');
    if (file.size > 5 * 1024 * 1024) return toast('File too large (max 5 MB)', 'error');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post<{ resume: { id: string } }>('/resumes', fd);
      toast('Resume uploaded');
      setActive(r.resume.id);
      setResult(null);
      await list.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  const analyze = async () => {
    if (!current) return;
    setAnalyzing(true);
    try {
      const r = await api.post<{ id: string; analysis: Analysis }>(`/resumes/${current}/analyze`, { jobDescription: jd.trim() || null });
      setResult(r);
      await list.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this resume and its analyses permanently?')) return;
    await api.del(`/resumes/${id}`);
    if (current === id) {
      setActive(null);
      setResult(null);
    }
    await list.reload();
    toast('Resume deleted');
  };

  const a = result?.analysis;
  return (
    <div>
      <PageHeader title="Resume Analyzer" subtitle="ATS checks, role compatibility, job-description matching and an improved resume you can download." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void upload(f);
              }}
              className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700"
            >
              <Upload className="h-8 w-8 text-navy-500" />
              <p className="mt-2 text-sm font-medium">Drop your resume here</p>
              <p className="text-xs text-slate-500">PDF or DOCX · max 5 MB · text-based (not scanned)</p>
              <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} data-testid="resume-input" />
              <Button size="sm" className="mt-3" onClick={() => input.current?.click()} loading={uploading}>Choose file</Button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" /> Stored privately in your account; only you can access or delete it.</p>
          </Card>
          <Card>
            <CardHeader title="Your resumes" />
            {list.loading && !list.data ? <Spinner /> : list.data?.resumes.length === 0 ? <EmptyState icon={<FileText className="h-6 w-6" />} title="No resume uploaded" /> : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.data?.resumes.map((r) => (
                  <li key={r.id} className={`flex items-center gap-2 px-4 py-3 ${current === r.id ? 'bg-navy-50 dark:bg-navy-950' : ''}`}>
                    <button className="min-w-0 flex-1 text-left" onClick={() => { setActive(r.id); setResult(null); }}>
                      <p className="truncate text-sm font-medium" data-testid="resume-name">{r.filename}</p>
                      <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()} · {(r.size_bytes / 1024).toFixed(0)} KB{r.latest_analysis && ` · ATS ${r.latest_analysis.ats_score}%`}</p>
                    </button>
                    <a href={api.url(`/resumes/${r.id}/file`)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Download original"><Download className="h-4 w-4" /></a>
                    <button onClick={() => void remove(r.id)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete resume"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <Field label="Job description (optional)" hint="Paste a JD to get a match score and missing keywords.">
              {(id) => <Textarea id={id} rows={7} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description here…" data-testid="jd-input" />}
            </Field>
            <Button className="mt-3 w-full" onClick={analyze} loading={analyzing} disabled={!current} data-testid="analyze-resume"><Sparkles className="h-4 w-4" /> Analyze resume</Button>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {!a ? (
            <Card><EmptyState icon={<Sparkles className="h-6 w-6" />} title={analyzing ? 'Analyzing…' : 'Upload and analyze your resume'} text="You'll get an ATS score, skills found, role compatibility, missing keywords, an improved summary and stronger bullet points." /></Card>
          ) : (
            <div className="space-y-4" data-testid="resume-analysis">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="flex items-center gap-4 p-5"><ScoreRing value={a.atsScore} size={64} /><div><p className="text-sm font-semibold">ATS score</p><p className="text-xs text-slate-500">{a.atsChecks.filter((c) => c.ok).length}/{a.atsChecks.length} checks passed</p></div></Card>
                <Card className="flex items-center gap-4 p-5">
                  {a.jobMatch ? <ScoreRing value={a.jobMatch.score} size={64} /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 dark:bg-slate-800">No JD</div>}
                  <div><p className="text-sm font-semibold">Job match</p><p className="text-xs text-slate-500" data-testid="jd-match">{a.jobMatch ? `${a.jobMatch.score}% match to the pasted JD` : 'Paste a JD to compare'}</p></div>
                </Card>
                <Card className="p-5">
                  <p className="text-sm font-semibold">Experience detected</p>
                  <p className="mt-1 text-2xl font-bold" data-testid="exp-detected">{a.totalExperienceYears != null ? `${a.totalExperienceYears} yrs` : '—'}</p>
                  <p className="text-xs text-slate-500">{a.formatting.wordCount} words · {a.formatting.bulletCount} bullets · {a.projectCount} projects</p>
                </Card>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-navy-50 px-4 py-3 text-sm dark:bg-navy-950">
                <span>Analysis by {a.evaluator === 'ai' ? 'OpenAI + rules' : 'built-in rules engine (AI not configured)'}.</span>
                <a href={api.url(`/resumes/analyses/${result!.id}/improved.docx`)} className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800" data-testid="download-improved">
                  <Download className="h-3.5 w-3.5" /> Download improved resume (.docx)
                </a>
              </div>

              {a.jobMatch && (
                <Card>
                  <CardHeader title="Job description match" />
                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <div><p className="label">Matched skills</p><div className="flex flex-wrap gap-1">{a.jobMatch.matchedSkills.map((s) => <Badge key={s} tone="green">{s}</Badge>)}{!a.jobMatch.matchedSkills.length && <span className="text-sm text-slate-500">—</span>}</div></div>
                    <div><p className="label">Missing skills</p><div className="flex flex-wrap gap-1" data-testid="missing-skills">{a.jobMatch.missingSkills.map((s) => <Badge key={s} tone="red">{s}</Badge>)}{!a.jobMatch.missingSkills.length && <span className="text-sm text-slate-500">None 🎉</span>}</div></div>
                    <div className="sm:col-span-2"><p className="label">Missing keywords from the JD</p><div className="flex flex-wrap gap-1">{a.jobMatch.missingKeywords.map((s) => <Badge key={s} tone="amber">{s}</Badge>)}{!a.jobMatch.missingKeywords.length && <span className="text-sm text-slate-500">None</span>}</div></div>
                  </div>
                </Card>
              )}

              <Card>
                <CardHeader title="Improved professional summary" />
                <p className="p-5 text-sm leading-relaxed" data-testid="improved-summary">{a.improvedSummary}</p>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader title="ATS & formatting checks" />
                  <ul className="space-y-2 p-5">
                    {a.atsChecks.map((c) => (
                      <li key={c.label} className="flex gap-2 text-sm">
                        {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
                        <div><p className="font-medium">{c.label}</p>{!c.ok && <p className="text-xs text-slate-500">{c.tip}</p>}</div>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card>
                  <CardHeader title="Role compatibility" />
                  <div className="space-y-3 p-5">
                    {a.roleCompatibility.map((r) => (
                      <div key={r.role}>
                        <div className="flex justify-between text-sm"><span className="font-medium">{r.role}</span><span className="text-slate-500">{r.score}%</span></div>
                        <ProgressBar value={r.score} tone={r.score >= 70 ? 'green' : r.score >= 40 ? 'navy' : 'amber'} />
                        {r.missing.length > 0 && <p className="mt-1 text-xs text-slate-500">Missing: {r.missing.join(', ')}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card>
                <CardHeader title="Skills found" subtitle={`${a.skills.length} technical skills detected`} />
                <div className="flex flex-wrap gap-1 p-5">{a.skills.map((s) => <Badge key={s} tone="navy">{s}</Badge>)}</div>
                {a.skillRecommendations.length > 0 && (
                  <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                    <p className="label">Recommended skills to learn or highlight</p>
                    <div className="flex flex-wrap gap-1">{a.skillRecommendations.map((s) => <Badge key={s} tone="amber">{s}</Badge>)}</div>
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader title="Recommended improvements" />
                <ol className="list-decimal space-y-1.5 p-5 pl-10 text-sm">{a.improvements.map((x) => <li key={x}>{x}</li>)}</ol>
              </Card>

              {a.projectRewrites.length > 0 && (
                <Card>
                  <CardHeader title="Better project descriptions" subtitle="Stronger verbs and measurable outcomes – only claim what you actually did" />
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {a.projectRewrites.map((r) => (
                      <li key={r.original} className="grid gap-2 p-5 text-sm sm:grid-cols-2">
                        <p className="text-slate-500 line-through decoration-red-300">{r.original}</p>
                        <p className="font-medium text-emerald-800 dark:text-emerald-300">{r.improved}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {a.achievements.length > 0 && (
                <Card>
                  <CardHeader title="Quantified achievements found" />
                  <ul className="list-disc space-y-1 p-5 pl-10 text-sm">{a.achievements.map((x) => <li key={x}>{x}</li>)}</ul>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
