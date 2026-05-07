import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Navbar from '../../components/Navbar'
import client from '../../api/client'

function getConfig(q) {
  if (!q.config) return {}
  return typeof q.config === 'string' ? JSON.parse(q.config) : q.config
}

// ── Sortable drag-drop item ──
function SortableItem({ id, text, image }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        background: 'white', border: `1px solid ${isDragging ? 'var(--primary)' : '#e2e8f0'}`,
        borderRadius: 8, padding: '12px 16px', marginBottom: 8,
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex', alignItems: 'center', gap: 12, minHeight: 48,
        userSelect: 'none', boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
        opacity: isDragging ? 0.85 : 1, position: 'relative', zIndex: isDragging ? 1 : 0,
      }}
      {...attributes} {...listeners}
    >
      <span style={{ color: '#94a3b8', fontSize: 18 }}>☰</span>
      {image && <img src={image} alt="" style={{ height: 40, objectFit: 'contain', borderRadius: 4 }} />}
      <span style={{ fontSize: 16 }}>{text}</span>
    </div>
  )
}

// ── Countdown timer ──
function Timer({ totalSeconds, startedAt, onExpire }) {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const initial = Math.max(0, totalSeconds - elapsed)
  const [remaining, setRemaining] = useState(initial)
  const fired = useRef(false)

  useEffect(() => {
    if (initial <= 0 && !fired.current) { fired.current = true; onExpire(); return }
    const t = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(t)
          if (!fired.current) { fired.current = true; onExpire() }
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const urgent = remaining < 60
  return (
    <span style={{
      fontWeight: 700, fontSize: 15, padding: '4px 10px', borderRadius: 6,
      background: urgent ? '#fef2f2' : '#f1f5f9',
      color: urgent ? 'var(--danger)' : 'var(--text)',
      border: `1px solid ${urgent ? '#fecaca' : 'var(--border)'}`,
    }}>
      ⏱ {mins}:{secs.toString().padStart(2, '0')}
    </span>
  )
}

// ── Main page ──
export default function TakeTestPage() {
  const { id: attemptId } = useParams()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})   // { [questionId]: answerData }
  const [dndOrders, setDndOrders] = useState({}) // { [questionId]: item[] }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await client.get(`/student/attempts/${attemptId}`)
      const data = res.data
      setAttempt(data)

      const qs = data.questions || []
      setQuestions(qs)

      // Init drag-drop orders
      const orders = {}
      qs.forEach(q => {
        if (q.type === 'drag_drop') {
          orders[q.id] = [...(q.drag_drop_items || [])]
        }
      })
      setDndOrders(orders)
    } catch {
      setError('Failed to load test. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [attemptId])

  useEffect(() => { load() }, [load])

  // ── answer helpers ──
  const setAnswer = (qid, data) => setAnswers(prev => ({ ...prev, [qid]: data }))

  const handleMC = (q, optId) => {
    const config = getConfig(q)
    if (config.multi_select) {
      const cur = answers[q.id]?.selected_ids || []
      const next = cur.includes(optId) ? cur.filter(x => x !== optId) : [...cur, optId]
      setAnswer(q.id, { selected_ids: next })
    } else {
      setAnswer(q.id, { selected_ids: [optId] })
    }
  }

  const handleDragEnd = (qid, event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setDndOrders(prev => {
      const items = prev[qid] || []
      const from = items.findIndex(i => i.id === active.id)
      const to = items.findIndex(i => i.id === over.id)
      const next = arrayMove(items, from, to)
      setAnswer(qid, { order: next.map(i => i.id) })
      return { ...prev, [qid]: next }
    })
  }

  // Build answer array in the format the backend expects
  const buildAnswers = () =>
    questions.map(q => ({
      question_id: q.id,
      answer_data: q.type === 'drag_drop'
        ? { order: (dndOrders[q.id] || q.drag_drop_items || []).map(i => i.id) }
        : (answers[q.id] || {}),
    }))

  const doSubmit = async () => {
    setSubmitting(true)
    try {
      await client.post(`/student/attempts/${attemptId}/submit`, { answers: buildAnswers() })
      navigate(`/student/result/${attemptId}`)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to submit. Please try again.')
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    if (!window.confirm('Submit your test? You cannot change answers after submission.')) return
    doSubmit()
  }

  const handleTimerExpire = () => {
    setError('Time is up! Submitting…')
    client.post(`/student/attempts/${attemptId}/submit`, { answers: buildAnswers() })
      .finally(() => navigate(`/student/result/${attemptId}`))
  }

  // ── render guards ──
  if (loading) return (
    <><Navbar />
      <div className="loading-center"><div className="spinner spinner-lg" /><span>Loading test…</span></div>
    </>
  )

  if (error && !attempt) return (
    <><Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-ghost" onClick={() => navigate('/student')}>Back to My Tests</button>
      </div>
    </>
  )

  if (!questions.length) return (
    <><Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="alert alert-error">No questions found in this test.</div>
        <button className="btn btn-ghost" onClick={() => navigate('/student')}>Back to My Tests</button>
      </div>
    </>
  )

  const q = questions[currentIndex]
  const config = getConfig(q)
  const currentAnswer = answers[q.id] || {}
  const allowBack = attempt?.allow_back_navigation !== 0
  const isLast = currentIndex === questions.length - 1
  const timeLimitSeconds = attempt?.time_limit_minutes ? attempt.time_limit_minutes * 60 : null

  return (
    <>
      <Navbar />

      {/* ── Top bar ── */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', position: 'sticky', top: 56, zIndex: 90 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 16, flex: 1, minWidth: 0 }}>
            {attempt?.title_image && (
              <img src={attempt.title_image} alt="" style={{ height: 28, objectFit: 'contain', marginRight: 8, verticalAlign: 'middle' }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attempt?.title || 'Test'}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--primary)', flexShrink: 0 }}>
            Question {currentIndex + 1} / {questions.length}
          </div>
          {timeLimitSeconds && attempt?.started_at && (
            <Timer totalSeconds={timeLimitSeconds} startedAt={attempt.started_at} onExpire={handleTimerExpire} />
          )}
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--border)' }}>
          <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 2, width: `${((currentIndex + 1) / questions.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div className="container" style={{ paddingTop: 24, paddingBottom: 80, maxWidth: 720 }}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          {/* Question prompt */}
          <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>{q.prompt}</p>
          {q.prompt_image && (
            <img src={q.prompt_image} alt="" style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 8, marginBottom: 16 }} />
          )}

          {/* ── Multiple Choice ── */}
          {q.type === 'multiple_choice' && (
            <div>
              {config.multi_select && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Select all that apply.</p>
              )}
              {(q.options || []).map(opt => {
                const selected = (currentAnswer.selected_ids || []).includes(opt.id)
                return (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 8, marginBottom: 8, cursor: 'pointer',
                      border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                      background: selected ? '#eff6ff' : 'white',
                      transition: 'all 0.15s', minHeight: 48,
                    }}
                  >
                    <input
                      type={config.multi_select ? 'checkbox' : 'radio'}
                      name={`question-${q.id}`}
                      checked={selected}
                      onChange={() => handleMC(q, opt.id)}
                      style={{ width: 18, height: 18, flexShrink: 0, cursor: 'pointer' }}
                    />
                    {opt.image && <img src={opt.image} alt="" style={{ height: 44, objectFit: 'contain', borderRadius: 4 }} />}
                    <span style={{ fontSize: 16, flex: 1 }}>{opt.text}</span>
                  </label>
                )
              })}
            </div>
          )}

          {/* ── True / False ── */}
          {q.type === 'true_false' && (
            <div>
              {[true, false].map(val => {
                const selected = currentAnswer.answer === val
                return (
                  <label
                    key={String(val)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 18px', borderRadius: 8, marginBottom: 10, cursor: 'pointer',
                      border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                      background: selected ? '#eff6ff' : 'white',
                      transition: 'all 0.15s', minHeight: 52,
                    }}
                  >
                    <input
                      type="radio"
                      name={`tf-${q.id}`}
                      checked={selected}
                      onChange={() => setAnswer(q.id, { answer: val })}
                      style={{ width: 20, height: 20, flexShrink: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 17, fontWeight: 600 }}>{val ? 'True' : 'False'}</span>
                  </label>
                )
              })}
            </div>
          )}

          {/* ── Free Text ── */}
          {q.type === 'free_text' && (
            <textarea
              rows={5}
              value={currentAnswer.text || ''}
              onChange={e => setAnswer(q.id, { text: e.target.value })}
              placeholder="Type your answer here…"
              style={{ fontSize: 16, minHeight: 120, width: '100%' }}
            />
          )}

          {/* ── Drag & Drop ── */}
          {q.type === 'drag_drop' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Drag the items into the correct order.</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(q.id, e)}>
                <SortableContext items={(dndOrders[q.id] || q.drag_drop_items || []).map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {(dndOrders[q.id] || q.drag_drop_items || []).map(item => (
                    <SortableItem key={item.id} id={item.id} text={item.item_text} image={item.item_image} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div>
            {allowBack && currentIndex > 0 && (
              <button className="btn btn-ghost" onClick={() => setCurrentIndex(i => i - 1)}>← Previous</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isLast && (
              <button className="btn btn-primary" onClick={() => setCurrentIndex(i => i + 1)}>Next →</button>
            )}
            {isLast && (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting…</> : 'Submit Test'}
              </button>
            )}
          </div>
        </div>

        {/* ── Question dot nav ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 20 }}>
          {questions.map((qt, idx) => {
            const ans = answers[qt.id]
            const answered = (ans?.selected_ids?.length > 0) || (ans?.text?.trim()) ||
              qt.type === 'drag_drop' || (qt.type === 'true_false' && ans?.answer !== undefined && ans?.answer !== null)
            const isCurrent = idx === currentIndex
            const canClick = allowBack || idx >= currentIndex
            return (
              <button
                key={qt.id}
                onClick={() => canClick && setCurrentIndex(idx)}
                title={`Question ${idx + 1}${answered ? ' (answered)' : ''}`}
                style={{
                  width: 34, height: 34, borderRadius: '50%', fontSize: 13, fontWeight: 600,
                  cursor: canClick ? 'pointer' : 'default',
                  opacity: !allowBack && idx < currentIndex ? 0.4 : 1,
                  border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isCurrent ? 'var(--primary)' : answered ? '#dbeafe' : 'white',
                  color: isCurrent ? 'white' : 'var(--text)',
                }}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
