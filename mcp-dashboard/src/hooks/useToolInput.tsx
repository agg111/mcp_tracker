import React from 'react';
import { trimValue } from '../utils';

interface UseToolInputProps {
  toolInputs: Record<string, any>;
  setToolInputs: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export const useToolInput = ({ toolInputs, setToolInputs }: UseToolInputProps) => {
  const updateValue = (property: string, newValue: any) => {
    const trimmedValue = trimValue(newValue);
    setToolInputs(prev => ({ ...prev, [property]: trimmedValue }));
  };

  const handleStringChange = (property: string, newValue: string) => {
    setToolInputs(prev => ({ ...prev, [property]: newValue }));
  };

  const handleStringBlur = (property: string, e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const trimmedValue = e.target.value.trim();
    if (trimmedValue !== e.target.value) {
      setToolInputs(prev => ({ ...prev, [property]: trimmedValue }));
    }
  };

  const renderToolInput = (property: string, schema: { type: string; description?: string; enum?: string[] }) => {
    const value = toolInputs[property] || '';
    
    if (schema.enum) {
      return (
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => updateValue(property, e.target.value)}
        >
          <option value="">Select {property}</option>
          {schema.enum.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }
  
    if (schema.type === 'number') {
      return (
        <input
          type="number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          placeholder={schema.description}
          onChange={(e) => updateValue(property, parseFloat(e.target.value) || 0)}
        />
      );
    }
  
    if (schema.type === 'boolean') {
      return (
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value.toString()}
          onChange={(e) => updateValue(property, e.target.value === 'true')}
        >
          <option value="">Select {property}</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }
  
    return (
      <div className="space-y-2">
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[2.5rem] resize-y"
          value={value}
          placeholder={schema.description || `Enter ${property}...`}
          onChange={(e) => handleStringChange(property, e.target.value)}
          onBlur={(e) => handleStringBlur(property, e)}
          rows={1}
          style={{
            resize: 'vertical',
            minHeight: '2.5rem',
            maxHeight: '200px'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 200) + 'px';
          }}
        />
        
        {typeof value === 'string' && value !== value.trim() && (
          <div className="flex items-center space-x-2 text-xs text-yellow-600">
            <span>⚠️</span>
            <span>Trailing spaces will be trimmed when you finish editing</span>
          </div>
        )}
        
        {typeof value === 'string' && value.length > 50 && (
          <div className="text-xs text-gray-500 text-right">
            {value.length} characters
          </div>
        )}
      </div>
    );
  };

  return { renderToolInput };
};