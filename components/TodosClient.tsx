'use client'

import { useState } from 'react'
import { createTodo, toggleTodo, deleteTodo } from '@/lib/actions'
import { Plus, Check, Trash2, Calendar, Loader2 } from 'lucide-react'

interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
  due_date?: string
  priority?: 'low' | 'medium' | 'high'
  created_at: string
}

interface TodosClientProps {
  todos: Todo[]
}

export function TodosClient({ todos }: TodosClientProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTodo, setNewTodo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    setIsSubmitting(true)
    await createTodo({
      title: newTodo,
      due_date: dueDate || undefined,
      priority: 'medium'
    })
    setNewTodo('')
    setDueDate('')
    setIsAdding(false)
    setIsSubmitting(false)
  }

  const handleToggle = async (id: string, completed: boolean) => {
    setIsLoading(id)
    await toggleTodo(id, !completed)
    setIsLoading(null)
  }

  const handleDelete = async (id: string) => {
    setIsLoading(id)
    await deleteTodo(id)
    setIsLoading(null)
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return 'var(--color-text-tertiary)'
    }
  }

  const incompleteTodos = todos.filter(t => !t.completed)
  const completedTodos = todos.filter(t => t.completed)

  return (
    <div>
      {/* Add Todo Form */}
      {isAdding ? (
        <form onSubmit={handleAdd} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Was muss erledigt werden?"
              autoFocus
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                fontSize: '14px',
                background: 'var(--color-bg)',
                color: 'var(--color-text)'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              <Calendar size={14} style={{ color: 'var(--color-text-tertiary)' }} />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setNewTodo(''); setDueDate(''); }}
              style={{
                padding: '8px 14px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                background: 'var(--color-bg)',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newTodo.trim()}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderRadius: '8px',
                background: '#4F46E5',
                fontSize: '13px',
                color: 'white',
                cursor: 'pointer',
                opacity: isSubmitting || !newTodo.trim() ? 0.5 : 1
              }}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Hinzufügen'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px 16px',
            marginBottom: '16px',
            border: '2px dashed var(--color-border)',
            borderRadius: '12px',
            background: 'transparent',
            fontSize: '14px',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          className="hover:border-[#4F46E5] hover:text-[#4F46E5]"
        >
          <Plus size={16} />
          Neue Aufgabe
        </button>
      )}

      {/* Todo List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {incompleteTodos.length === 0 && completedTodos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
            Keine Aufgaben vorhanden
          </div>
        ) : (
          <>
            {incompleteTodos.map((todo) => (
              <div
                key={todo.id}
                className="group"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: '12px',
                  opacity: isLoading === todo.id ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <button
                  onClick={() => handleToggle(todo.id, todo.completed)}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    border: `2px solid ${getPriorityColor(todo.priority)}`,
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px'
                  }}
                >
                  {isLoading === todo.id && <Loader2 size={12} className="animate-spin" style={{ color: getPriorityColor(todo.priority) }} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>
                    {todo.title}
                  </p>
                  {todo.due_date && (
                    <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {new Date(todo.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100"
                  style={{
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-text-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {completedTodos.length > 0 && (
              <>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-tertiary)', marginTop: '8px', marginBottom: '4px' }}>
                  Erledigt ({completedTodos.length})
                </div>
                {completedTodos.slice(0, 3).map((todo) => (
                  <div
                    key={todo.id}
                    className="group"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      background: 'var(--color-bg-secondary)',
                      borderRadius: '10px',
                      opacity: isLoading === todo.id ? 0.5 : 0.6,
                      transition: 'all 0.2s'
                    }}
                  >
                    <button
                      onClick={() => handleToggle(todo.id, todo.completed)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#10B981',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Check size={14} style={{ color: 'white' }} />
                    </button>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', textDecoration: 'line-through', flex: 1 }}>
                      {todo.title}
                    </p>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="opacity-0 group-hover:opacity-100"
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-text-tertiary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
