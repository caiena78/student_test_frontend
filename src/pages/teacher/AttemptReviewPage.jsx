import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import client from '../../api/client'

function MCReview({ question, answerData }) {
  const selectedIds = new Set((answerData?.selected_ids || []).map(Number))
  return (
    <div>
      {(question.options || []).map(opt => {
        const isSelected = selectedIds.has(opt.id)
        const isCorrect = !!opt.is_correct
        let borderColor = 'var(--border)', bg = '#f8fafc'
        if (isSelected && isCorrect) { borderColor = 'var(--success)'; bg = '#f0fdf4' }
        else if (isSelected && !isCorrect) { borderColor = 'var(--danger)'; bg = '#fef2f2' }
        else if (!isSelected && isCorrect) { borderColor = 'var(--success)'; bg = '#f0fdf4' }
        return (
          <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 6, border: `1px solid ${borderColor}`, background: bg }}>
            <span style={{ fontSize: 18 }}>
              {isSelected ? (isCorrect ? '✓' : '✗') : (isCorrect ? '○' : '')}
            </span>
            {opt.image && <img src={opt.image} alt="" style={{ height: 36, objectFit: 'contain', borderRadius: 4 }} />}
            <span style={{ flex: 1 }}>{opt.text}</span>
            {isCorrect && <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Correct</span>}
            {isSelected && !isCorrect && <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>Wrong</span>}
          </div>
        )
      })}
    </div>
  )
}

function TrueFalseReview({ question, answerData }) {
  const config = typeof question.config === 'string' ? JSON.parse(question.config || '{}') : (question.config || {})
  const correct = Boolean(config.correct_answer)
  const studentRaw = answerData?.answer
  const student = studentRaw !== undefined && studentRaw !== null ? String(studentRaw) === 'true' : null

  return (
    <div>
      {[true, false].map(val => {
        const isStudent = student === val
        const isCorrect = correct === val
        let border = 'var(--border)', bg = '#f8fafc'
        if (isStudent && isCorrect)  { border = 'var(--success)'; bg = '#f0fdf4' }
        else if (isStudent && !isCorrect) { border = 'var(--danger)'; bg = '#fef2f2' }
        else if (!isStudent && isCorrect) { border = 'var(--success)'; bg = '#f0fdf4' }
        return (
          <div key={String(val)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 6, border: `1px solid ${border}`, background: bg }}>
            <span style={{ fontSize: 18 }}>
              {isStudent ? (isCorrect ? '✓' : '✗') : (isCorrect ? '○' : '')}
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{val ? 'True' : 'False'}</span>
            {isCorrect && <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Correct</span>}
            {isStudent && !isCorrect && <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>Selected</span>}
          </div>
        )
      })}
      {student === null && <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No answer provided</p>}
    </div>
  )
}

function DragDropReview({ question, answerData }) {
  const studentOrder = answerData?.order || []
  const items = question.drag_drop_items || []
  const sortedCorrect = [...items].sort((a, b) => (a.correct_position || 0) - (b.correct_position || 0))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-muted)' }}>Student's Order</div>
        {studentOrder.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No answer provided</p>}
        {studentOrder.map((itemId, idx) => {
          const item = items.find(i => i.id === Number(itemId))
          const isCorrect = item?.correct_position === idx
          return (
            <div key={itemId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius)', marginBottom: 4, border: `1px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}`, background: isCorrect ? '#f0fdf4' : '#fef2f2', fontSize: 14 }}>
              <span style={{ fontWeight: 600, minWidth: 20 }}>{idx + 1}.</span>
              {item?.item_image && <img src={item.item_image} alt="" style={{ height: 28, objectFit: 'contain' }} />}
              <span>{item?.item_text || `Item ${itemId}`}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                {isCorrect ? '✓' : `✗ (pos ${item?.correct_position ?? '?'})`}
              </span>
            </div>
          )
        })}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-muted)' }}>Correct Order</div>
        {sortedCorrect.map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius)', marginBottom: 4, border: '1px solid var(--success)', background: '#f0fdf4', fontSize: 14 }}>
            <span style={{ fontWeight: 600, minWidth: 20 }}>{idx + 1}.</span>
            {item.item_image && <img src={item.item_image} alt="" style={{ height: 28, objectFit: 'contain' }} />}
            <span>{item.item_text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AttemptReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Keyed by attempt_answer.id
  const [scores, setScores] = useState({})
  const [feedback, setFeedback] = useState({})
  const [overallFeedback, setOverallFeedback] = useState('')

  const fetchAttempt = useCallback(async () => {
    try {
      setLoading(true)
      const res = await client.get(`/tests/attempts/${id}`)
      const data = res.data
      setAttempt(data)
      setOverallFeedback(data.overall_feedback || '')

      const s = {}, f = {}
      ;(data.questions || []).forEach(q => {
        const ans = q.answer
        if (ans) {
          s[ans.id] = ans.manual_score != null ? ans.manual_score : (ans.auto_score ?? '')
          f[ans.id] = ans.feedback || ''
        }
      })
      setScores(s)
      setFeedback(f)
    } catch {
      setError('Failed to load attempt')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchAttempt() }, [fetchAttempt])

  const questions = attempt?.questions || []
  const totalScore = Object.values(scores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  const maxScore = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)

  const handleSaveGrade = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      const answers = questions
        .filter(q => q.answer)
        .map(q => ({
          id: q.answer.id,
          manual_score: parseFloat(scores[q.answer.id]) || 0,
          feedback: feedback[q.answer.id] || '',
        }))
      await client.put(`/tests/attempts/${id}/grade`, {
        answers,
        overall_feedback: overallFeedback,
        status: 'graded',
      })
      setSuccess('Grade saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save grade')
    } finally {
      setSaving(false)
    }
  }

  const getConfig = (q) => {
    if (!q.config) return {}
    return typeof q.config === 'string' ? JSON.parse(q.config) : q.config
  }

  if (loading) return (<><Navbar /><div className="loading-center"><div className="spinner spinner-lg"></div></div></>)
  if (!attempt) return (<><Navbar /><div className="container" style={{ paddingTop: 24 }}><div className="alert alert-error">Attempt not found</div></div></>)

  const studentName = attempt.student_first_name
    ? `${attempt.student_first_name} ${attempt.student_last_name || ''}`.trim()
    : attempt.student_username || `Student #${attempt.student_id}`

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="page-header">
          <div>
            <h1>Review Attempt</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              <strong>{studentName}</strong> · {attempt.test_title}
              {attempt.submitted_at && <span> · Submitted {new Date(attempt.submitted_at).toLocaleString()}</span>}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card" style={{ background: 'var(--primary)', color: 'white', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, opacity: 0.85 }}>Current Total Score</div>
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>
                {totalScore.toFixed(1)}
                <span style={{ fontSize: 18, opacity: 0.75 }}> / {maxScore}</span>
              </div>
            </div>
            <button className="btn" style={{ background: 'white', color: 'var(--primary)', fontWeight: 600 }} onClick={handleSaveGrade} disabled={saving}>
              {saving ? 'Saving…' : 'Save Grade'}
            </button>
          </div>
        </div>

        {questions.map((q, idx) => {
          const ans = q.answer
          const answerData = ans?.answer_data
            ? (typeof ans.answer_data === 'string' ? JSON.parse(ans.answer_data) : ans.answer_data)
            : null
          const config = getConfig(q)
          const typeLabel = { multiple_choice: 'Multiple Choice', free_text: 'Free Text', drag_drop: 'Drag & Drop', true_false: 'True / False' }
          const typeBg = { multiple_choice: '#dbeafe', free_text: '#fef9c3', drag_drop: '#ede9fe', true_false: '#fce7f3' }
          const typeFg = { multiple_choice: '#1e40af', free_text: '#854d0e', drag_drop: '#5b21b6', true_false: '#9d174d' }

          return (
            <div key={q.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Q{idx + 1}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: typeBg[q.type], color: typeFg[q.type] }}>
                    {typeLabel[q.type]}
                  </span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{q.points ?? 1} pts</span>
              </div>

              <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{q.prompt}</p>
              {q.prompt_image && <img src={q.prompt_image} alt="Question" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 'var(--radius)', marginBottom: 12 }} />}

              {q.type === 'multiple_choice' && <MCReview question={q} answerData={answerData} />}
              {q.type === 'true_false' && <TrueFalseReview question={q} answerData={answerData} />}

              {q.type === 'free_text' && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--text-muted)' }}>Student's Answer:</div>
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 15, minHeight: 48 }}>
                    {answerData?.text || <em style={{ color: 'var(--text-muted)' }}>No answer provided</em>}
                  </div>
                  {config.keywords?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Keywords: </span>
                      {config.keywords.map(kw => (
                        <span key={kw} style={{ display: 'inline-block', padding: '1px 6px', background: '#f1f5f9', borderRadius: 4, fontSize: 12, marginRight: 4 }}>{kw}</span>
                      ))}
                    </div>
                  )}
                  {config.sample_answer && (
                    <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', background: '#f8fafc', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <strong>Sample:</strong> {config.sample_answer}
                    </div>
                  )}
                </div>
              )}

              {q.type === 'drag_drop' && <DragDropReview question={q} answerData={answerData} />}

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <label style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }}>Points awarded:</label>
                  <input
                    type="number" min="0" max={q.points ?? undefined} step="0.5"
                    value={ans ? (scores[ans.id] ?? '') : ''}
                    onChange={e => ans && setScores(prev => ({ ...prev, [ans.id]: e.target.value }))}
                    style={{ width: 80 }}
                    placeholder={`/${q.points ?? 1}`}
                    disabled={!ans}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/ {q.points ?? 1}</span>
                  {ans?.auto_score != null && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Auto: {ans.auto_score}</span>
                  )}
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Feedback (optional)</label>
                  <textarea
                    rows={2}
                    value={ans ? (feedback[ans.id] || '') : ''}
                    onChange={e => ans && setFeedback(prev => ({ ...prev, [ans.id]: e.target.value }))}
                    placeholder="Leave feedback for this question…"
                    disabled={!ans}
                  />
                </div>
              </div>
            </div>
          )
        })}

        <div className="card">
          <div className="field" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 16, fontWeight: 700 }}>Overall Feedback</label>
            <textarea rows={4} value={overallFeedback} onChange={e => setOverallFeedback(e.target.value)} placeholder="Provide overall feedback for the student…" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8, alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Total: {totalScore.toFixed(1)} / {maxScore}</span>
          <button className="btn btn-primary" onClick={handleSaveGrade} disabled={saving}>
            {saving ? 'Saving…' : 'Save Grade'}
          </button>
        </div>
      </div>
    </>
  )
}
