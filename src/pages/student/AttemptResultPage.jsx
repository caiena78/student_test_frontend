import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import client from '../../api/client'

export default function AttemptResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchResult = useCallback(async () => {
    try {
      setLoading(true)
      const res = await client.get(`/student/attempts/${id}/result`)
      setAttempt(res.data)
    } catch {
      setError('Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchResult() }, [fetchResult])

  if (loading) return (
    <>
      <Navbar />
      <div className="loading-center">
        <div className="spinner spinner-lg"></div>
        <span>Loading results...</span>
      </div>
    </>
  )

  if (error || !attempt) return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="alert alert-error">{error || 'Result not found'}</div>
        <button className="btn btn-ghost" onClick={() => navigate('/student')}>Back to My Tests</button>
      </div>
    </>
  )

  const test = attempt.test || {}
  const showGrade = attempt.show_grade_on_completion || test.show_grade_on_completion
  const showAnswers = attempt.show_correct_answers || test.show_correct_answers
  const score = attempt.score
  const maxScore = attempt.max_score || test.max_score
  const percentage = maxScore > 0 ? Math.round(score / maxScore * 100) : null
  const questions = attempt.questions || []

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'var(--success)'
    if (pct >= 60) return '#d97706'
    return 'var(--danger)'
  }

  const renderAnswerReview = (q, qa) => {
    if (!qa) return <p className="text-muted text-sm">No answer provided</p>
    const answerData = qa.answer_data || {}

    if (q.question_type === 'multiple_choice') {
      const selectedIds = answerData.selected_option_ids || []
      return (
        <div>
          {(q.options || []).map(opt => {
            const isSelected = selectedIds.includes(opt.id)
            const isCorrect = opt.is_correct
            let bg = 'white'
            let border = 'var(--border)'
            let icon = ''
            if (showAnswers) {
              if (isSelected && isCorrect) { bg = '#f0fdf4'; border = 'var(--success)'; icon = '✓' }
              else if (isSelected && !isCorrect) { bg = '#fef2f2'; border = 'var(--danger)'; icon = '✗' }
              else if (!isSelected && isCorrect) { bg = '#f0fdf4'; border = 'var(--success)'; icon = '○' }
            } else {
              if (isSelected) { bg = '#eff6ff'; border = 'var(--primary)' }
            }
            return (
              <div
                key={opt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  marginBottom: 6,
                  border: `1px solid ${border}`,
                  background: bg,
                  fontSize: 15
                }}
              >
                {isSelected && <span style={{ fontWeight: 600 }}>●</span>}
                {!isSelected && <span>○</span>}
                {opt.option_image && (
                  <img src={opt.option_image} alt="" style={{ height: 36, objectFit: 'contain', borderRadius: 4 }} />
                )}
                <span style={{ flex: 1 }}>{opt.option_text}</span>
                {showAnswers && icon && (
                  <span style={{
                    fontWeight: 700,
                    color: isCorrect ? 'var(--success)' : 'var(--danger)',
                    fontSize: 16
                  }}>
                    {icon}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (q.question_type === 'free_text') {
      return (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--text-muted)' }}>Your Answer:</div>
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            fontSize: 15,
            lineHeight: 1.6
          }}>
            {answerData.text || <em style={{ color: 'var(--text-muted)' }}>No answer provided</em>}
          </div>
          {showAnswers && q.sample_answer && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: 'var(--success)' }}>Sample Answer:</div>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                fontSize: 14,
                fontStyle: 'italic',
                color: '#166534'
              }}>
                {q.sample_answer}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (q.question_type === 'drag_drop') {
      const studentOrder = answerData.order || []
      const items = q.items || []
      return (
        <div style={{ display: 'grid', gridTemplateColumns: showAnswers ? '1fr 1fr' : '1fr', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--text-muted)' }}>
              Your Order:
            </div>
            {studentOrder.map((itemId, idx) => {
              const item = items.find(i => i.id === itemId)
              const isCorrect = showAnswers && item?.correct_position === idx + 1
              const isWrong = showAnswers && item?.correct_position !== idx + 1
              return (
                <div
                  key={itemId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius)',
                    marginBottom: 4,
                    border: `1px solid ${isCorrect ? 'var(--success)' : isWrong ? 'var(--danger)' : 'var(--border)'}`,
                    background: isCorrect ? '#f0fdf4' : isWrong ? '#fef2f2' : 'white',
                    fontSize: 14
                  }}
                >
                  <span style={{ fontWeight: 600, minWidth: 24, color: 'var(--text-muted)' }}>{idx + 1}.</span>
                  {item?.item_image && (
                    <img src={item.item_image} alt="" style={{ height: 28, objectFit: 'contain' }} />
                  )}
                  <span style={{ flex: 1 }}>{item?.item_text || `Item ${itemId}`}</span>
                  {isCorrect && <span style={{ color: 'var(--success)', fontSize: 14 }}>✓</span>}
                  {isWrong && <span style={{ color: 'var(--danger)', fontSize: 12 }}>✗ ({item?.correct_position})</span>}
                </div>
              )
            })}
            {studentOrder.length === 0 && <p className="text-muted text-sm">No answer provided</p>}
          </div>
          {showAnswers && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--success)' }}>
                Correct Order:
              </div>
              {[...items].sort((a, b) => (a.correct_position || 0) - (b.correct_position || 0)).map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius)',
                    marginBottom: 4,
                    border: '1px solid var(--success)',
                    background: '#f0fdf4',
                    fontSize: 14
                  }}
                >
                  <span style={{ fontWeight: 600, minWidth: 24, color: 'var(--text-muted)' }}>{idx + 1}.</span>
                  {item.item_image && (
                    <img src={item.item_image} alt="" style={{ height: 28, objectFit: 'contain' }} />
                  )}
                  <span>{item.item_text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        {/* Header */}
        <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {percentage !== null ? (percentage >= 80 ? '🎉' : percentage >= 60 ? '📝' : '📚') : '✅'}
          </div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>
            {test.title || 'Test Completed'}
          </h1>
          <p className="text-muted">Submitted {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'successfully'}</p>

          {showGrade && score != null && (
            <div style={{ marginTop: 20 }}>
              <div style={{
                fontSize: 48,
                fontWeight: 700,
                color: percentage !== null ? getScoreColor(percentage) : 'var(--primary)'
              }}>
                {score}
                {maxScore != null && <span style={{ fontSize: 28, color: 'var(--text-muted)' }}> / {maxScore}</span>}
              </div>
              {percentage !== null && (
                <div style={{ fontSize: 18, color: getScoreColor(percentage), marginTop: 4 }}>
                  {percentage}%
                </div>
              )}
              {/* Score bar */}
              {maxScore > 0 && (
                <div style={{ maxWidth: 300, margin: '16px auto 0', height: 8, background: 'var(--border)', borderRadius: 4 }}>
                  <div style={{
                    height: '100%',
                    background: getScoreColor(percentage),
                    borderRadius: 4,
                    width: `${percentage}%`,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              )}
            </div>
          )}

          {!showGrade && (
            <div style={{ marginTop: 20, padding: '16px 24px', background: '#f0fdf4', borderRadius: 'var(--radius)', display: 'inline-block' }}>
              <p style={{ color: 'var(--success)', fontWeight: 500, margin: 0 }}>
                Your responses have been submitted. Your teacher will review your results.
              </p>
            </div>
          )}
        </div>

        {/* Attempt feedback if any */}
        {attempt.feedback && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Teacher Feedback</h2>
            <p style={{ color: 'var(--text)', lineHeight: 1.6 }}>{attempt.feedback}</p>
          </div>
        )}

        {/* Question review (if show_correct_answers) */}
        {(showAnswers || showGrade) && questions.length > 0 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              {showAnswers ? 'Question Review' : 'Your Answers'}
            </h2>
            {questions.map((q, idx) => {
              const qa = attempt.question_attempts?.find(x => x.question_id === q.id)
              return (
                <div key={q.id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 20,
                  marginBottom: 12,
                  background: 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Q{idx + 1}</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        background: q.question_type === 'multiple_choice' ? '#dbeafe' : q.question_type === 'free_text' ? '#fef9c3' : '#ede9fe',
                        color: q.question_type === 'multiple_choice' ? '#1e40af' : q.question_type === 'free_text' ? '#854d0e' : '#5b21b6'
                      }}>
                        {q.question_type?.replace('_', ' ')}
                      </span>
                    </div>
                    {showGrade && qa?.manual_score != null && (
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {qa.manual_score} / {q.points ?? 1}
                      </span>
                    )}
                    {showGrade && qa?.manual_score == null && qa?.auto_score != null && (
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {qa.auto_score} / {q.points ?? 1}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 14, lineHeight: 1.5 }}>
                    {q.prompt_text}
                  </div>
                  {q.prompt_image && (
                    <img src={q.prompt_image} alt="" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 'var(--radius)', marginBottom: 12, display: 'block' }} />
                  )}

                  {renderAnswerReview(q, qa)}

                  {qa?.feedback && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0f9ff', borderRadius: 'var(--radius)', border: '1px solid #bae6fd' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>Teacher Feedback:</div>
                      <p style={{ fontSize: 14, color: '#0c4a6e', margin: 0 }}>{qa.feedback}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/student')}>
            Back to My Tests
          </button>
        </div>
      </div>
    </>
  )
}
