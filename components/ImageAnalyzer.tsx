
import React, { useState, useCallback } from 'react';
import { analyzeImage } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { ImageIcon } from './Icons';

// Make TypeScript aware of the 'marked' library loaded from the CDN
declare global {
    interface Window { marked: { parse: (md: string) => string; }; }
}

const ImageAnalyzer: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove "data:mime/type;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
  }

  const handleSubmit = useCallback(async () => {
    if (!prompt || !image) {
      setResult('Please provide an image and a prompt.');
      return;
    }
    setIsLoading(true);
    setResult('');
    try {
      const imageBase64 = await fileToBase64(image);
      const analysis = await analyzeImage(prompt, imageBase64, image.type);
      setResult(analysis);
    } catch (error) {
      console.error("Image analysis failed", error);
      setResult('An error occurred during image analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, image]);

  return (
    <div className="flex flex-col bg-slate-800/50 rounded-lg p-6 shadow-lg w-full">
      <h2 className="text-2xl font-bold text-white mb-4">Analyze an Image</h2>
      <p className="text-slate-400 mb-6">Upload an image and ask a question about it. For example, upload a photo of your room and ask "What can I do to make this space feel more calming?".</p>
      <div className="flex flex-col lg:flex-row gap-6 flex-grow">
        {/* Input Column */}
        <div className="lg:w-1/2 flex flex-col gap-4">
          <div className="flex-grow flex flex-col">
            <label htmlFor="image-upload" className="block text-sm font-medium text-slate-300 mb-2">Image</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="mx-auto h-48 w-auto object-contain rounded-md" />
                    ) : (
                        <>
                        <ImageIcon className="mx-auto h-12 w-12 text-slate-500" />
                        <div className="flex text-sm text-slate-500">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:ring-cyan-500">
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-600">PNG, JPG, GIF up to 10MB</p>
                        </>
                    )}
                </div>
            </div>
            {image && <button onClick={() => {setImage(null); setImagePreview(null)}} className="mt-2 text-sm text-red-400 hover:text-red-300">Remove image</button>}
          </div>
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-slate-300">Your Question</label>
            <textarea
              id="prompt"
              rows={3}
              className="mt-1 block w-full bg-slate-900/70 border-2 border-slate-700 rounded-lg p-2 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., What emotions does this image evoke?"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !prompt || !image}
            className="w-full px-4 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? <LoadingSpinner /> : 'Analyze'}
          </button>
        </div>
        
        {/* Result Column */}
        <div className="lg:w-1/2 flex flex-col bg-slate-900/70 rounded-lg min-h-[250px] lg:min-h-0">
          <h3 className="text-lg font-semibold text-white p-4 border-b border-slate-700 shrink-0">Analysis</h3>
          <div className="flex-grow p-4">
            {isLoading && !result && <div className="flex justify-center items-center h-full"><LoadingSpinner className="w-10 h-10" /></div>}
            {result ? (
                <div className="prose-styles" dangerouslySetInnerHTML={{ __html: window.marked.parse(result) }} />
            ) : !isLoading && (
                <p className="text-slate-500">Your analysis will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyzer;