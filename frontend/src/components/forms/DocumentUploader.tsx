import * as React from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, X, FileText, ImageIcon } from 'lucide-react';
import { cn, fileSize } from '@/lib/utils';

export interface UploadedFileMeta {
  file: File;
  preview?: string;
  documentTypeId?: string | null;
}

export interface DocumentUploaderProps {
  label?: string;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  maxSizeMb?: number;
  value: UploadedFileMeta[];
  onChange: (files: UploadedFileMeta[]) => void;
  error?: string;
  documentTypeId?: string | null;
  compact?: boolean;
}

export function DocumentUploader({
  label = 'Adjuntar documentos',
  accept = { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
  multiple = true,
  maxSizeMb = 10,
  value,
  onChange,
  error,
  documentTypeId = null,
  compact = false,
}: DocumentUploaderProps) {
  const onDrop = React.useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) {
        console.warn('Archivos rechazados:', rejected);
      }
      const newFiles = accepted.map((file) => {
        const meta: UploadedFileMeta = { file, documentTypeId };
        if (file.type.startsWith('image/')) {
          meta.preview = URL.createObjectURL(file);
        }
        return meta;
      });
      onChange(multiple ? [...value, ...newFiles] : newFiles);
    },
    [value, multiple, onChange],
  );

  React.useEffect(() => {
    return () => {
      value.forEach((v) => v.preview && URL.revokeObjectURL(v.preview));
    };
  }, [value]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize: maxSizeMb * 1024 * 1024,
  });

  function remove(idx: number) {
    const next = value.slice();
    const [removed] = next.splice(idx, 1);
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    onChange(next);
  }

  return (
    <div>
      {label && <label className="label-base">{label}</label>}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors',
          compact ? 'p-2' : 'p-6',
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          error && 'border-destructive',
        )}
      >
        <input {...getInputProps()} />
        {compact ? (
          <p className="text-xs text-muted-foreground">
            {isDragActive ? 'Suelte los archivos aquí' : 'Arrastre o haga clic para adjuntar'}
          </p>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? 'Suelte los archivos aquí'
                : 'Arrastre archivos o haga clic para seleccionarlos'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WebP. Máximo {maxSizeMb} MB.</p>
          </>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}

      {value.length > 0 && (
        <ul className="mt-3 space-y-2">
          {value.map((meta, idx) => {
            const isImage = meta.file.type.startsWith('image/');
            return (
              <li
                key={`${meta.file.name}-${idx}`}
                className="flex items-center gap-3 p-2 border border-border rounded-md bg-white"
              >
                {isImage && meta.preview ? (
                  <img src={meta.preview} alt="" className="h-10 w-10 object-cover rounded" />
                ) : isImage ? (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <FileText className="h-6 w-6 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{meta.file.name}</p>
                  <p className="text-xs text-muted-foreground">{fileSize(meta.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
