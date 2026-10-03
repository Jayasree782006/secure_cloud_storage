import React, { useRef, useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle, FileIcon } from 'lucide-react';
import '../styles/FileUpload.css';

export default function FileUpload({
  onFileSelect,
  maxSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = null,
  multiple = false
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (file.size > maxSize) {
      return `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`;
    }
    if (acceptedTypes && !acceptedTypes.includes(file.type)) {
      return `File type not accepted. Accepted: ${acceptedTypes.join(', ')}`;
    }
    return null;
  };

  const handleFiles = (files) => {
    setError('');
    const fileArray = Array.from(files);
    const validFiles = [];
    
    for (let file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      if (multiple) {
        setSelectedFiles([...selectedFiles, ...validFiles]);
        onFileSelect(validFiles);
      } else {
        setSelectedFiles([validFiles[0]]);
        onFileSelect(validFiles[0]);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes, k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          accept={acceptedTypes ? acceptedTypes.join(',') : undefined}
        />

        <div className="upload-content">
          <Upload className="upload-icon" size={48} />
          <h3>Drag files here or</h3>
          <button
            type="button"
            className="browse-button"
            onClick={handleBrowseClick}
          >
            Browse Files
          </button>
          <p className="upload-hint">
            Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="close-error">
            <X size={16} />
          </button>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>Selected Files ({selectedFiles.length})</h4>
          <div className="files-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <FileIcon size={20} />
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  className="remove-file"
                  onClick={() => removeFile(index)}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
