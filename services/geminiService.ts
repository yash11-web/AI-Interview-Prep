import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, Roadmap, AtsScanResult, InterviewTurn, InterviewReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const model = 'gemini-2.5-flash';

export const generateQuiz = async (topic: string, count: number, difficulty: string): Promise<QuizQuestion[]> => {
    const prompt = `Generate a ${count}-question multiple-choice quiz on the topic "${topic}" with ${difficulty} difficulty. For each question, provide one correct answer, three plausible but incorrect distractors, and a brief explanation for the correct answer.`;
    
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                options: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                },
                                answer: { type: Type.STRING },
                                explanation: { type: Type.STRING }
                            },
                            required: ["question", "options", "answer", "explanation"]
                        }
                    }
                },
                required: ["questions"]
            }
        }
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.questions;
};

export const generateRoadmap = async (topic: string): Promise<Roadmap> => {
    const prompt = `Create a detailed learning roadmap for the topic "${topic}". The roadmap should be structured into logical steps. For each step, provide a title, a short description of what to learn, and a list of recommended online resources (articles, videos, tutorials).`;
    
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    steps: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                step: { type: Type.NUMBER },
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                resources: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                }
                            },
                            required: ["step", "title", "description", "resources"]
                        }
                    }
                },
                required: ["title", "steps"]
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

export const scanAts = async (resumeText: string, jobDescription: string): Promise<AtsScanResult> => {
    if (jobDescription.trim()) {
        // Scenario 1: Resume vs. Job Description Scan
        const prompt = `Act as an expert ATS (Applicant Tracking System) scanner. Analyze the following resume against the provided job description.
    
        Resume:
        ---
        ${resumeText}
        ---
        
        Job Description:
        ---
        ${jobDescription}
        ---
        
        Provide a detailed analysis in JSON format.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER, description: "A score out of 100 representing the match." },
                        matchRate: { type: Type.STRING, description: "A percentage string for the match rate." },
                        keywords: {
                            type: Type.OBJECT,
                            properties: {
                                missing: { type: Type.ARRAY, items: { type: Type.STRING } },
                                found: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        },
                        summary: { type: Type.STRING, description: "A brief summary of the analysis." },
                        suggestions: { type: Type.STRING, description: "Actionable suggestions for improving the resume for this specific job." }
                    },
                    required: ["score", "matchRate", "keywords", "summary", "suggestions"]
                }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } else {
        // Scenario 2: General Resume Review
        const prompt = `Act as an expert career coach and resume writer. Critically analyze the following resume. Provide a detailed analysis of its strengths and weaknesses. Give a concise summary and offer actionable suggestions for improvement. Structure your response in JSON format.
        
        Resume:
        ---
        ${resumeText}
        ---
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "A brief summary of the resume's overall quality and presentation." },
                        suggestions: { type: Type.STRING, description: "Actionable suggestions for improving the resume globally." },
                        strengths: { type: Type.STRING, description: "A paragraph detailing the key strengths of the resume." },
                        weaknesses: { type: Type.STRING, description: "A paragraph detailing the key weaknesses or areas for improvement." }
                    },
                    required: ["summary", "suggestions", "strengths", "weaknesses"]
                }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    }
};

export const generateInterviewReport = async (transcript: InterviewTurn[], context: any): Promise<InterviewReport> => {
    const transcriptText = transcript.map(turn => `${turn.speaker}: ${turn.text}`).join('\n');

    const prompt = `
        Act as an expert interview coach. Analyze the provided interview transcript and context.
        
        **Interview Context:**
        - Type: ${context.type}
        - Role/Topic: ${context.role || 'General'}
        ${context.resume ? `- Candidate's Resume Provided.` : ''}

        **Interview Transcript:**
        ---
        ${transcriptText}
        ---

        Based on the transcript and context, provide a comprehensive performance report for the candidate in a structured JSON format.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overallScore: { type: Type.NUMBER, description: "A score out of 100 for overall performance." },
                    summary: { type: Type.STRING, description: "A brief, high-level overview of the candidate's performance." },
                    competencies: {
                        type: Type.ARRAY,
                        description: "Assessment of 3-4 key competencies.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "Name of the competency (e.g., 'Clarity & Conciseness', 'Technical Depth', 'Problem-Solving')." },
                                score: { type: Type.NUMBER, description: "Score from 1 to 10 for this competency." },
                                feedback: { type: Type.STRING, description: "Brief feedback on this competency." }
                            },
                             required: ["name", "score", "feedback"]
                        }
                    },
                    strengths: {
                        type: Type.ARRAY,
                        description: "A list of specific strengths, with examples.",
                        items: { type: Type.STRING }
                    },
                    areasForImprovement: {
                        type: Type.ARRAY,
                        description: "A list of specific areas for improvement, with constructive advice.",
                        items: { type: Type.STRING }
                    },
                    recommendation: { type: Type.STRING, description: "A final recommendation (e.g., 'Strongly Recommend', 'Recommend')." }
                },
                required: ["overallScore", "summary", "competencies", "strengths", "areasForImprovement", "recommendation"]
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};
