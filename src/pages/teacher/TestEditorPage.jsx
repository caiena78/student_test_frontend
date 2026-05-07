import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import client from '../../api/client'

// Map backend question format → frontend state format
function mapFromApi(q) {
  const config = typeof q.config === 'string'
    ? JSON.parse(q.config || '{}')
    : (q.config || {})
  return {
    id: q.id,
    _tempId: q.id, // use id as stable key
    question_type: q.type,
    prompt_text: q.prompt || '',
    prompt_image: q.prompt_image || '',
    points: q.points ?? 1,
    multi_select: !!config.multi_select,
    options: (q.options || []).map(o => ({
      id: o.id, _id: o.id || Math.random(),
      option_text: o.text || '',
      option_image: o.image || '',
      is_correct: !!o.is_correct,
    })),
    keywords: config.keywords || [],
    min_keywords: config.min_keywords ?? 1,
    sample_answer: config.sample_answer || '',
    items: (q.drag_drop_items || []).map(i => ({
      id: i.id, _id: i.id || Math.random(),
      item_text: i.item_text || '',
      item_image: i.item_image || '',
      correct_position: i.correct_position ?? 1,
    })),
    // true_false
    correct_answer: config.correct_answer !== undefined ? Boolean(config.correct_answer) : true,
  }
}

// Map frontend state format → backend API payload
function mapToApi(q, orderIndex) {
  const base = {
    type: q.question_type,
    prompt: q.prompt_text,
    prompt_image: q.prompt_image || null,
    points: Number(q.points),
    order_index: orderIndex,
  }
  if (q.question_type === 'multiple_choice') {
    base.config = { multi_select: !!q.multi_select }
    base.options = (q.options || []).map((o, i) => ({
      text: o.option_text,
      image: o.option_image || null,
      is_correct: !!o.is_correct,
      order_index: i,
    }))
  } else if (q.question_type === 'free_text') {
    base.config = {
      keywords: Array.isArray(q.keywords) ? q.keywords : [],
      min_keywords: Number(q.min_keywords) || 1,
      sample_answer: q.sample_answer || '',
    }
  } else if (q.question_type === 'drag_drop') {
    base.drag_drop_items = (q.items || []).map((it, i) => ({
      item_text: it.item_text,
      item_image: it.item_image || null,
      correct_position: Number(it.correct_position) || i,
    }))
  } else if (q.question_type === 'true_false') {
    base.config = { correct_answer: !!q.correct_answer }
  }
  return base
}

// ===== Sortable Question Card =====
function SortableQuestionCard({ question, index, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id || question._tempId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const typeLabel = { multiple_choice: 'Multiple Choice', free_text: 'Free Text', drag_drop: 'Drag & Drop', true_false: 'True / False' }
  const typeBg = { multiple_choice: '#dbeafe', free_text: '#fef9c3', drag_drop: '#ede9fe', true_false: '#fce7f3' }
  const typeFg = { multiple_choice: '#1e40af', free_text: '#854d0e', drag_drop: '#5b21b6', true_false: '#9d174d' }

  return (
    <div ref={setNodeRef} style={style} className="question-card">
      <div className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">⣿</div>
      <div className="question-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 13 }}>Q{index + 1}</span>
          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: typeBg[question.question_type], color: typeFg[question.question_type] }}>
            {typeLabel[question.question_type]}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{question.points ?? 1} pt{question.points !== 1 ? 's' : ''}</span>
        </div>
        <p style={{ margin: 0, fontSize: 15 }}>
          {question.prompt_text?.slice(0, 100) || <em style={{ color: 'var(--text-muted)' }}>No prompt</em>}
          {question.prompt_text?.length > 100 ? '…' : ''}
        </p>
      </div>
      <div className="question-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(question)}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(question)}>Delete</button>
      </div>
    </div>
  )
}

// ===== Question Form =====
function QuestionForm({ initial, onSave, onCancel }) {
  const [type, setType] = useState(initial?.question_type || 'multiple_choice')
  const [promptText, setPromptText] = useState(initial?.prompt_text || '')
  const [promptImage, setPromptImage] = useState(initial?.prompt_image || '')
  const [points, setPoints] = useState(initial?.points ?? 1)
  const [multiSelect, setMultiSelect] = useState(initial?.multi_select || false)

  const initOptions = () => {
    if (initial?.options?.length) return initial.options.map(o => ({ ...o, _id: o._id || o.id || Math.random() }))
    return [
      { _id: Math.random(), option_text: '', option_image: '', is_correct: false },
      { _id: Math.random(), option_text: '', option_image: '', is_correct: false },
    ]
  }
  const [options, setOptions] = useState(initOptions)

  const [correctAnswer, setCorrectAnswer] = useState(
    initial?.correct_answer !== undefined ? Boolean(initial.correct_answer) : true
  )

  const [keywords, setKeywords] = useState(
    Array.isArray(initial?.keywords) ? initial.keywords.join(', ') : (initial?.keywords || '')
  )
  const [minKeywords, setMinKeywords] = useState(initial?.min_keywords ?? 1)
  const [sampleAnswer, setSampleAnswer] = useState(initial?.sample_answer || '')

  const initItems = () => {
    if (initial?.items?.length) return initial.items.map(i => ({ ...i, _id: i._id || i.id || Math.random() }))
    return [
      { _id: Math.random(), item_text: '', item_image: '', correct_position: 1 },
      { _id: Math.random(), item_text: '', item_image: '', correct_position: 2 },
    ]
  }
  const [items, setItems] = useState(initItems)

  const [uploadingKey, setUploadingKey] = useState(null) // tracks which input is uploading

  const uploadImage = async (file, key, setter) => {
    setUploadingKey(key)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await client.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setter(res.data.url)
    } catch {
      alert('Image upload failed. Please try again.')
    } finally {
      setUploadingKey(null)
    }
  }

  const addOption = () => setOptions(o => [...o, { _id: Math.random(), option_text: '', option_image: '', is_correct: false }])
  const removeOption = (id) => setOptions(o => o.filter(x => x._id !== id))
  const updateOption = (id, field, value) => setOptions(o => o.map(x => x._id === id ? { ...x, [field]: value } : x))
  const setOptionCorrect = (id, checked) => {
    if (multiSelect) updateOption(id, 'is_correct', checked)
    else setOptions(o => o.map(x => ({ ...x, is_correct: x._id === id ? checked : false })))
  }

  const addItem = () => setItems(it => [...it, { _id: Math.random(), item_text: '', item_image: '', correct_position: it.length + 1 }])
  const removeItem = (id) => setItems(it => it.filter(x => x._id !== id))
  const updateItem = (id, field, value) => setItems(it => it.map(x => x._id === id ? { ...x, [field]: value } : x))

  const handleSave = () => {
    const q = { question_type: type, prompt_text: promptText, prompt_image: promptImage, points: Number(points) }
    if (type === 'multiple_choice') {
      q.multi_select = multiSelect
      q.options = options.map(o => ({ id: o.id, option_text: o.option_text, option_image: o.option_image, is_correct: !!o.is_correct }))
    } else if (type === 'free_text') {
      q.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean)
      q.min_keywords = Number(minKeywords)
      q.sample_answer = sampleAnswer
    } else if (type === 'drag_drop') {
      q.items = items.map((it, idx) => ({
        id: it.id, item_text: it.item_text, item_image: it.item_image,
        correct_position: Number(it.correct_position) || idx + 1,
      }))
    } else if (type === 'true_false') {
      q.correct_answer = correctAnswer
    }
    onSave(q)
  }

  return (
    <div>
      <div className="field">
        <label>Question Type</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="free_text">Free Text</option>
          <option value="drag_drop">Drag &amp; Drop</option>
          <option value="true_false">True / False</option>
        </select>
      </div>
      <div className="field">
        <label>Question Prompt</label>
        <textarea rows={3} value={promptText} onChange={e => setPromptText(e.target.value)} placeholder="Enter the question prompt..." />
      </div>
      <div className="field">
        <label>Prompt Image (optional)</label>
        <input type="file" accept="image/*" style={{ fontSize: 14 }} disabled={uploadingKey === 'prompt'}
          onChange={e => e.target.files[0] && uploadImage(e.target.files[0], 'prompt', setPromptImage)} />
        {uploadingKey === 'prompt' && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading…</span>}
        {promptImage && (
          <div style={{ marginTop: 8 }}>
            <img src={promptImage} alt="preview" className="image-preview" />
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPromptImage('')}>Remove</button>
          </div>
        )}
      </div>
      <div className="field">
        <label>Points</label>
        <input type="number" min="0" step="0.5" value={points} onChange={e => setPoints(e.target.value)} style={{ maxWidth: 100 }} />
      </div>

      {type === 'multiple_choice' && (
        <div>
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={multiSelect} onChange={e => setMultiSelect(e.target.checked)} style={{ width: 18, height: 18 }} />
              Allow multiple correct answers
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Answer Options</label>
            <p className="text-muted" style={{ fontSize: 13 }}>{multiSelect ? 'Check all correct answers' : 'Select the one correct answer'}</p>
          </div>
          {options.map((opt, idx) => (
            <div key={opt._id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 8 }}>
              <div className="option-row">
                <input type={multiSelect ? 'checkbox' : 'radio'} checked={!!opt.is_correct} onChange={e => setOptionCorrect(opt._id, e.target.checked)} title="Mark as correct" />
                <input type="text" placeholder={`Option ${idx + 1}`} value={opt.option_text} onChange={e => updateOption(opt._id, 'option_text', e.target.value)} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeOption(opt._id)} disabled={options.length <= 2}>✕</button>
              </div>
              <div style={{ paddingLeft: 26 }}>
                <input type="file" accept="image/*" style={{ fontSize: 13 }} disabled={uploadingKey === `opt-${opt._id}`}
                  onChange={e => e.target.files[0] && uploadImage(e.target.files[0], `opt-${opt._id}`, v => updateOption(opt._id, 'option_image', v))} />
                {uploadingKey === `opt-${opt._id}` && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading…</span>}
                {opt.option_image && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <img src={opt.option_image} alt="option" style={{ height: 40, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)' }} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateOption(opt._id, 'option_image', '')}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addOption}>+ Add Option</button>
        </div>
      )}

      {type === 'free_text' && (
        <div>
          <div className="field">
            <label>Keywords (comma-separated)</label>
            <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. photosynthesis, chlorophyll, sunlight" />
          </div>
          <div className="field">
            <label>Minimum Keywords Required</label>
            <input type="number" min="0" value={minKeywords} onChange={e => setMinKeywords(e.target.value)} style={{ maxWidth: 100 }} />
          </div>
          <div className="field">
            <label>Sample Answer (optional)</label>
            <textarea rows={3} value={sampleAnswer} onChange={e => setSampleAnswer(e.target.value)} placeholder="Provide a sample correct answer for reference..." />
          </div>
        </div>
      )}

      {type === 'drag_drop' && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <label>Items (students will reorder these)</label>
            <p className="text-muted" style={{ fontSize: 13 }}>Set the correct position for each item (1 = first).</p>
          </div>
          {items.map((item, idx) => (
            <div key={item._id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 8 }}>
              <div className="option-row">
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, minWidth: 24 }}>{idx + 1}.</span>
                <input type="text" placeholder={`Item ${idx + 1} text`} value={item.item_text} onChange={e => updateItem(item._id, 'item_text', e.target.value)} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Pos:</span>
                  <input type="number" min="1" value={item.correct_position} onChange={e => updateItem(item._id, 'correct_position', e.target.value)} style={{ width: 60 }} />
                </div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(item._id)} disabled={items.length <= 2}>✕</button>
              </div>
              <div style={{ paddingLeft: 30, marginTop: 8 }}>
                <input type="file" accept="image/*" style={{ fontSize: 13 }} disabled={uploadingKey === `item-${item._id}`}
                  onChange={e => e.target.files[0] && uploadImage(e.target.files[0], `item-${item._id}`, v => updateItem(item._id, 'item_image', v))} />
                {uploadingKey === `item-${item._id}` && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading…</span>}
                {item.item_image && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <img src={item.item_image} alt="item" style={{ height: 40, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)' }} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateItem(item._id, 'item_image', '')}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>+ Add Item</button>
        </div>
      )}

      {/* ── True / False ── */}
      {type === 'true_false' && (
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10 }}>
            Correct Answer <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          {[true, false].map(val => (
            <label
              key={String(val)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 8, marginBottom: 8, cursor: 'pointer',
                border: `2px solid ${correctAnswer === val ? 'var(--primary)' : 'var(--border)'}`,
                background: correctAnswer === val ? '#eff6ff' : 'white',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="radio"
                name="tf-correct"
                checked={correctAnswer === val}
                onChange={() => setCorrectAnswer(val)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 16, fontWeight: 600 }}>{val ? 'True' : 'False'}</span>
            </label>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>Save Question</button>
      </div>
    </div>
  )
}

// ===== Main TestEditorPage =====
export default function TestEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [title, setTitle] = useState('')
  const [titleImage, setTitleImage] = useState('')
  const [timeLimit, setTimeLimit] = useState('')
  const [attemptsAllowed, setAttemptsAllowed] = useState(1)
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [shuffleAnswers, setShuffleAnswers] = useState(true)
  const [showGradeOnCompletion, setShowGradeOnCompletion] = useState(true)
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false)
  const [allowBackNavigation, setAllowBackNavigation] = useState(true)

  const [questions, setQuestions] = useState([])
  const [deletedQuestionIds, setDeletedQuestionIds] = useState([])
  const [titleImageUploading, setTitleImageUploading] = useState(false)

  const uploadTitleImage = async (file) => {
    setTitleImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await client.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setTitleImage(res.data.url)
    } catch {
      setError('Title image upload failed. Please try again.')
    } finally {
      setTitleImageUploading(false)
    }
  }

  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const fetchTest = useCallback(async () => {
    try {
      setLoading(true)
      const res = await client.get(`/tests/${id}`)
      const t = res.data
      setTitle(t.title || '')
      setTitleImage(t.title_image || '')
      setTimeLimit(t.time_limit_minutes || '')
      setAttemptsAllowed(t.attempts_allowed ?? 1)
      setShuffleQuestions(!!t.shuffle_questions)
      setShuffleAnswers(!!t.shuffle_answers)
      setShowGradeOnCompletion(!!t.show_grade_on_completion)
      setShowCorrectAnswers(!!t.show_correct_answers)
      setAllowBackNavigation(t.allow_back_navigation !== 0)
      setQuestions((t.questions || []).map(mapFromApi))
    } catch {
      setError('Failed to load test')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { if (isEdit) fetchTest() }, [isEdit, fetchTest])

  const handleSave = async (publish = false) => {
    if (!title.trim()) { setError('Test title is required'); return }
    setError(''); setSuccess(''); setSaving(true)
    try {
      const testPayload = {
        title: title.trim(),
        title_image: titleImage || null,
        time_limit_minutes: timeLimit ? Number(timeLimit) : null,
        attempts_allowed: Number(attemptsAllowed),
        shuffle_questions: shuffleQuestions,
        shuffle_answers: shuffleAnswers,
        show_grade_on_completion: showGradeOnCompletion,
        show_correct_answers: showCorrectAnswers,
        allow_back_navigation: allowBackNavigation,
      }

      let testId = id

      if (isEdit) {
        await client.put(`/tests/${id}`, testPayload)

        // Delete removed questions
        for (const qid of deletedQuestionIds) {
          await client.delete(`/tests/questions/${qid}`)
        }
        setDeletedQuestionIds([])

        // Update existing / create new questions
        const updatedQuestions = []
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i]
          const apiPayload = mapToApi(q, i)
          if (q.id) {
            await client.put(`/tests/questions/${q.id}`, apiPayload)
            updatedQuestions.push(q)
          } else {
            const res = await client.post(`/tests/${testId}/questions`, apiPayload)
            updatedQuestions.push({ ...q, id: res.data.id, _tempId: res.data.id })
          }
        }
        setQuestions(updatedQuestions)

        if (publish) await client.put(`/tests/${id}/publish`)
        setSuccess(publish ? 'Test published!' : 'Test saved!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const res = await client.post('/tests', testPayload)
        testId = res.data.id

        for (let i = 0; i < questions.length; i++) {
          await client.post(`/tests/${testId}/questions`, mapToApi(questions[i], i))
        }

        if (publish) await client.put(`/tests/${testId}/publish`)
        setSuccess('Test created! Redirecting…')
        setTimeout(() => navigate(`/teacher/tests/${testId}/edit`), 1000)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save test')
    } finally {
      setSaving(false)
    }
  }

  const handleQuestionSave = (qData) => {
    if (editingQuestion) {
      setQuestions(qs => qs.map(q => {
        const match = (q.id && q.id === editingQuestion.id) || (q._tempId && q._tempId === editingQuestion._tempId)
        return match ? { ...q, ...qData } : q
      }))
    } else {
      const tempId = Date.now() + Math.random()
      setQuestions(qs => [...qs, { ...qData, _tempId: tempId }])
    }
    setQuestionModalOpen(false)
    setEditingQuestion(null)
  }

  const handleDeleteQuestion = (q) => {
    if (!window.confirm('Delete this question?')) return
    if (q.id) setDeletedQuestionIds(ids => [...ids, q.id])
    setQuestions(qs => qs.filter(x => q.id ? x.id !== q.id : x._tempId !== q._tempId))
  }

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    setQuestions(qs => {
      const getKey = q => q.id || q._tempId
      const oldIdx = qs.findIndex(q => getKey(q) === active.id)
      const newIdx = qs.findIndex(q => getKey(q) === over.id)
      return arrayMove(qs, oldIdx, newIdx)
    })
  }

  const getKey = q => q.id || q._tempId

  if (loading) return (<><Navbar /><div className="loading-center"><div className="spinner spinner-lg"></div></div></>)

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="page-header">
          <h1>{isEdit ? 'Edit Test' : 'New Test'}</h1>
          <div className="flex-row">
            <button className="btn btn-ghost" onClick={() => navigate('/teacher/tests')}>Cancel</button>
            <button className="btn btn-ghost" onClick={() => handleSave(false)} disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
            <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>{saving ? 'Publishing…' : 'Publish'}</button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Test Settings</h2>
          <div className="field">
            <label>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter test title..." required />
          </div>
          <div className="field">
            <label>Title Image (optional)</label>
            <input type="file" accept="image/*" style={{ fontSize: 14 }} disabled={titleImageUploading}
              onChange={e => e.target.files[0] && uploadTitleImage(e.target.files[0])} />
            {titleImageUploading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading…</span>}
            {titleImage && !titleImageUploading && (
              <div style={{ marginTop: 8 }}>
                <img src={titleImage} alt="Title preview" className="image-preview" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTitleImage('')}>Remove</button>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label>Time Limit (minutes, optional)</label>
              <input type="number" min="1" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="No limit" />
            </div>
            <div className="field">
              <label>Attempts Allowed</label>
              <input type="number" min="1" value={attemptsAllowed} onChange={e => setAttemptsAllowed(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              [shuffleQuestions, setShuffleQuestions, 'Shuffle Questions'],
              [shuffleAnswers, setShuffleAnswers, 'Shuffle Answer Options'],
              [showGradeOnCompletion, setShowGradeOnCompletion, 'Show Grade on Completion'],
              [showCorrectAnswers, setShowCorrectAnswers, 'Show Correct Answers'],
              [allowBackNavigation, setAllowBackNavigation, 'Allow Back Navigation'],
            ].map(([val, setter, label]) => (
              <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 0' }}>
                <input type="checkbox" checked={!!val} onChange={e => setter(e.target.checked)} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 14 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              Questions <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 14 }}>({questions.length})</span>
            </h2>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingQuestion(null); setQuestionModalOpen(true) }}>+ Add Question</button>
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              <p>No questions yet. Add your first question to get started.</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setEditingQuestion(null); setQuestionModalOpen(true) }}>+ Add Question</button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map(getKey)} strategy={verticalListSortingStrategy}>
                {questions.map((q, idx) => (
                  <SortableQuestionCard
                    key={getKey(q)} question={q} index={idx}
                    onEdit={q => { setEditingQuestion(q); setQuestionModalOpen(true) }}
                    onDelete={handleDeleteQuestion}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => handleSave(false)} disabled={saving}>Save Draft</button>
          <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>Publish</button>
        </div>
      </div>

      <Modal
        isOpen={questionModalOpen}
        onClose={() => { setQuestionModalOpen(false); setEditingQuestion(null) }}
        title={editingQuestion ? 'Edit Question' : 'Add Question'}
      >
        <QuestionForm
          initial={editingQuestion}
          onSave={handleQuestionSave}
          onCancel={() => { setQuestionModalOpen(false); setEditingQuestion(null) }}
        />
      </Modal>
    </>
  )
}
