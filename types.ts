
export interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content?: string;
  base64?: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  result?: ProcessingResult;
}

export interface ProcessingResult {
  title: string;
  content: string;
  summary: string;
  tags: string[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE'
}
