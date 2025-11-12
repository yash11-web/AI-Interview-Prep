import { Type } from "@google/genai";

export interface QuizQuestion {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
}

export interface RoadmapStep {
    step: number;
    title: string;
    description: string;
    resources: string[];
}

export interface Roadmap {
    title: string;
    steps: RoadmapStep[];
}

export interface AtsScanResult {
    score?: number;
    matchRate?: string;
    keywords?: {
        missing: string[];
        found: string[];
    };
    summary: string;
    suggestions: string;
    strengths?: string;
    weaknesses?: string;
}

export interface InterviewTurn {
    speaker: 'interviewer' | 'candidate';
    text: string;
}

export interface InterviewReport {
    overallScore: number;
    summary: string;
    competencies: {
        name: string;
        score: number;
        feedback: string;
    }[];
    strengths: string[];
    areasForImprovement: string[];
    recommendation: string;
}
