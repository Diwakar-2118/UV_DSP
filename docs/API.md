# CareerPilot AI – REST API

Base path: `/api`. All bodies are JSON unless noted. Authentication is a session cookie (`cp_session`, httpOnly) set by `/auth/login` or `/auth/register`. A `Authorization: Bearer <token>` header carrying the same JWT is also accepted.

Errors use the shape `{ "error": string, "details"?: object }`, with status `400` validation, `401` unauthenticated, `403` forbidden, `404` not found or not yours, `409` conflict, `413` file too large, `415` unsupported type, `422` unreadable file, `429` rate limited, `500` internal.

## Health & system
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | – | `{ status, database, time }` |
| GET | `/system/status` | ✓ | Integration status: database, auth provider, AI, email, Telegram, scheduler, live sources |

## Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ fullName, email, password(≥8) }` | 201 `{ user }`, or `{ needsEmailConfirmation }` with Supabase email confirmation; 409 if the email exists |
| POST | `/auth/login` | `{ email, password }` | `{ user }`; 401 on bad credentials. Rate-limited (30 / 15 min) |
| POST | `/auth/logout` | – | Clears the session |
| GET | `/auth/me` | – | `{ user }` (profile + preferences + latest resume) |
| DELETE | `/auth/account` | – | Deletes the account and all its data |

## Profile
| Method | Path | Body |
|---|---|---|
| GET | `/profile` | – |
| PUT | `/profile` | `{ fullName, currentRole, totalExperience, currentCompany, currentLocation, technicalSkills[], industries[], projects, expectedSalaryLpa\|null, noticePeriodDays\|null, linkedinUrl }` |
| PUT | `/profile/preferences` | `{ roles[] (Manual QA, API Testing, Fintech QA, QA Automation, Performance Testing), locations[], minExperience, maxExperience, industries[], jobTypes[], minSalaryLpa\|null }` |

## Jobs
| Method | Path | Description |
|---|---|---|
| GET | `/jobs` | Search. Query: `q, roles, locations, skills` (comma lists), `expMin, expMax, company, industry, salaryMin, jobType, postedWithinDays (1\|3\|7\|30), minMatch (0-100), sort (latest\|match\|experience\|company), includeDemo (true\|false; default: only when no live jobs), savedOnly, page, pageSize`. Returns `{ total, page, pageSize, includeDemo, liveAvailable, jobs[] }`. Each job includes `match: { score, breakdown{skills,experience,industry,location}, matchingSkills, missingSkills, experienceFit, reasons }` |
| GET | `/jobs/:id` | Job detail with match |
| POST / DELETE | `/jobs/:id/save` | Save / unsave |
| GET | `/jobs/saved` | Saved jobs |
| GET | `/jobs/search-links` | Deep links to LinkedIn, Naukri, Indeed and Wellfound searches. Query: `keywords, location, days, expMin` |
| GET | `/jobs/sources` | Source registry with last-run status and counts |
| PATCH | `/jobs/sources/:id` | `{ enabled }` (admin when `ADMIN_EMAILS` is set) |
| POST | `/jobs/refresh` | Run collection + alert matching now (admin; limit 3 / 10 min) |

## Notifications
| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | `?unreadOnly&limit` → `{ notifications[], unread }` |
| POST | `/notifications/read` | `{ ids?: uuid[] }`; omit `ids` to mark all read |
| DELETE | `/notifications/:id` | Remove one |
| GET | `/notifications/settings` | `{ settings, channels{inApp,email,telegram}, scheduler }`. A channel reports `active: true` only when configured, enabled **and** verified by a successful test |
| PUT | `/notifications/settings` | `{ enabled, deliveryTime "HH:MM", timezone, minMatchScore, roles[], locations[], inAppEnabled, emailEnabled, telegramEnabled, telegramChatId\|null }` |
| POST | `/notifications/test/:channel` | `email` \| `telegram`; on success the channel is marked verified |
| POST | `/notifications/run` | Match new jobs for the current user now and deliver through active channels |
| GET | `/notifications/history` | Delivery log (digests and tests, with status) |

## Applications
| Method | Path | Description |
|---|---|---|
| GET | `/applications` | `?status&q` |
| GET | `/applications/stats` | `{ total, submitted, byStatus, pipeline[], interviewsScheduled, shortlisted, selectionRate, responseRate }` |
| POST | `/applications` | `{ company, roleTitle, jobId?, jobUrl?, location?, status?, appliedOn?, interviewAt?, recruiterName?, recruiterEmail?, recruiterPhone?, companyNotes?, notes? }`; 409 if the same job is already tracked |
| GET / PUT / DELETE | `/applications/:id` | Read / full update / delete |
| PATCH | `/applications/:id/status` | `{ status }` |

## Interview preparation & mock interviews
| Method | Path | Description |
|---|---|---|
| GET | `/prep/topics` | Categories → topics with notes, key concepts, examples, question counts and your average score |
| GET | `/prep/questions` | `?category&topic&difficulty&q` → questions with ideal answers |
| GET | `/interviews/options` | Categories, modes, difficulties, experience levels |
| POST | `/interviews` | `{ category, mode, difficulty, experienceLevel, count(1-20), durationMinutes\|null }` → interview state + first question |
| GET | `/interviews` | History |
| GET | `/interviews/performance` | Average score per topic (last 60 days) |
| GET | `/interviews/:id` | `{ interview, current }`; expires automatically after `endsAt` |
| POST | `/interviews/:id/answer` | `{ questionId, answer, selectedOption? }` → `{ evaluation{score,isCorrect,coveredPoints,missingPoints,suggestions,feedback,evaluator}, idealAnswer, correctOption, interview, current }`. 409 if answered out of order or after time-up |
| POST | `/interviews/:id/finish` | End early |
| GET | `/interviews/:id/review` | Every answer with its score and ideal answer |

## Resumes
| Method | Path | Description |
|---|---|---|
| GET | `/resumes` | Your resumes with the latest analysis scores |
| POST | `/resumes` | `multipart/form-data` field `file` (PDF/DOCX, ≤ `MAX_UPLOAD_MB`) |
| POST | `/resumes/:id/analyze` | `{ jobDescription? }` → `{ id, analysis }` |
| GET | `/resumes/:id/analyses` | Analysis history |
| GET | `/resumes/:id/file` | Download the original |
| GET | `/resumes/analyses/:analysisId/improved.docx` | Download the improved resume |
| DELETE | `/resumes/:id` | Delete the resume and its analyses |

## Study plan, companies, dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/study/plan` | Active plan `{ plan, items[], stats }` or `null` |
| POST | `/study/plan` | `{ days, dailyGoalMinutes, startDate? }`. Generates a plan weighted towards weak topics |
| PATCH | `/study/items/:id` | `{ completed?, notes? }` |
| PATCH | `/study/plan/goal` | `{ dailyGoalMinutes }` |
| GET | `/companies?q=` | Curated company list |
| GET | `/companies/:name` | Company prep (curated, AI-generated or generic; always labelled) |
| GET | `/dashboard` | Dashboard aggregates |
| GET | `/dashboard/roadmap` | Career stages, readiness, next actions |
