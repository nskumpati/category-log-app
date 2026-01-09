import { useState, useEffect } from 'react';
import { Plus, FileText, Upload, X, CheckCircle, Loader2, Edit3, Save, Trash2, Folder, HardDrive, Calendar, LucideIcon } from 'lucide-react';
import './LogPage.css';
import './Modal.css';
import './Upload.css';
import './DocumentDetails.css';
import './ExtractedFields.css';
import './SchemaEditor.css';

// Type Definitions
interface Category {
  id: number;
  name: string;
  formatCount: number;
}

interface ExtractedField {
  key: string;
  value: string;
  description: string;
}

interface BasicInfo {
  fileName: string;
  fileSize: number;
  pageCount: number;
  categoryName: string;
  uploadedAt: string;
}

interface DocumentDetails {
  categoryId: number;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  categoryName: string;
  formatCount: number;
  pageCount: number | string;
  extractedFields: ExtractedField[];
  formats: string[];
  confidence: number;
  summary: string;
  isNewCategory: boolean;
}

interface UploadResponse {
  categoryId: number;
  fileName?: string;
  fileSize: number;
  categoryName?: string;
  pageCount?: number;
  extractedFields?: {
    key_values?: ExtractedField[];
  };
  formats?: string[];
  confidence?: number;
  message?: string;
  isNewCategory?: boolean;
  category?: {
    formatCount?: number;
  };
}

interface SaveFieldsResponse {
  categoryId?: number;
}

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}

function LogPage1() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  const [documentDetails, setDocumentDetails] = useState<DocumentDetails | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [showSchemaEditor, setShowSchemaEditor] = useState<boolean>(false);
  
  const [editedFields, setEditedFields] = useState<ExtractedField[]>([]);
  const [editedBasicInfo, setEditedBasicInfo] = useState<BasicInfo>({
    fileName: '',
    fileSize: 0,
    pageCount: 0,
    categoryName: '',
    uploadedAt: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (documentDetails?.extractedFields) {
      if (Array.isArray(documentDetails.extractedFields)) {
        setEditedFields(documentDetails.extractedFields);
      } else {
        setEditedFields([]);
      }
    } else {
      setEditedFields([]);
    }
    
    if (documentDetails) {
      setEditedBasicInfo({
        fileName: documentDetails.fileName || '',
        fileSize: documentDetails.fileSize || 0,
        pageCount: typeof documentDetails.pageCount === 'number' ? documentDetails.pageCount : 0,
        categoryName: documentDetails.categoryName || '',
        uploadedAt: documentDetails.uploadedAt || ''
      });
    }
  }, [documentDetails]);

  const fetchCategories = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/v1/categories');
      console.log("response")
      console.log(response)
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data: Category[] = await response.json();
      setCategories(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a PDF file');
      event.target.value = '';
    }
  };

  const processDocumentDetails = (uploadResponse: UploadResponse): void => {
    console.log("uploadResponse", uploadResponse);
    const category = uploadResponse.category || {};
    
    setDocumentDetails({
      categoryId: uploadResponse.categoryId,  
      fileName: uploadResponse.fileName || selectedFile?.name || '',
      fileSize: uploadResponse.fileSize,
      uploadedAt: new Date().toLocaleString(),
      categoryName: uploadResponse.categoryName || 'Unknown',
      formatCount: category.formatCount || 0,
      pageCount: uploadResponse.pageCount || 'N/A',
      extractedFields: uploadResponse?.extractedFields?.key_values || [],
      formats: uploadResponse.formats || [],
      confidence: uploadResponse.confidence || 0,
      summary: uploadResponse.message || 'Document processed successfully.',
      isNewCategory: uploadResponse.isNewCategory || false
    });
    
    setShowDetails(true);
    setShowSchemaEditor(false);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress for fetch (since fetch doesn't support upload progress natively)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('http://localhost:8080/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText || 'Unknown error'}`);
      }

      const data = await response.json();
      setUploadProgress(100);
      processDocumentDetails(data);
      fetchCategories();

    } catch (err) {
      console.error('Error uploading file:', err);
      alert(`Failed to upload document: ${err|| 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };


  const handleCloseUploadModal = (): void => {
    if (!isUploading) {
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadProgress(0);
      setDocumentDetails(null);
      setShowDetails(false);
      setShowSchemaEditor(false);
      setEditedFields([]);
    }
  };

  const removeSelectedFile = (): void => {
    setSelectedFile(null);
    setUploadProgress(0);
  };
  
  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024).toFixed(0);
  };

  const handleSaveFields = async (): Promise<void> => {
    try {
      if (!documentDetails) {
        alert('Document details not found.');
        return;
      }

      // Use category name if it's a new category, otherwise use ID
      const identifier = documentDetails.isNewCategory 
        ? editedBasicInfo.categoryName 
        : documentDetails.categoryId;
      
      if (!identifier) {
        alert('Category identifier not found. Cannot save fields.');
        return;
      }
      
      const url = `http://localhost:8080/v1/documents/${identifier}/fields`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extractedFields: editedFields,
          categoryName: editedBasicInfo.categoryName || '',
          categorySummary: documentDetails.summary || ''
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save fields');
      }
      
      const result: SaveFieldsResponse = await response.json();
      
      // Update documentDetails with the newly created category ID if it was created
      if (result.categoryId) {
        setDocumentDetails(prev => prev ? {
          ...prev,
          categoryId: result.categoryId!,
          categoryName: editedBasicInfo.categoryName,
          extractedFields: editedFields,
          isNewCategory: false
        } : null);
      }
      
      setShowSchemaEditor(false);
      alert('Schema finalized successfully!');
      
      // Refresh categories list
      fetchCategories();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error saving fields:', error);
      alert(`Failed to save fields: ${errorMessage}`);
    }
  };

  const handleCancelEdit = (): void => {
    if (!documentDetails) return;

    setEditedFields(documentDetails.extractedFields);
    setEditedBasicInfo({
      fileName: documentDetails.fileName || '',
      fileSize: documentDetails.fileSize || 0,
      pageCount: typeof documentDetails.pageCount === 'number' ? documentDetails.pageCount : 0,
      categoryName: documentDetails.categoryName || '',
      uploadedAt: documentDetails.uploadedAt || ''
    });
    setShowSchemaEditor(false);
  };

  const formatFieldKey = (key: string): string => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleFieldChange = (index: number, field: keyof ExtractedField, value: string): void => {
    const newFields = [...editedFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setEditedFields(newFields);
  };

  const handleBasicInfoChange = (field: keyof BasicInfo, value: string | number): void => {
    setEditedBasicInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRemoveField = (index: number): void => {
    setEditedFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNewField = (): void => {
    setEditedFields(prev => [...prev, { key: '', value: '', description: '' }]);
  };

  // Info Row Component
  const InfoRow: React.FC<InfoRowProps> = ({ icon: Icon, label, value, color, delay }) => (
    <div className="info-row" style={{ animationDelay: `${delay}s` }}>
      <div className="info-row-left">
        <Icon size={20} color={color} />
        <span className="info-label">{label}:</span>
      </div>
      <span className="info-value">{value}</span>
    </div>
  );

  return (
    <div className="log-page-container">
      <div className="log-page-wrapper">
        {/* Header */}
        <div className="log-page-header">
          <h1 className="log-page-title">CATEGORY LOG</h1>
          <div className="title-underline" />
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="loading-state">
            <Loader2 size={48} className="loading-spinner spinner" />
            <p className="loading-text">Loading categories...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p className="empty-state-title">Error: {error}</p>
            <button onClick={fetchCategories} className="add-category-button">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Categories Grid */}
            {categories.length === 0 ? (
              <div className="empty-state">
                <FileText size={64} className="empty-state-icon" />
                <p className="empty-state-title">No categories yet</p>
                <p className="empty-state-subtitle">Click "Add New Category" to upload a document</p>
              </div>
            ) : (
              <div className="categories-grid">
                {categories.map((category, index) => (
                  <div 
                    key={category.id} 
                    className="category-card animate-slideUp"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="category-card-header">
                      <div className="category-icon-box">
                        <FileText size={28} color="white" />
                      </div>
                      <div className="category-format-badge">
                        {category.formatCount} {category.formatCount === 1 ? 'Format' : 'Formats'}
                      </div>
                    </div>
                    <h3 className="category-name">{category.name}</h3>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="log-page-footer">
              <div className="category-count-badge">
                Total Categories: {categories.length}
              </div>
              <button 
                onClick={() => setShowUploadModal(true)} 
                className="add-category-button"
              >
                <Plus size={20} />
                Add New Category
              </button>
            </div>
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className={`modal-container ${showSchemaEditor && showDetails ? 'expanded' : 'normal'}`}>
            {/* Gradient Bar */}
            <div className="modal-gradient-bar" />
            
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-title-section">
                  <h2 className="modal-title">
                    {!showDetails ? 'Upload PDF Document' : showSchemaEditor ? 'Edit & Finalize Schema' : 'Document Details'}
                  </h2>
                  <div className="modal-title-underline" />
                </div>
                <button
                  onClick={handleCloseUploadModal}
                  disabled={isUploading}
                  className="modal-close-button"
                >
                  <X size={24} color="#718096" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="modal-content">
              {!showDetails ? (
                <>
                  {/* Upload Section */}
                  <p className="modal-description">
                    Upload a PDF document to create a new category
                  </p>

                  {!selectedFile ? (
                    <>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="upload-area">
                        <Upload size={64} color="#667eea" className="upload-icon" />
                        <p className="upload-title">Click to upload PDF</p>
                        <p className="upload-subtitle">PDF files only, up to 50MB</p>
                      </label>
                    </>
                  ) : (
                    <div className="selected-file-container">
                      <div className={`selected-file-info ${isUploading ? '' : 'no-margin'}`}>
                        <div className="selected-file-icon-box">
                          <FileText size={28} color="white" />
                        </div>
                        <div className="selected-file-details">
                          <p className="selected-file-name">{selectedFile.name}</p>
                          <p className="selected-file-size">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        {!isUploading && (
                          <button
                            onClick={removeSelectedFile}
                            className="remove-file-button"
                          >
                            <X size={20} color="#c53030" />
                          </button>
                        )}
                      </div>

                      {isUploading && (
                        <div className="upload-progress">
                          <div className="progress-bar-container">
                            <div 
                              className="progress-bar-fill" 
                              style={{ width: `${uploadProgress}%` }} 
                            />
                          </div>
                          <div className="progress-info">
                            <Loader2 size={16} className="spinner" color="#667eea" />
                            <p className="progress-text">
                              {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload Actions */}
                  <div className="upload-actions">
                    <button 
                      onClick={handleCloseUploadModal} 
                      disabled={isUploading}
                      className="upload-button-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFileUpload}
                      disabled={!selectedFile || isUploading}
                      className={`upload-button-submit ${(!selectedFile || isUploading) ? 'disabled' : 'active'}`}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={20} className="spinner" />
                          Processing...
                        </>
                      ) : (
                        'Upload Document'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Document Details Section */}
                  <div className="success-banner">
                    <div className="success-icon-box">
                      <CheckCircle size={32} color="white" />
                    </div>
                    <div className="success-content">
                      <p className="success-title">Your document has been processed successfully</p>
                    </div>
                  </div>

                  {/* Basic Information - Only show when NOT in schema editor */}
                  {!showSchemaEditor && (
                    <div className="basic-info-section">
                      <div className="section-header">
                        <div className="section-indicator" />
                        <h3 className="section-title">Basic Information</h3>
                      </div>
                      <div className="info-rows">
                        <InfoRow 
                          icon={FileText} 
                          label="File Name" 
                          value={documentDetails?.fileName || ''} 
                          color="#667eea" 
                          delay={0.3} 
                        />
                        <InfoRow 
                          icon={HardDrive} 
                          label="File Size" 
                          value={`${formatFileSize(documentDetails?.fileSize || 0)} KB`} 
                          color="#764ba2" 
                          delay={0.35} 
                        />
                        <InfoRow 
                          icon={FileText} 
                          label="File Pages" 
                          value={documentDetails?.pageCount || 0} 
                          color="#f093fb" 
                          delay={0.4} 
                        />
                        <InfoRow 
                          icon={Folder} 
                          label="Category" 
                          value={documentDetails?.categoryName || ''} 
                          color="#f59e0b" 
                          delay={0.45} 
                        />
                        <InfoRow 
                          icon={Calendar} 
                          label="Uploaded At" 
                          value={documentDetails?.uploadedAt || ''} 
                          color="#ec4899" 
                          delay={0.5} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Edit & Finalize Schema Button or Schema Editor */}
                  {!showSchemaEditor ? (
                    <button 
                      onClick={() => setShowSchemaEditor(true)} 
                      className="btn-edit-finalize"
                    >
                      <Edit3 size={20} />
                      Edit & Finalize Schema
                    </button>
                  ) : (
                    <div className="schema-editor-section">
                      {/* Action Buttons at Top */}
                      <div className="fields-header">
                        <div className="fields-header-content">
                          <h3 className="section-title">Edit Schema</h3>
                          <p>Review and edit all information and fields before finalizing</p>
                        </div>
                        
                        <div className="fields-actions">
                          <button onClick={handleSaveFields} className="btn-save">
                            <Save size={16} />
                            Finalize Schema
                          </button>
                          <button onClick={handleCancelEdit} className="btn-cancel-edit">
                            <X size={16} />
                            Cancel
                          </button>
                        </div>
                      </div>

                      {/* Editable Basic Information */}
                      <div className="basic-info-edit-section">
                        <h4>Basic Information</h4>
                        <div className="basic-info-rows">
                          {/* File Name */}
                          <div className="basic-info-row">
                            <div className="basic-info-label">
                              <FileText size={18} color="#667eea" />
                              File Name
                            </div>
                            <input
                              type="text"
                              value={editedBasicInfo.fileName}
                              onChange={(e) => handleBasicInfoChange('fileName', e.target.value)}
                              className="basic-info-input"
                            />
                          </div>
                          
                          {/* File Size and File Pages Row */}
                          <div className="basic-info-row-split">
                            <div className="basic-info-row-half">
                              <div className="basic-info-label-small">
                                <HardDrive size={18} color="#764ba2" />
                                File Size (KB)
                              </div>
                              <input
                                type="number"
                                value={formatFileSize(editedBasicInfo.fileSize)}
                                readOnly
                                disabled
                                className="basic-info-input"
                                style={{ cursor: 'not-allowed', opacity: 0.7 }}
                              />
                            </div>
                            
                            <div className="basic-info-row-half">
                              <div className="basic-info-label-xs">
                                <FileText size={18} color="#f093fb" />
                                File Pages
                              </div>
                              <input
                                type="number"
                                value={editedBasicInfo.pageCount}
                                readOnly
                                disabled
                                className="basic-info-input"
                                style={{ cursor: 'not-allowed', opacity: 0.7 }}
                              />
                            </div>
                          </div>
                          
                          {/* Category */}
                          <div className="basic-info-row">
                            <div className="basic-info-label">
                              <Folder size={18} color="#f59e0b" />
                              Category
                            </div>
                            <input
                              type="text"
                              value={editedBasicInfo.categoryName}
                              onChange={(e) => handleBasicInfoChange('categoryName', e.target.value)}
                              className="basic-info-input"
                            />
                          </div>
                          
                          {/* Uploaded At */}
                          <div className="basic-info-row" style={{ borderBottom: 'none' }}>
                            <div className="basic-info-label">
                              <Calendar size={18} color="#ec4899" />
                              Uploaded At
                            </div>
                            <input
                              type="text"
                              value={editedBasicInfo.uploadedAt}
                              onChange={(e) => handleBasicInfoChange('uploadedAt', e.target.value)}
                              className="basic-info-input"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Schema Fields Section Header */}
                      <h4 className="extracted-fields-header">
                        Extracted Fields ({editedFields.length})
                      </h4>

                      {/* Schema Fields */}
                      {documentDetails?.extractedFields && editedFields.length > 0 ? (
                        <div className="fields-list">
                          {editedFields.map((field, index) => (
                            <div key={index} className="field-card">
                              <div className="field-edit">
                                <div className="field-inputs">
                                  <input
                                    type="text"
                                    value={field.key}
                                    onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                                    placeholder="e.g., project_name"
                                    className="field-input"
                                  />
                                  <input
                                    type="text"
                                    value={field.value}
                                    onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                                    placeholder="Enter value"
                                    className="field-input"
                                  />
                                  <textarea
                                    value={field.description}
                                    onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                                    placeholder="Enter description"
                                    className="field-textarea"
                                    rows={2}
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveField(index)}
                                className="btn-remove-field"
                              >
                                <Trash2 size={18} color="#c53030" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-fields-state">
                          <FileText size={48} color="#cbd5e0" className="no-fields-icon" />
                          <p className="no-fields-title">No fields extracted</p>
                          <p className="no-fields-subtitle">Click "Add Field" to create your first field</p>
                          <button onClick={handleAddNewField} className="btn-add-first-field">
                            <Plus size={18} />
                            Add First Field
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Done Button - Only show when not in schema editor */}
                  {!showSchemaEditor && (
                    <button onClick={handleCloseUploadModal} className="done-button">
                      Done
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogPage1;