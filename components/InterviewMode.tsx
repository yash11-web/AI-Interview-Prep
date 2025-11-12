import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { InterviewTurn, InterviewReport } from '../types';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import Spinner from './common/Spinner';
import { Mic, StopCircle, Speaker, ChevronLeftIcon, Upload, CheckCircle, AlertTriangle } from './common/Icons';
import { useDropzone } from 'react-dropzone';
import { readFileAsText } from '../utils/fileReader';
import { generateInterviewReport } from '../services/geminiService';


interface InterviewModeProps {
  onBack: () => void;
}

type InterviewType = 'Technical' | 'Behavioral' | 'Mixed';
type InterviewDuration = 5 | 15 | 30;
type InterviewState = 'setup' | 'running' | 'generatingReport' | 'finished';

const InterviewMode: React.FC<InterviewModeProps> = ({ onBack }) => {
    const [roleContext, setRoleContext] = useState('');
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [interviewType, setInterviewType] = useState<InterviewType>('Mixed');
    const [interviewDuration, setInterviewDuration] = useState<InterviewDuration>(15);
    const [interviewState, setInterviewState] = useState<InterviewState>('setup');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<InterviewTurn[]>([]);
    const [report, setReport] = useState<InterviewReport | null>(null);

    const chatRef = useRef<Chat | null>(null);
    const conversationEndRef = useRef<HTMLDivElement>(null);

    const { isListening, transcript, startListening, stopListening, setTranscript, error: speechError } = useSpeechRecognition();
    const { speak, isSpeaking } = useSpeechSynthesis();

     const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            try {
                const text = await readFileAsText(file);
                setResumeText(text);
                setError(null);
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

    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);
    
    useEffect(() => {
        if (speechError) {
            setError(`Speech recognition error: ${speechError}`);
        }
    }, [speechError]);

    const handleStartInterview = async () => {
        if (!roleContext && !resumeText) {
            setError('Please provide a role/topic or upload a resume to start.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setHistory([]);
        
        try {
            const systemInstruction = `You are a friendly but professional interviewer. Your goal is to conduct a ${interviewType} interview that lasts approximately ${interviewDuration} minutes.
                ${resumeText ? `The candidate's resume is as follows:\n---\n${resumeText}\n---\nTailor your questions based on the experience and skills listed in this resume.` : ''}
                ${jobDescription ? `You are hiring for the role described in the job description below:\n---\n${jobDescription}\n---\nAssess the candidate's fitness for this specific role.` : ''}
                ${(!resumeText && !jobDescription && roleContext) ? `You are conducting a general interview about "${roleContext}".` : ''}
                ${(resumeText || jobDescription) && roleContext ? `The context for this interview is the "${roleContext}" role.` : ''}
                Start with a simple, brief introduction like "Hello, thanks for coming in today," and then immediately ask the first question. Do not introduce yourself with a name. Keep your questions and responses concise. Wait for the user to respond before asking the next question. When you feel the interview has reached its natural conclusion or is near the end of the ${interviewDuration} minute duration, conclude the session by saying "Thank you, this concludes our interview." Do not ask if the candidate has questions for you. Do not reveal that you are an AI.`;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const chat = ai.chats.create({
              model: 'gemini-2.5-flash',
              config: { systemInstruction }
            });
            chatRef.current = chat;
            
            const response = await chat.sendMessage({ message: "Hello, let's begin." });
            const initialMessage = response.text;

            setHistory([{ speaker: 'interviewer', text: initialMessage }]);
            speak(initialMessage);
            setInterviewState('running');
        } catch (err) {
            setError('Failed to start interview. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const generateAndSetReport = useCallback(async () => {
        setIsLoading(false); 
        stopListening();
        window.speechSynthesis.cancel();
        setInterviewState('generatingReport');
        setError(null);
        try {
            const context = {
                type: interviewType,
                duration: interviewDuration,
                role: roleContext,
                resume: resumeText,
                jd: jobDescription,
            };
            const generatedReport = await generateInterviewReport(history, context);
            setReport(generatedReport);
            setInterviewState('finished');
        } catch (err) {
            setError("Failed to generate the interview report.");
            console.error(err);
            setInterviewState('setup'); 
        }
    }, [history, interviewType, interviewDuration, roleContext, resumeText, jobDescription, stopListening]);

    const handleSendResponse = async (userMessage: string) => {
        if (!userMessage || !chatRef.current) return;
        
        setIsLoading(true);
        const candidateTurn: InterviewTurn = { speaker: 'candidate', text: userMessage };
        const newHistory = [...history, candidateTurn];
        setHistory(newHistory);
        setTranscript('');

        try {
            const response = await chatRef.current.sendMessage({ message: userMessage });
            const interviewerResponse = response.text;
            
            const interviewerTurn: InterviewTurn = { speaker: 'interviewer', text: interviewerResponse };
            setHistory([...newHistory, interviewerTurn]);

            if(interviewerResponse.toLowerCase().includes("concludes our interview")) {
                 setTimeout(() => {
                    generateAndSetReport();
                 }, 2000);
            } else {
                 speak(interviewerResponse);
            }
           
        } catch (err) {
            setError('There was an error with the interview. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (!isListening && transcript) {
            handleSendResponse(transcript);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening]);


    const handleStopInterview = () => {
        generateAndSetReport();
    };

    const handleNewInterview = () => {
        setInterviewState('setup');
        setRoleContext('');
        setResumeText('');
        setJobDescription('');
        setHistory([]);
        setReport(null);
        chatRef.current = null;
    }

    const renderContent = () => {
        switch (interviewState) {
            case 'setup':
                 return (
                    <div className="space-y-6">
                        <p className="text-gray-400">Practice a real-time interview with an AI. Provide context for a personalized experience.</p>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">Interview Type</label>
                                <div className="flex gap-4">
                                    {(['Mixed', 'Technical', 'Behavioral'] as InterviewType[]).map(type => (
                                        <button key={type} onClick={() => setInterviewType(type)} className={`px-4 py-2 rounded-lg transition-colors w-full ${interviewType === type ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">Interview Duration</label>
                                <div className="flex gap-4">
                                    {([5, 15, 30] as InterviewDuration[]).map(duration => (
                                        <button key={duration} onClick={() => setInterviewDuration(duration)} className={`px-4 py-2 rounded-lg transition-colors w-full ${interviewDuration === duration ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                            {duration} min
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                         <div>
                            <label className="block mb-2 text-sm font-medium text-gray-300">Role / Topic Context</label>
                            <input
                                type="text"
                                value={roleContext}
                                onChange={(e) => setRoleContext(e.target.value)}
                                placeholder="e.g., 'Senior React Developer' or 'Data Structures'"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                         <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">Upload Resume (Optional)</label>
                                <div {...getRootProps()} className={`p-4 border-2 border-dashed rounded-lg cursor-pointer h-40 flex flex-col items-center justify-center text-center ${isDragActive ? 'border-purple-400 bg-gray-700' : 'border-gray-600 hover:border-purple-400'}`}>
                                    <input {...getInputProps()} />
                                    <Upload />
                                    {resumeText ? <p className="mt-2 text-sm text-green-400">Resume Loaded!</p> : <p className="mt-2 text-sm text-gray-400">{isDragActive ? "Drop file..." : "Drag 'n' drop or click to select"}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">Job Description (Optional)</label>
                                 <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste job description here..."
                                    className="w-full h-40 bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                        
                        <div className="text-center">
                            <button
                                onClick={handleStartInterview}
                                disabled={isLoading}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg disabled:bg-gray-500 transition-colors text-lg"
                            >
                                {isLoading ? 'Starting...' : 'Start Interview'}
                            </button>
                        </div>
                        {error && <p className="text-red-400 text-center mt-4">{error}</p>}
                    </div>
                );
             case 'running':
                return (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Interviewing for: {roleContext || 'General'} (~{interviewDuration} min)</h3>
                            <button onClick={handleStopInterview} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                                End Interview
                            </button>
                        </div>

                        <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-900 rounded-lg space-y-4">
                            {history.map((turn, index) => (
                                <div key={index} className={`flex ${turn.speaker === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-md p-3 rounded-lg ${turn.speaker === 'interviewer' ? 'bg-purple-800' : 'bg-gray-600'}`}>
                                        <p>{turn.text}</p>
                                    </div>
                                </div>
                            ))}
                             <div ref={conversationEndRef} />
                        </div>

                        <div className="text-center">
                            <p className="h-8 text-gray-400 mb-2">{isListening ? "Listening..." : "Click the mic to speak"}</p>
                             <button onClick={isListening ? stopListening : startListening} className={`p-4 rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                {isListening ? <StopCircle /> : <Mic />}
                            </button>
                            <div className="mt-4 text-gray-300 min-h-[50px]">{transcript}</div>
                            {isLoading && !isListening && <Spinner text="AI is thinking..." />}
                            {isSpeaking && <div className="mt-2 flex items-center justify-center text-sm text-purple-300"><Speaker />&nbsp;Speaking...</div>}
                        </div>
                    </div>
                );
            case 'generatingReport':
                return <Spinner text="Interview complete! Generating your performance report..." />;
            case 'finished':
                if (!report) return null;
                const scoreColor = report.overallScore >= 80 ? 'text-green-400' : report.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400';
                return (
                     <div className="bg-gray-800 rounded-lg p-6">
                         <h3 className="text-2xl font-bold mb-6 text-center text-purple-300">Interview Performance Report</h3>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             {/* Score and Summary */}
                             <div className="md:col-span-1 bg-gray-900 p-6 rounded-lg flex flex-col items-center justify-center text-center">
                                 <h4 className="font-semibold text-lg mb-2">Overall Score</h4>
                                 <div className="relative w-32 h-32">
                                     <svg className="w-full h-full" viewBox="0 0 36 36">
                                         <path className="text-gray-700" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                         <path className={`${scoreColor.replace('text-','stroke-')}`} strokeWidth="3" fill="none" strokeDasharray={`${report.overallScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                     </svg>
                                     <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                                        <span className={`text-3xl font-bold ${scoreColor}`}>{report.overallScore}</span>
                                     </div>
                                 </div>
                                 <p className="mt-4 text-gray-400 text-sm">{report.summary}</p>
                                 <p className="mt-4 text-lg font-semibold">{report.recommendation}</p>
                             </div>

                             {/* Competencies */}
                             <div className="md:col-span-2 bg-gray-900 p-6 rounded-lg">
                                <h4 className="font-semibold text-lg mb-4">Key Competencies</h4>
                                <div className="space-y-4">
                                    {report.competencies.map(comp => (
                                        <div key={comp.name}>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h5 className="font-semibold">{comp.name}</h5>
                                                <span className="text-sm font-bold text-purple-300">{comp.score}/10</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                                <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${comp.score * 10}%` }}></div>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{comp.feedback}</p>
                                        </div>
                                    ))}
                                </div>
                             </div>
                         </div>
                         
                         {/* Strengths and Improvements */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="bg-gray-900 p-6 rounded-lg">
                                <h4 className="font-semibold text-lg mb-3 flex items-center text-green-400"><CheckCircle className="w-5 h-5 mr-2"/> Strengths</h4>
                                <ul className="space-y-2 list-inside text-gray-300">
                                    {report.strengths.map((s, i) => <li key={i} className="text-sm">✓ {s}</li>)}
                                </ul>
                            </div>
                            <div className="bg-gray-900 p-6 rounded-lg">
                                <h4 className="font-semibold text-lg mb-3 flex items-center text-yellow-400"><AlertTriangle className="w-5 h-5 mr-2"/> Areas for Improvement</h4>
                                <ul className="space-y-2 list-inside text-gray-300">
                                    {report.areasForImprovement.map((a, i) => <li key={i} className="text-sm">○ {a}</li>)}
                                </ul>
                            </div>
                         </div>

                         <div className="mt-8 flex justify-center">
                             <button onClick={handleNewInterview} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg">
                                 Try Another Interview
                             </button>
                         </div>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="max-w-5xl mx-auto">
            <button onClick={onBack} className="flex items-center text-purple-400 hover:text-purple-300 mb-6 font-semibold disabled:text-gray-500" disabled={interviewState === 'running'}>
                <ChevronLeftIcon />
                Back to Dashboard
            </button>
            <h2 className="text-3xl font-bold mb-4 text-purple-300">Interview Mode</h2>
            {renderContent()}
        </div>
    );
};

export default InterviewMode;
