import React, { useState } from 'react';
import { generateRoadmap } from '../services/geminiService';
import { Roadmap } from '../types';
import Spinner from './common/Spinner';
import { ChevronLeftIcon } from './common/Icons';

interface RoadmapGeneratorProps {
  onBack: () => void;
}

const RoadmapGenerator: React.FC<RoadmapGeneratorProps> = ({ onBack }) => {
    const [topic, setTopic] = useState('');
    const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!topic) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setRoadmap(null);
        try {
            const result = await generateRoadmap(topic);
            setRoadmap(result);
        } catch (err) {
            setError('Failed to generate roadmap. Please try again.');
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
            <h2 className="text-3xl font-bold mb-4 text-purple-300">Roadmap Generator</h2>
            <p className="mb-6 text-gray-400">Enter a skill or technology to generate a personalized learning roadmap.</p>
            <div className="flex gap-4 mb-6">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., 'Learn TypeScript', 'Master System Design'"
                    className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-500 transition-colors"
                >
                    {isLoading ? 'Generating...' : 'Generate'}
                </button>
            </div>

            {error && <p className="text-red-400 mb-4 text-center">{error}</p>}

            <div className="bg-gray-800 rounded-lg p-6">
                {isLoading && <Spinner text="Building your roadmap..." />}
                {roadmap && (
                    <div>
                        <h3 className="text-2xl font-bold mb-4">{roadmap.title}</h3>
                        <div className="space-y-4">
                            {roadmap.steps.map((step) => (
                                <div key={step.step} className="p-4 bg-gray-700 rounded-lg">
                                    <h4 className="text-xl font-semibold text-purple-300">Step {step.step}: {step.title}</h4>
                                    <p className="mt-2 text-gray-300">{step.description}</p>
                                    <div className="mt-3">
                                        <h5 className="font-semibold">Resources:</h5>
                                        <ul className="list-disc list-inside text-sm text-gray-400">
                                            {step.resources.map((res, i) => (
                                                <li key={i}><a href={res} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{res}</a></li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoadmapGenerator;
