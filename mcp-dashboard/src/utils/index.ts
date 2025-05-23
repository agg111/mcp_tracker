import { LogLevel, LogDetails } from '../types';

export const copyToClipboard = (text: string): void => {
  navigator.clipboard.writeText(text);
};

export const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString();
};

export const formatDuration = (duration: number): string => {
  return `${duration.toFixed(2)}ms`;
};

export const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>): void => {
  ref.current?.scrollIntoView({ behavior: "smooth" });
};

export const generateId = (): number => {
  return Date.now() + Math.random();
};

export const createLogEntry = (
  level: LogLevel, 
  message: string, 
  details: LogDetails = null
) => ({
  id: generateId(),
  timestamp: new Date().toISOString(),
  level,
  message,
  details
});

export const createRawMessage = (
  direction: 'sent' | 'received', 
  message: Record<string, any>
) => ({
  id: generateId(),
  timestamp: new Date().toISOString(),
  direction,
  message: JSON.stringify(message, null, 2)
});

export const trimValue = (value: any): any => {
  return typeof value === 'string' ? value.trim() : value;
};

export const filterEmptyArgs = (args: string[]): string[] => {
  return args.filter(arg => arg && arg.trim().length > 0);
};