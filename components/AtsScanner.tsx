import React, { useState, useCallback } from 'react';
import { scanAts } from '../services/geminiService';
import { AtsScanResult } from '../types';
import Spinner from './common/Spinner';
import { Upload, ChevronLeftIcon } from './common/Icons';
import { useDropzone } from 'react-dropzone';
import { readFileAsText } from '../utils/fileReader';

interface AtsScannerProps {
  onBack: () => void;
}

const AtsScanner: React.FC<AtsScannerProps> = ({ onBack }) => {
    const [resume, setResume] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [result, setResult] = useState<AtsScanResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            try {
                const text = await readFileAsText(file);
                setResume(text);
            } catch (e) {
                setError("Error reading file. Please try again.");
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/plain': ['.txt'],
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        },
        maxFiles: 1,
    });

    const handleScan = async () => {
        if (!resume) {
            setError('Please provide a resume to analyze.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const scanResult = await scanAts(resume, jobDescription);
            setResult(scanResult);
        } catch (err) {
            setError('Failed to scan. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const renderResult = () => {
        if (!result) return null;

        // Render ATS Match Result view
        if (result.score !== undefined) {
            const scoreColor = result.score >= 80 ? 'text-green-400' : result.score >= 60 ? 'text-yellow-400' : 'text-red-400';
            return (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">ATS Scan Result</h3>
                        <div className="p-4 bg-gray-700 rounded-lg flex justify-around items-center">
                            <div>
                                <p className="text-sm text-gray-400">Match Score</p>
                                <p className={`text-4xl font-bold ${scoreColor}`}>{result.score}/100</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Match Rate</p>
                                <p className="text-2xl font-semibold">{result.matchRate}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg mb-2">Summary</h4>
                        <p className="p-4 bg-gray-700 rounded-lg">{result.summary}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg mb-2">Suggestions for Improvement</h4>
                        <p className="p-4 bg-gray-700 rounded-lg whitespace-pre-wrap">{result.suggestions}</p>
                    </div>
                    {result.keywords && <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold text-lg mb-2 text-green-400">Keywords Found</h4>
                            <ul className="p-4 bg-gray-700 rounded-lg list-disc list-inside">
                                {result.keywords.found.map((kw, i) => <li key={i}>{kw}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg mb-2 text-red-400">Keywords Missing</h4>
                            <ul className="p-4 bg-gray-700 rounded-lg list-disc list-inside">
                                {result.keywords.missing.map((kw, i) => <li key={i}>{kw}</li>)}
                            </ul>
                        </div>
                    </div>}
                </div>
            );
        }

        // Render General Resume Review view
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-2xl font-bold mb-2">General Resume Review</h3>
                </div>
                 <div>
                    <h4 className="font-semibold text-lg mb-2">Summary</h4>
                    <p className="p-4 bg-gray-700 rounded-lg">{result.summary}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                     <div>
                        <h4 className="font-semibold text-lg mb-2 text-green-400">Strengths</h4>
                        <p className="p-4 bg-gray-700 rounded-lg whitespace-pre-wrap">{result.strengths}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-lg mb-2 text-red-400">Areas for Improvement</h4>
                        <p className="p-4 bg-gray-700 rounded-lg whitespace-pre-wrap">{result.weaknesses}</p>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-lg mb-2">Actionable Suggestions</h4>
                    <p className="p-4 bg-gray-700 rounded-lg whitespace-pre-wrap">{result.suggestions}</p>
                </div>
            </div>
        )
    };

    return (
        <div className="max-w-6xl mx-auto">
            <button onClick={onBack} className="flex items-center text-purple-400 hover:text-purple-300 mb-6 font-semibold">
                <ChevronLeftIcon />
                Back to Dashboard
            </button>
            <h2 className="text-3xl font-bold mb-4 text-purple-300">ATS Scanner & Resume Review</h2>
            <p className="mb-6 text-gray-400">Analyze your resume against a job description for a match score, or leave the JD blank for a general review.</p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                     <label className="block mb-2 text-sm font-medium text-gray-300">Your Resume</label>
                    <div {...getRootProps()} className={`p-4 border-2 border-dashed rounded-lg cursor-pointer h-60 flex flex-col items-center justify-center text-center ${isDragActive ? 'border-purple-400 bg-gray-700' : 'border-gray-600 hover:border-purple-400'}`}>
                        <input {...getInputProps()} />
                        <Upload />
                        <p className="mt-2 text-sm text-gray-400">
                          {isDragActive ? "Drop the file here..." : "Drag 'n' drop your resume here, or click to select a file (.pdf, .docx, .txt)"}
                        </p>
                    </div>
                    <textarea
                        value={resume}
                        onChange={(e) => setResume(e.target.value)}
                        placeholder="...or paste your resume text here."
                        className="mt-2 w-full h-48 bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">Job Description (Optional)</label>
                    <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the job description here for a detailed match analysis."
                        className="w-full h-full min-h-[400px] bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            <div className="text-center">
                <button
                    onClick={handleScan}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg disabled:bg-gray-500 transition-colors text-lg"
                >
                    {isLoading ? 'Analyzing...' : 'Analyze Resume'}
                </button>
            </div>

            {error && <p className="text-red-400 my-4 text-center">{error}</p>}
            
            <div className="mt-8">
                {isLoading ? <Spinner text="Analyzing your documents..." /> : renderResult()}
            </div>
        </div>
    );
};

export default AtsScanner;