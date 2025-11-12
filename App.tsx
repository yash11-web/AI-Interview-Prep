import React, { useState } from 'react';
import AtsScanner from './components/AtsScanner';
import RoadmapGenerator from './components/RoadmapGenerator';
import Quiz from './components/Quiz';
import InterviewMode from './components/InterviewMode';
import PracticeMode from './components/PracticeMode';
import { FileScan, Map, HelpCircle, Mic, MessageSquare, ChevronLeftIcon } from './components/common/Icons';

type View = 'dashboard' | 'ats' | 'roadmap' | 'quiz' | 'interview' | 'practice';

const App: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');

    const features = [
        { id: 'quiz', label: 'Quiz Generator', icon: <HelpCircle />, description: "Test your knowledge with custom quizzes." },
        { id: 'roadmap', label: 'Roadmap Generator', icon: <Map />, description: "Get a learning plan for any skill." },
        { id: 'ats', label: 'ATS Resume Scanner', icon: <FileScan />, description: "Optimize your resume against a job." },
        { id: 'practice', label: 'Prep Arena', icon: <MessageSquare />, description: "Tackle practice questions from coding to behavioral and get instant feedback." },
        { id: 'interview', label: 'Mock Interview', icon: <Mic />, description: "Simulate a real-time interview with AI." },
    ];

    const renderView = () => {
        const props = { onBack: () => setView('dashboard') };
        switch (view) {
            case 'ats':
                return <AtsScanner {...props} />;
            case 'roadmap':
                return <RoadmapGenerator {...props} />;
            case 'quiz':
                return <Quiz {...props} />;
            case 'interview':
                return <InterviewMode {...props} />;
            case 'practice':
                return <PracticeMode {...props} />;
            case 'dashboard':
            default:
                return (
                    <div>
                        <h2 className="text-3xl font-bold text-center mb-2 text-purple-300">AI Interview Prep Toolkit</h2>
                        <p className="text-center text-gray-400 mb-8">Select a tool to get started.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map(feature => (
                                <button
                                    key={feature.id}
                                    onClick={() => setView(feature.id as View)}
                                    className="bg-gray-800 p-6 rounded-lg text-left hover:bg-gray-700 hover:ring-2 hover:ring-purple-500 transition-all duration-300 transform hover:-translate-y-1"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="p-2 bg-gray-900 rounded-full mr-4">{feature.icon}</div>
                                        <h3 className="text-xl font-bold text-white">{feature.label}</h3>
                                    </div>
                                    <p className="text-gray-400">{feature.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <header className="bg-gray-800 p-4 border-b border-gray-700">
                <h1 className="text-2xl font-bold text-purple-400 text-center">AI Interview Prep</h1>
            </header>
            <main className="p-6 md:p-10">
                {renderView()}
            </main>
        </div>
    );
};

export default App;