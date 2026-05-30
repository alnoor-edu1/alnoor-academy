import { useState } from "react";

export default function GradesModal({ subject, students, onClose, onSave }) {
  const [grades, setGrades] = useState(() => {
    const initial = {};
    students.forEach(s => {
      initial[s.id] = s.grades?.[subject.id] || { exam1: '', exam2: '', final: '' };
    });
    return initial;
  });

  const handleChange = (studentId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  const handleSave = () => {
    onSave(subject.id, grades);
    onClose();
  };

  return (
    <div className="grades-modal-overlay" onClick={onClose}>
      <div className="grades-modal" onClick={e => e.stopPropagation()}>
        <div className="grades-header">
          <h3>📝 إدارة درجات - {subject.name}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        
        <div className="grades-table-wrapper">
          <table className="grades-table">
            <thead>
              <tr>
                <th>الطالب</th>
                <th>امتحان أول</th>
                <th>امتحان ثاني</th>
                <th>نهائي</th>
                <th>المجموع</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const g = grades[s.id] || {};
                const total = (Number(g.exam1) || 0) + (Number(g.exam2) || 0) + (Number(g.final) || 0);
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td><input type="number" className="grade-input" value={g.exam1 || ''} onChange={e => handleChange(s.id, 'exam1', e.target.value)} /></td>
                    <td><input type="number" className="grade-input" value={g.exam2 || ''} onChange={e => handleChange(s.id, 'exam2', e.target.value)} /></td>
                    <td><input type="number" className="grade-input" value={g.final || ''} onChange={e => handleChange(s.id, 'final', e.target.value)} /></td>
                    <td className="grade-total">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="grades-footer">
          <button className="btn bp" onClick={handleSave}>💾 حفظ الدرجات</button>
          <button className="btn bgh" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}