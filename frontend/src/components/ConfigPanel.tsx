import React, { useRef, useState } from 'react';
import { Upload, X, Play, Loader2 } from 'lucide-react';

interface ConfigPanelProps {
  onSubmit: (formData: FormData) => void;
  submitting: boolean;
  defaultTimeTolerance?: number;
  defaultQtyTolerance?: number;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  onSubmit,
  submitting,
  defaultTimeTolerance = 300,
  defaultQtyTolerance = 0.01,
}) => {
  const [userCsv, setUserCsv] = useState<File | null>(null);
  const [exchangeCsv, setExchangeCsv] = useState<File | null>(null);
  const [timeTolerance, setTimeTolerance] = useState<number>(defaultTimeTolerance);
  const [qtyTolerance, setQtyTolerance] = useState<number>(defaultQtyTolerance);

  const userFileInputRef = useRef<HTMLInputElement>(null);
  const exchangeFileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    if (userCsv) formData.append('userCsv', userCsv);
    if (exchangeCsv) formData.append('exchangeCsv', exchangeCsv);
    formData.append('timestampTolerance', timeTolerance.toString());
    formData.append('quantityTolerancePct', qtyTolerance.toString());
    onSubmit(formData);

    // Clear selections
    setUserCsv(null);
    setExchangeCsv(null);
  };

  const handleRemoveUserFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserCsv(null);
    if (userFileInputRef.current) userFileInputRef.current.value = '';
  };

  const handleRemoveExchangeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExchangeCsv(null);
    if (exchangeFileInputRef.current) exchangeFileInputRef.current.value = '';
  };

  return (
    <section className="panel-section config-section">
      <h2>Configure & Trigger Run</h2>
      <form onSubmit={handleSubmit} className="reconcile-form">
        <div className="form-grid">
          {/* User CSV File Dropzone */}
          <div className="form-group file-input-group">
            <label>User Transactions CSV</label>
            <div
              className={`file-dropzone ${userCsv ? 'has-file' : ''}`}
              onClick={() => userFileInputRef.current?.click()}
            >
              {userCsv ? (
                <>
                  <Upload size={24} style={{ color: 'var(--color-success)' }} />
                  <span className="selected-filename">{userCsv.name}</span>
                  <button type="button" className="btn-file-reset" onClick={handleRemoveUserFile} title="Remove file">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <Upload size={24} />
                  <span>Upload user CSV (Optional)</span>
                  <p className="file-hint">Or leaves empty to use pre-loaded file</p>
                </>
              )}
              <input
                type="file"
                ref={userFileInputRef}
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setUserCsv(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Exchange CSV File Dropzone */}
          <div className="form-group file-input-group">
            <label>Exchange Transactions CSV</label>
            <div
              className={`file-dropzone ${exchangeCsv ? 'has-file' : ''}`}
              onClick={() => exchangeFileInputRef.current?.click()}
            >
              {exchangeCsv ? (
                <>
                  <Upload size={24} style={{ color: 'var(--color-success)' }} />
                  <span className="selected-filename">{exchangeCsv.name}</span>
                  <button type="button" className="btn-file-reset" onClick={handleRemoveExchangeFile} title="Remove file">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <Upload size={24} />
                  <span>Upload exchange CSV (Optional)</span>
                  <p className="file-hint">Or leaves empty to use pre-loaded file</p>
                </>
              )}
              <input
                type="file"
                ref={exchangeFileInputRef}
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setExchangeCsv(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Time Tolerance Range Slider */}
          <div className="form-group tolerance-input">
            <div className="label-with-value">
              <label htmlFor="timestampTolerance">Time Tolerance (Seconds)</label>
              <span className="badge">{timeTolerance}s</span>
            </div>
            <input
              type="range"
              id="timestampTolerance"
              min="60"
              max="3600"
              step="60"
              value={timeTolerance}
              onChange={(e) => setTimeTolerance(parseInt(e.target.value))}
            />
            <div className="slider-labels">
              <span>1m</span>
              <span>15m</span>
              <span>30m</span>
              <span>1h</span>
            </div>
          </div>

          {/* Quantity Tolerance Range Slider */}
          <div className="form-group tolerance-input">
            <div className="label-with-value">
              <label htmlFor="quantityTolerancePct">Quantity Tolerance (%)</label>
              <span className="badge">{qtyTolerance.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              id="quantityTolerancePct"
              min="0.00"
              max="5.00"
              step="0.01"
              value={qtyTolerance}
              onChange={(e) => setQtyTolerance(parseFloat(e.target.value))}
            />
            <div className="slider-labels">
              <span>0%</span>
              <span>1%</span>
              <span>2.5%</span>
              <span>5%</span>
            </div>
          </div>
        </div>

        <div className="form-submit">
          <button type="submit" className="btn primary-btn" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} className="spinning" />
                Queueing Reconciliation Job...
              </>
            ) : (
              <>
                <Play size={18} />
                Run Reconciliation Process
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
