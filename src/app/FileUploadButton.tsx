import React from 'react';

interface FileUploadButtonProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({ onFileChange }) => {
  return (
    <div className="flex justify-center items-center">
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 active:bg-purple-800 transition-colors duration-300 ease-in-out">
          Upload File
        </div>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={onFileChange}
        />
      </label>
    </div>
  );
};

export default FileUploadButton;