export default function PteGrammarNoteChip({ note, translate = (value) => value }) {
  if (!note) return null

  return (
    <span className="pte-di-grammar-note" tabIndex={0}>
      <span className="pte-di-grammar__chip">
        {note.before || '∅'} → {note.after || '∅'}
      </span>
      <span className="pte-di-grammar-note__tooltip" role="tooltip">
        <span className="pte-di-grammar-note__badge">{translate(note.category || 'Grammar')}</span>
        <span className="pte-di-grammar-note__row">
          <strong>{translate('Before')}:</strong> {note.before || '∅'}
        </span>
        <span className="pte-di-grammar-note__row">
          <strong>{translate('After')}:</strong> {note.after || '∅'}
        </span>
        <span className="pte-di-grammar-note__row">
          <strong>{translate('Why')}:</strong> {translate(note.reason || '')}
        </span>
        {note.tip && (
          <span className="pte-di-grammar-note__row">
            <strong>{translate('Exam tip')}:</strong> {translate(note.tip)}
          </span>
        )}
      </span>
    </span>
  )
}
