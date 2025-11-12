import { useState, useEffect, useCallback } from 'react';

interface SpeechSynthesisHook {
    speak: (text: string) => void;
    isSpeaking: boolean;
    isSupported: boolean;
}

const useSpeechSynthesis = (): SpeechSynthesisHook => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    const speak = useCallback((text: string) => {
        if (!isSupported || isSpeaking) return;

        window.speechSynthesis.cancel(); // Prevent overlapping speech

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
                      voices.find(v => v.lang.startsWith('en-US')) ||
                      voices[0];

        if (voice) {
          utterance.voice = voice;
        }
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.volume = 1;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
            console.error("SpeechSynthesis Error:", e);
            setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
    }, [isSupported, isSpeaking]);

    useEffect(() => {
        return () => {
            if (isSupported) {
                window.speechSynthesis.cancel();
            }
        };
    }, [isSupported]);

    return { speak, isSpeaking, isSupported };
};

export default useSpeechSynthesis;