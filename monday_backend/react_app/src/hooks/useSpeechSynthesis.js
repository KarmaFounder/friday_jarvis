import { useState, useCallback } from 'react';

export const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.error('Speech synthesis not supported');
        resolve();
        return;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Optimized voice settings to match console quality as closely as possible
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      // Enhanced voice selection for better quality female voices
      const voices = speechSynthesis.getVoices();
      
      // Priority list of high-quality female voices
      const preferredVoices = [
        'Microsoft Zira Desktop - English (United States)',
        'Microsoft Zira - English (United States)', 
        'Google UK English Female',
        'Google US English Female',
        'Samantha',
        'Victoria (Enhanced)',
        'Karen',
        'Moira',
        'Tessa',
        'Veena',
        'Fiona',
        'Alex'
      ];
      
      let selectedVoice = null;
      
      // Try to find the best female voice
      for (const voiceName of preferredVoices) {
        selectedVoice = voices.find(voice => 
          voice.name.includes(voiceName) ||
          voice.name.toLowerCase().includes(voiceName.toLowerCase()) ||
          (voice.name.toLowerCase().includes('female') && voice.lang.includes('en'))
        );
        if (selectedVoice) break;
      }
      
      // Fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('en-US') || 
          voice.lang.includes('en-GB') ||
          voice.lang.includes('en')
        );
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name, selectedVoice.lang);
      }

      utterance.onstart = () => {
        console.log('Speech synthesis started');
      };

      utterance.onend = () => {
        console.log('Speech synthesis ended');
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  }, []);

  return {
    speak,
    isSpeaking
  };
};
