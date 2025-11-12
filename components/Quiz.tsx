import React, { useState } from 'react';
import { generateQuiz } from '../services/geminiService';
import { QuizQuestion } from '../types';
import Spinner from './common/Spinner';
import { ChevronLeftIcon } from './common/Icons';

interface QuizProps {
  onBack: () => void;
}

const Quiz: React.FC<QuizProps> = ({ onBack }) => {
    const [topic, setTopic] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [difficulty, setDifficulty] = useState('Medium');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const handleGenerate = async () => {
        if (!topic) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        // Reset state
        setQuestions([]);
        setShowResults(false);
        setScore(0);
        setCurrentQuestionIndex(0);
        
        try {
            const result = await generateQuiz(topic, numQuestions, difficulty);
            setQuestions(result);
        } catch (err) {
            setError('Failed to generate quiz. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerSelect = (option: string) => {
        if(isAnswered) return;
        setSelectedAnswer(option);
        setIsAnswered(true);
        if (option === questions[currentQuestionIndex].answer) {
            setScore(prev => prev + 1);
        }
    };
    
    const handleNextQuestion = () => {
        setIsAnswered(false);
        setSelectedAnswer(null);
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setShowResults(true);
        }
    };

    const handleRestart = () => {
        setQuestions([]);
        setShowResults(false);
        setScore(0);
        setCurrentQuestionIndex(0);
        setTopic('');
    }

    const renderQuiz = () => {
        if (showResults) {
            return (
                <div className="text-center bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-2xl font-bold mb-4">Quiz Complete!</h3>
                    <p className="text-xl">Your score: {score} / {questions.length}</p>
                    <button onClick={handleRestart} className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg">
                        Take Another Quiz
                    </button>
                </div>
            )
        }

        const currentQuestion = questions[currentQuestionIndex];
        return (
            <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Question {currentQuestionIndex + 1}/{questions.length}</h3>
                <p className="mb-6 text-lg">{currentQuestion.question}</p>
                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                        const isCorrect = option === currentQuestion.answer;
                        const isSelected = option === selectedAnswer;
                        let buttonClass = 'w-full text-left p-3 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors';
                        if (isAnswered) {
                            if (isCorrect) {
                                buttonClass += ' bg-green-700 border-green-500';
                            } else if (isSelected && !isCorrect) {
                                buttonClass += ' bg-red-700 border-red-500';
                            }
                        }
                        return (
                            <button key={index} onClick={() => handleAnswerSelect(option)} className={buttonClass} disabled={isAnswered}>
                                {option}
                            </button>
                        )
                    })}
                </div>
                {isAnswered && (
                     <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                        <p className="font-bold">Explanation:</p>
                        <p>{currentQuestion.explanation}</p>
                        <button onClick={handleNextQuestion} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">
                            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Show Results'}
                        </button>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto">
             <button onClick={onBack} className="flex items-center text-purple-400 hover:text-purple-300 mb-6 font-semibold">
                <ChevronLeftIcon />
                Back to Dashboard
            </button>
            <h2 className="text-3xl font-bold mb-4 text-purple-300">Quiz Generator</h2>
            
            {questions.length === 0 ? (
                <>
                <p className="mb-6 text-gray-400">Enter a topic and set your preferences to generate a quiz.</p>
                
                <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-300">Topic</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., 'JavaScript Promises', 'CSS Flexbox'"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block mb-2 text-sm font-medium text-gray-300">Number of Questions</label>
                             <select value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500">
                                 <option value={5}>5</option>
                                 <option value={10}>10</option>
                                 <option value={15}>15</option>
                             </select>
                         </div>
                         <div>
                            <label className="block mb-2 text-sm font-medium text-gray-300">Difficulty</label>
                            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500">
                                 <option value="Easy">Easy</option>
                                 <option value="Medium">Medium</option>
                                 <option value="Hard">Hard</option>
                            </select>
                         </div>
                     </div>
                      <div className="text-center pt-4">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-8 rounded-lg disabled:bg-gray-500 transition-colors"
                        >
                            {isLoading ? 'Generating...' : 'Start Quiz'}
                        </button>
                    </div>
                </div>

                {error && <p className="text-red-400 my-4 text-center">{error}</p>}
                {isLoading && <div className="mt-6"><Spinner text="Generating your quiz..." /></div>}
                </>
            ) : renderQuiz()}
        </div>
    );
};

export default Quiz;