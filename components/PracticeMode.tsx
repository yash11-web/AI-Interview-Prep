import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import Spinner from './common/Spinner';
import { Mic, StopCircle, ChevronLeftIcon } from './common/Icons';
import ReactMarkdown from 'react-markdown';

interface PracticeModeProps {
  onBack: () => void;
}

const PracticeMode: React.FC<PracticeModeProps> = ({ onBack }) => {
    const [topic, setTopic] = useState('');
    const [question, setQuestion] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isListening, transcript, startListening, stopListening, setTranscript } = useSpeechRecognition();
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const getNewQuestion = async () => {
        if (!topic) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setQuestion('');
        setFeedback('');
        setTranscript('');

        try {
            const prompt = `Generate a single, common technical interview question about "${topic}". This can be a coding problem (provide a stub in Python), a system design question, or a conceptual question.`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setQuestion(response.text);
        } catch (err) {
            setError('Failed to generate a question. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const submitAnswer = async () => {
        if (!transcript) return;
        setIsLoading(true);
        setFeedback('');
        setError(null);
        stopListening();

        try {
            const prompt = `
                Question: "${question}"
                Candidate's Answer: "${transcript}"
                
                Provide constructive feedback on the candidate's answer. Be specific about what was good and what could be improved. Suggest a model answer for comparison. Structure your feedback in Markdown with headings for Clarity, Correctness, and Completeness, followed by a Model Answer. If it's a coding question, analyze the code for correctness, efficiency, and style.
            `;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            setFeedback(response.text);
        } catch (err) {
            setError('Failed to get feedback. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <div className="max-w-4xl mx-auto">
            <button onClick={onBack} className="flex items-center text-purple-400 hover:text-purple-300 mb-6 font-semibold">
                <ChevronLeftIcon />
                Back to Dashboard
            </button>
            <h2 className="text-3xl font-bold mb-4 text-purple-300">Prep Arena</h2>
            <p className="mb-6 text-gray-400">Tackle practice questions on any topic, from behavioral to coding challenges, and get instant, AI-powered feedback.</p>

            <div className="flex gap-4 mb-6">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., 'JavaScript Closures', 'SQL Joins', 'System Design'"
                    className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                    onClick={getNewQuestion}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-500 transition-colors"
                >
                    {isLoading && !question ? 'Getting...' : 'New Question'}
                </button>
            </div>
             {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
             
             {isLoading && !question && <Spinner text="Generating question..." />}

             {question && (
                 <div className="bg-gray-800 rounded-lg p-6 space-y-6">
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Question:</h3>
                        <div className="p-4 bg-gray-900 rounded-lg">
                           <div className="prose prose-invert max-w-none">
                               <ReactMarkdown>{question}</ReactMarkdown>
                           </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Your Answer:</h3>
                        <div className="p-4 bg-gray-700 rounded-lg">
                            <textarea
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                                placeholder="Type or paste your code/answer here, or use the microphone to speak."
                                className="w-full h-48 bg-gray-700 border-0 focus:outline-none font-mono text-sm"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <button onClick={isListening ? stopListening : startListening} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                    {isListening ? <StopCircle /> : <Mic />}
                                </button>
                                <button onClick={submitAnswer} disabled={isLoading || !transcript} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">
                                    {isLoading ? 'Getting Feedback...' : 'Submit Answer'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {isLoading && !feedback && <Spinner text="Analyzing your answer..." />}

                    {feedback && (
                        <div>
                            <h3 className="text-xl font-semibold mb-2">Feedback:</h3>
                            <div className="p-4 bg-gray-900 rounded-lg">
                                <div className="prose prose-invert max-w-none">
                                    <ReactMarkdown>{feedback}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
             )}
        </div>
    );
};

export default PracticeMode;