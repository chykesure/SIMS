//src/components/settings/score-import.tsx
// FILE: src/components/settings/score-import.tsx
// 4-Step CSV Import Wizard for Previous Term Scores
// Modern modal confirmations + toast notifications (no window.alert/confirm)
// Replace the entire file with this code

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store';

// ── Types ──
interface ClassItem {
  id: string;
  title: string;
}

interface SessionItem {
  id: string;
  sessionOne: number;
  sessionTwo: number;
  active: boolean;
}

interface ImportResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    matched: number;
    failed: number;
    studentsCreated: number;
    subjectsCreated: number;
    examScoresSaved: number;
    errors: string[];
  };
}

// ── Modal Props ──
interface ModalProps {
  open: boolean;
  type: 'confirm' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  details?: string;
  confirmLabel?: string;
  confirmColor?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// ── Toast Props ──
interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// ── Modal Component ──
function Modal({ open, type, title, message, details, confirmLabel, confirmColor, onConfirm, onCancel }: ModalProps) {
  if (!open) return null;

  const iconMap = {
    confirm: '?',
    success: '\u2713',
    error: '\u2717',
    warning: '!',
  };
  const colorMap = {
    confirm: { bg: '#fffbeb', border: '#f59e0b', icon: '#f59e0b', text: '#92400e' },
    success: { bg: '#f0fdf4', border: '#22c55e', icon: '#16a34a', text: '#166534' },
    error:   { bg: '#fef2f2', border: '#ef4444', icon: '#dc2626', text: '#991b1b' },
    warning: { bg: '#fffbeb', border: '#f59e0b', icon: '#d97706', text: '#92400e' },
  };
  const c = colorMap[type];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out',
    }} onClick={type === 'success' || type === 'error' ? onCancel : undefined}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', padding: '32px',
        maxWidth: '440px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        border: `1px solid ${c.border}`,
        animation: 'slideUp 0.25s ease-out',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Icon */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          backgroundColor: `${c.icon}15`, border: `2px solid ${c.icon}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '24px', fontWeight: 'bold', color: c.icon,
        }}>
          {iconMap[type]}
        </div>

        {/* Title */}
        <h3 style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
          {title}
        </h3>

        {/* Message */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', marginBottom: '8px', lineHeight: '1.5' }}>
          {message}
        </p>

        {/* Details */}
        {details && (
          <div style={{
            backgroundColor: c.bg, borderRadius: '8px', padding: '12px',
            marginBottom: '20px', fontSize: '13px', color: c.text, lineHeight: '1.6',
            whiteSpace: 'pre-line', textAlign: 'left',
          }}>
            {details}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {(type === 'confirm' || type === 'warning') && onCancel && (
            <button onClick={onCancel} style={{
              flex: 1, padding: '12px 20px', borderRadius: '10px',
              border: '1px solid #d1d5db', backgroundColor: 'white',
              color: '#374151', fontWeight: '600', fontSize: '14px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              Cancel
            </button>
          )}
          {onConfirm && (
            <button onClick={onConfirm} style={{
              flex: 1, padding: '12px 20px', borderRadius: '10px',
              border: 'none', backgroundColor: confirmColor || c.icon,
              color: 'white', fontWeight: '600', fontSize: '14px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {confirmLabel || (type === 'confirm' || type === 'warning' ? 'Yes, Proceed' : 'OK')}
            </button>
          )}
          {(!onConfirm && (type === 'success' || type === 'error')) && (
            <button onClick={onCancel} style={{
              padding: '12px 32px', borderRadius: '10px',
              border: 'none', backgroundColor: c.icon,
              color: 'white', fontWeight: '600', fontSize: '14px',
              cursor: 'pointer',
            }}>
              OK
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

// ── Toast Notification ──
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  const colorMap = {
    success: { bg: '#f0fdf4', border: '#86efac', icon: '\u2705', text: '#166534' },
    error:   { bg: '#fef2f2', border: '#fecaca', icon: '\u274C', text: '#991b1b' },
    warning: { bg: '#fffbeb', border: '#fde68a', icon: '\u26A0\uFE0F', text: '#92400e' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', icon: '\u2139\uFE0F', text: '#1e40af' },
  };

  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map((t) => {
        const c = colorMap[t.type];
        return (
          <div key={t.id} style={{
            backgroundColor: c.bg, border: `1px solid ${c.border}`,
            borderRadius: '10px', padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '300px', maxWidth: '420px',
            animation: 'toastIn 0.3s ease-out',
          }}>
            <span style={{ fontSize: '18px' }}>{c.icon}</span>
            <span style={{ flex: 1, fontSize: '13px', color: c.text, fontWeight: '500' }}>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px',
              color: '#9ca3af', padding: '0 4px', lineHeight: 1,
            }}>&times;</button>
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

// ── Main Component ──
export default function ScoreImport() {
  const { user, tenant } = useAppStore();
  const tenantId = user?.tenantId || tenant?.id || '';

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: Config
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');

  // Step 2: CSV
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvError, setCsvError] = useState('');

  // Step 3: Preview
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);

  // Step 4: Result
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  // Reset students
  const [resetting, setResetting] = useState(false);

  // Delete scores
  const [deletingScores, setDeletingScores] = useState(false);
  const [clearTerm, setClearTerm] = useState('all');

  // Modal state
  const [modal, setModal] = useState<ModalProps>({ open: false, type: 'confirm', title: '', message: '' });
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toast helpers ──
  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Modal helpers ──
  const showConfirm = useCallback((title: string, message: string, details: string, action: () => void, confirmLabel?: string, confirmColor?: string) => {
    setModal({ open: true, type: 'confirm', title, message, details, confirmLabel, confirmColor, onConfirm: () => { setModal((m) => ({ ...m, open: false })); action(); }, onCancel: () => setModal((m) => ({ ...m, open: false })) });
  }, []);

  const showWarning = useCallback((title: string, message: string, details: string, action: () => void, confirmLabel?: string) => {
    setModal({ open: true, type: 'warning', title, message, details, confirmLabel, confirmColor: '#dc2626', onConfirm: () => { setModal((m) => ({ ...m, open: false })); action(); }, onCancel: () => setModal((m) => ({ ...m, open: false })) });
  }, []);

  const showAlert = useCallback((type: 'success' | 'error', title: string, message: string, details?: string) => {
    setModal({ open: true, type, title, message, details, onConfirm: undefined, onCancel: () => setModal((m) => ({ ...m, open: false })) });
  }, []);

  // ── Fetch classes & sessions ──
  useEffect(() => {
    if (!tenantId) return;

    async function fetchData() {
      try {
        const headers = { 'x-tenant-id': tenantId };

        const [classRes, sessionRes] = await Promise.all([
          fetch('/api/classes', { headers }),
          fetch('/api/sessions', { headers }),
        ]);

        if (classRes.ok) {
          const classData = await classRes.json();
          setClasses(Array.isArray(classData) ? classData : classData.data || []);
        }

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          const sessionList = Array.isArray(sessionData) ? sessionData : sessionData.data || [];
          setSessions(sessionList);

          const active = sessionList.find((s: SessionItem) => s.active);
          if (active) setSelectedSessionId(active.id);
        }
      } catch (err) {
        console.error('Failed to fetch config:', err);
      }
    }

    fetchData();
  }, [tenantId]);

  // ── Parse CSV text into rows ──
  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const header = parseCSVLine(lines[0]).map((h: string) =>
      h.trim().toLowerCase().replace(/\s+/g, '_')
    );

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      const row: Record<string, string> = {};
      for (let j = 0; j < header.length; j++) {
        row[header[j]] = (values[j] || '').trim();
      }
      rows.push(row);
    }
    return rows;
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // ── Handle file upload ──
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setCsvError('No valid rows found in CSV. Check format: student_name, admission_no, subject, total_score');
      } else {
        setCsvError('');
        setCsvRows(parsed);
      }
    };
    reader.readAsText(file);
  }

  // ── Handle paste CSV ──
  function handlePaste() {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) {
      setCsvError('No valid rows found. Make sure you have a header row + data rows.');
    } else {
      setCsvError('');
      setCsvRows(parsed);
    }
  }

  // ── Delete imported scores by term ──
  async function handleDeleteScores() {
    if (!selectedClassId || !selectedSessionId || !tenantId) {
      addToast('warning', 'Please select a class and session first.');
      return;
    }

    const termText = clearTerm === 'all'
      ? 'ALL terms'
      : clearTerm === '1' ? 'First Term' : clearTerm === '2' ? 'Second Term' : 'Third Term';

    showConfirm(
      'Delete Score Records',
      'This action cannot be undone.',
      `Class: ${selectedClassTitle}\nSession: ${selectedSessionLabel}\nTerm: ${termText}\n\nThis affects BOTH the Exam module and Report/Print module.`,
      () => executeDeleteScores(),
      'Yes, Delete Scores',
      '#f59e0b',
    );
  }

  async function executeDeleteScores() {
    setDeletingScores(true);

    try {
      let url = `/api/previous-scores/clear?classId=${encodeURIComponent(selectedClassId)}&sessionId=${encodeURIComponent(selectedSessionId)}`;

      if (clearTerm === 'all') {
        let totalExam = 0;
        let totalPrev = 0;

        for (const t of ['1', '2', '3']) {
          const res = await fetch(
            `${url}&term=${t}&tenantId=${encodeURIComponent(tenantId)}`,
            { method: 'DELETE', headers: { 'x-tenant-id': tenantId } }
          );
          const data = await res.json();
          totalExam += data.examDeleted || 0;
          totalPrev += data.prevDeleted || 0;
        }

        showAlert('success', 'Scores Deleted', 'All 3 terms cleared.', `ExamScore: ${totalExam} records deleted\nPreviousTermScore: ${totalPrev} records deleted`);
        addToast('success', `Cleared all 3 terms in ${selectedClassTitle} (${totalExam + totalPrev} records)`);
      } else {
        const res = await fetch(
          `${url}&term=${clearTerm}&tenantId=${encodeURIComponent(tenantId)}`,
          { method: 'DELETE', headers: { 'x-tenant-id': tenantId } }
        );
        const data = await res.json();

        if (data.success) {
          showAlert('success', 'Scores Deleted', data.message, `ExamScore: ${data.examDeleted} records deleted\nPreviousTermScore: ${data.prevDeleted} records deleted`);
          addToast('success', `${termLabelFor(clearTerm)} scores cleared (${data.examDeleted + data.prevDeleted} records)`);
        } else {
          showAlert('error', 'Delete Failed', data.message);
          addToast('error', data.message);
        }
      }
    } catch (err: any) {
      showAlert('error', 'Error', err.message);
      addToast('error', err.message);
    } finally {
      setDeletingScores(false);
    }
  }

  // ── Reset / Clear all students ──
  function handleResetStudents() {
    if (!selectedClassId || !tenantId) return;

    const classTitle = selectedClassTitle;

    showConfirm(
      'Delete All Students',
      `This will permanently delete ALL students in "${classTitle}".`,
      'This action cannot be undone. Make sure you have a backup if needed.',
      () => {
        // Double confirmation
        showWarning(
          'Final Confirmation',
          `Are you absolutely sure you want to delete ALL students in "${classTitle}"?`,
          'Type of data to be removed: All student records, their profiles, and associated data for this class.',
          () => executeResetStudents(),
          'Yes, Delete All Students',
        );
      },
      'Continue',
    );
  }

  async function executeResetStudents() {
    setResetting(true);

    try {
      const res = await fetch(
        `/api/students/clear?classId=${encodeURIComponent(selectedClassId)}`,
        {
          method: 'DELETE',
          headers: { 'x-tenant-id': tenantId },
        }
      );

      const data = await res.json();

      if (data.success) {
        showAlert('success', 'Students Deleted', `Successfully removed ${data.deletedCount} student(s) from "${selectedClassTitle}".`, 'You can now import fresh data.');
        addToast('success', `Deleted ${data.deletedCount} student(s) from ${selectedClassTitle}`);
      } else {
        showAlert('error', 'Reset Failed', data.message);
        addToast('error', data.message);
      }
    } catch (err: any) {
      showAlert('error', 'Error', err.message);
      addToast('error', err.message);
    } finally {
      setResetting(false);
    }
  }

  // ── Go to preview ──
  function goToPreview() {
    if (csvRows.length === 0) {
      addToast('warning', 'Please upload a CSV file first.');
      return;
    }
    setPreviewRows(csvRows.slice(0, 10));
    setStep(3);
  }

  // ── Run import ──
  async function runImport() {
    if (!selectedClassId || !selectedSessionId || !selectedTerm || !tenantId) {
      addToast('warning', 'Please complete Step 1 configuration.');
      return;
    }
    if (csvRows.length === 0) {
      addToast('warning', 'No CSV data to import.');
      return;
    }

    setImporting(true);
    setStep(4);

    try {
      const res = await fetch('/api/previous-scores/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          csvData: csvText,
          sessionId: selectedSessionId,
          term: parseInt(selectedTerm),
          classId: selectedClassId,
          tenantId,
        }),
      });

      const data = await res.json();

      // Check if API returned old-style error format: { error: "msg" } without stats
      if (data.error && !data.stats) {
        setImportResult({
          success: false,
          message: data.error,
          stats: {
            total: csvRows.length,
            matched: 0,
            failed: csvRows.length,
            studentsCreated: 0,
            subjectsCreated: 0,
            examScoresSaved: 0,
            errors: [data.error],
          },
        });
        return;
      }

      // Normalize: ensure stats and errors always exist
      const normalized: ImportResult = {
        success: data.success ?? false,
        message: data.message ?? (data.success === true ? 'Import completed' : 'Import failed'),
        stats: {
          total: data.stats?.total ?? csvRows.length,
          matched: data.stats?.matched ?? 0,
          failed: data.stats?.failed ?? 0,
          studentsCreated: data.stats?.studentsCreated ?? 0,
          subjectsCreated: data.stats?.subjectsCreated ?? 0,
          examScoresSaved: data.stats?.examScoresSaved ?? 0,
          errors: data.stats?.errors ?? [],
        },
      };
      setImportResult(normalized);
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err.message || 'An unexpected error occurred.',
        stats: { total: csvRows.length, matched: 0, failed: csvRows.length, studentsCreated: 0, subjectsCreated: 0, examScoresSaved: 0, errors: [err.message || 'Unknown error'] },
      });
    } finally {
      setImporting(false);
    }
  }

  // ── Reset wizard ──
  function resetWizard() {
    setStep(1);
    setCsvText('');
    setCsvFileName('');
    setCsvRows([]);
    setCsvError('');
    setPreviewRows([]);
    setImportResult(null);
    setImporting(false);
  }

  // ── Helpers ──
  function termLabelFor(term: string): string {
    return term === '1' ? 'First Term' : term === '2' ? 'Second Term' : 'Third Term';
  }

  const selectedClassTitle = classes.find((c) => c.id === selectedClassId)?.title || '';
  const selectedSessionLabel = sessions.find((s) => s.id === selectedSessionId)
    ? `${sessions.find((s) => s.id === selectedSessionId)!.sessionOne}/${sessions.find((s) => s.id === selectedSessionId)!.sessionTwo}`
    : '';

  // ── Render ──
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Modal */}
      <Modal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        details={modal.details}
        confirmLabel={modal.confirmLabel}
        confirmColor={modal.confirmColor}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
      />

      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
        Import Previous Term Scores
      </h2>

      {/* Progress Steps */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              backgroundColor: step >= s ? '#4f46e5' : '#e5e7eb',
            }}
          />
        ))}
      </div>

      {/* ─────────── STEP 1: Configuration ─────────── */}
      {step === 1 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            Step 1: Configure Import
          </h3>

          {/* Class Dropdown */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
              Class *
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={selectStyle}
            >
              <option value="">-- Select Class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Session Dropdown */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
              Session *
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={selectStyle}
            >
              <option value="">-- Select Session --</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sessionOne}/{s.sessionTwo} {s.active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Term Dropdown */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
              Term to Import As *
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              style={selectStyle}
            >
              <option value="1">First Term</option>
              <option value="2">Second Term</option>
              <option value="3">Third Term</option>
            </select>
          </div>

          {/* ─── Delete Scores by Term ─── */}
          {selectedClassId && selectedSessionId && (
            <div style={{
              marginBottom: '24px', padding: '16px',
              border: '2px solid #fde68a', borderRadius: '12px', backgroundColor: '#fffbeb',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px' }}>{'\uD83D\uDDD1\uFE0F'}</span>
                <p style={{ fontSize: '13px', color: '#92400e', fontWeight: '600', margin: 0 }}>
                  Delete Imported Scores
                </p>
              </div>
              <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '12px', lineHeight: '1.5' }}>
                Clear score records before re-importing. This deletes from both the Exam module and Report/Print module.
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={clearTerm}
                  onChange={(e) => setClearTerm(e.target.value)}
                  style={selectStyle}
                >
                  <option value="all">All Terms</option>
                  <option value="1">First Term</option>
                  <option value="2">Second Term</option>
                  <option value="3">Third Term</option>
                </select>
                <button
                  onClick={handleDeleteScores}
                  disabled={deletingScores}
                  style={{
                    padding: '8px 16px', backgroundColor: deletingScores ? '#9ca3af' : '#f59e0b',
                    color: 'white', border: 'none', borderRadius: '8px',
                    cursor: deletingScores ? 'not-allowed' : 'pointer',
                    fontWeight: '600', fontSize: '14px', transition: 'all 0.15s',
                  }}
                >
                  {deletingScores ? 'Deleting...' : `Delete ${clearTerm === 'all' ? 'All Terms' : termLabelFor(clearTerm)} Scores`}
                </button>
              </div>
            </div>
          )}

          {/* ─── Reset Students ─── */}
          {selectedClassId && (
            <div style={{
              marginBottom: '24px', padding: '16px',
              border: '2px solid #fecaca', borderRadius: '12px', backgroundColor: '#fef2f2',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px' }}>{'\u26A0\uFE0F'}</span>
                <p style={{ fontSize: '13px', color: '#991b1b', fontWeight: '600', margin: 0 }}>
                  Danger Zone: Reset Students
                </p>
              </div>
              <p style={{ fontSize: '13px', color: '#991b1b', marginBottom: '12px', lineHeight: '1.5' }}>
                Delete all existing students in <strong>{selectedClassTitle}</strong> before importing. This is useful if you want to start fresh.
              </p>
              <button
                onClick={handleResetStudents}
                disabled={resetting}
                style={{
                  padding: '8px 16px', backgroundColor: resetting ? '#9ca3af' : '#dc2626',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: resetting ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontSize: '14px', transition: 'all 0.15s',
                }}
              >
                {resetting ? 'Deleting...' : `Reset All Students in ${selectedClassTitle}`}
              </button>
            </div>
          )}

          {/* Next Button */}
          <button
            onClick={() => {
              if (!selectedClassId || !selectedSessionId) {
                addToast('warning', 'Please select a class and session.');
                return;
              }
              setStep(2);
            }}
            style={primaryBtn}
          >
            Next &rarr; Upload CSV
          </button>
        </div>
      )}

      {/* ─────────── STEP 2: Upload CSV ─────────── */}
      {step === 2 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            Step 2: Upload CSV File
          </h3>

          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '10px', fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
            CSV must have columns: <strong>student_name, admission_no, subject, total_score</strong><br />
            Students not found in the class will be <strong>automatically created</strong>.
          </div>

          {/* File Upload */}
          <div style={{
            border: '2px dashed #d1d5db', borderRadius: '12px', padding: '24px',
            textAlign: 'center', marginBottom: '16px', transition: 'border-color 0.2s',
          }}>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} style={secondaryBtn}>
              Choose CSV File
            </button>
            {csvFileName && (
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
                {csvFileName}
              </p>
            )}
          </div>

          {/* Or paste CSV */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', color: '#333', fontSize: '13px' }}>
              Or paste CSV content:
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="student_name, admission_no, subject, total_score&#10;John Doe, ADM001, Mathematics, 85"
              rows={5}
              style={textareaStyle}
            />
            <button onClick={handlePaste} style={{ marginTop: '8px', ...smallBtn }}>
              Parse Pasted CSV
            </button>
          </div>

          {csvError && (
            <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', color: '#dc2626' }}>
              {csvError}
            </div>
          )}

          {csvRows.length > 0 && (
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
              Parsed {csvRows.length} rows successfully
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setStep(1)} style={secondaryBtn}>&larr; Back</button>
            <button onClick={goToPreview} style={primaryBtn}>Next &rarr; Preview</button>
          </div>
        </div>
      )}

      {/* ─────────── STEP 3: Preview ─────────── */}
      {step === 3 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            Step 3: Preview Data
          </h3>

          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '10px', fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
            <strong>Import Summary:</strong><br />
            Class: {selectedClassTitle} | Session: {selectedSessionLabel} | Term: {parseInt(selectedTerm) === 1 ? 'First' : parseInt(selectedTerm) === 2 ? 'Second' : 'Third'}<br />
            Total rows: {csvRows.length} | Showing first {previewRows.length} rows
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Student Name</th>
                  <th style={thStyle}>Admission No</th>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>Score</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{row.student_name || row.name || '-'}</td>
                    <td style={tdStyle}>{row.admission_no || '-'}</td>
                    <td style={tdStyle}>{row.subject || '-'}</td>
                    <td style={tdStyle}>{row.total_score || row.total || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setStep(2)} style={secondaryBtn}>&larr; Back</button>
            <button onClick={runImport} style={{ ...primaryBtn, backgroundColor: '#16a34a' }}>
              Start Import ({csvRows.length} rows)
            </button>
          </div>
        </div>
      )}

      {/* ─────────── STEP 4: Results ─────────── */}
      {step === 4 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            Step 4: Import Results
          </h3>

          {importing ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '48px', height: '48px', border: '4px solid #e5e7eb',
                borderTopColor: '#4f46e5', borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto 16px',
              }} />
              <p style={{ fontSize: '16px', color: '#4f46e5', fontWeight: '600' }}>Importing scores...</p>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                Processing {csvRows.length} rows and creating students as needed...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : importResult ? (
            <div>
              {/* Success / Error Banner */}
              <div style={{
                padding: '16px', borderRadius: '10px', marginBottom: '16px',
                backgroundColor: importResult.success ? '#f0fdf4' : '#fef2f2',
                border: importResult.success ? '1px solid #86efac' : '1px solid #fecaca',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '20px' }}>
                  {importResult.success ? '\u2705' : '\u274C'}
                </span>
                <p style={{ fontSize: '15px', fontWeight: '600', color: importResult.success ? '#16a34a' : '#dc2626', margin: 0 }}>
                  {importResult.message}
                </p>
              </div>

              {/* Stats */}
              {importResult.stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  {[
                    { label: 'Total Rows', value: importResult.stats.total ?? 0, bg: '#f3f4f6', color: '#374151' },
                    { label: 'Imported', value: importResult.stats.matched ?? 0, bg: '#f0fdf4', color: '#16a34a' },
                    { label: 'Students Created', value: importResult.stats.studentsCreated ?? 0, bg: '#eff6ff', color: '#2563eb' },
                    { label: 'Subjects Created', value: importResult.stats.subjectsCreated ?? 0, bg: '#faf5ff', color: '#7c3aed' },
                    { label: 'Exam Records', value: importResult.stats.examScoresSaved ?? 0, bg: '#fffbeb', color: '#d97706' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px 8px', backgroundColor: item.bg, borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{item.label}</div>
                    </div>
                  ))}
                  {(importResult.stats.failed ?? 0) > 0 && (
                    <div style={{ padding: '12px 8px', backgroundColor: '#fef2f2', borderRadius: '10px', textAlign: 'center', gridColumn: 'span 5' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>{importResult.stats.failed}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Failed</div>
                    </div>
                  )}
                </div>
              )}

              {/* Errors */}
              {(importResult.stats?.errors?.length ?? 0) > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
                    Errors ({importResult.stats?.errors?.length ?? 0}):
                  </h4>
                  <div style={{
                    maxHeight: '200px', overflowY: 'auto',
                    backgroundColor: '#fef2f2', borderRadius: '8px',
                    padding: '12px', fontSize: '12px', fontFamily: 'monospace',
                  }}>
                    {(importResult.stats?.errors || []).map((err: string, i: number) => (
                      <p key={i} style={{ marginBottom: '4px', color: '#991b1b' }}>{err}</p>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={resetWizard} style={primaryBtn}>
                Import Another File
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Reusable Styles ──
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
  borderRadius: '8px', fontSize: '14px', color: 'black', backgroundColor: 'white',
};

const primaryBtn: React.CSSProperties = {
  padding: '10px 24px', backgroundColor: '#4f46e5', color: 'white',
  border: 'none', borderRadius: '8px', cursor: 'pointer',
  fontWeight: '600', fontSize: '14px', transition: 'all 0.15s',
};

const secondaryBtn: React.CSSProperties = {
  padding: '10px 24px', backgroundColor: '#e5e7eb', color: '#374151',
  border: 'none', borderRadius: '8px', cursor: 'pointer',
  fontSize: '14px', transition: 'all 0.15s',
};

const smallBtn: React.CSSProperties = {
  padding: '6px 12px', backgroundColor: '#e5e7eb', border: 'none',
  borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '10px', border: '1px solid #d1d5db',
  borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace',
  boxSizing: 'border-box', resize: 'vertical',
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', fontWeight: '600',
  fontSize: '12px', color: '#374151', borderBottom: '2px solid #d1d5db',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#111827',
};
