import React, { useState, useEffect } from 'react';
import './App.css';
import SoundWave from './components/SoundWave';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';

function App() {
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('Listening...');
  
  const { speak, isSpeaking } = useSpeechSynthesis();
  const { startListening, stopListening, isListening } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onInterim: handleInterimResult
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Determine the current state for visual feedback
  const currentState = isProcessing ? 'thinking' : 
                      isSpeaking ? 'speaking' : 
                      isListening ? 'listening' : 'idle';

  useEffect(() => {
    setStatus(currentState);
    
    switch (currentState) {
      case 'idle':
        setStatusText('Listening...');
        break;
      case 'listening':
        setStatusText('Listening...');
        break;
      case 'thinking':
        setStatusText('Friday is thinking...');
        break;
      case 'speaking':
        setStatusText('Friday is speaking...');
        break;
      default:
        setStatusText('Ready');
    }
  }, [currentState]);

  function handleInterimResult(transcript) {
    if (!isProcessing && !isSpeaking) {
      setStatusText(`Listening: ${transcript}`);
    }
  }

  async function handleSpeechResult(transcript) {
    if (isProcessing || isSpeaking) return;
    
    setIsProcessing(true);
    stopListening();
    setStatusText(`Heard: ${transcript}`);
    
    try {
      console.log('Sending to Friday:', transcript);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: transcript }),
      });

      const data = await response.json();

      if (response.ok) {
        await speak(data.response);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error communicating with Friday:', error);
      await speak('Apologies, Sir, but I encountered a technical difficulty.');
    } finally {
      setIsProcessing(false);
      // Restart listening after a brief delay
      setTimeout(() => {
        startListening();
      }, 1000);
    }
  }

  // Start listening on component mount
  useEffect(() => {
    const initializeVoice = async () => {
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted');
        
        // Start with welcome message
        setTimeout(async () => {
          await speak("Good day, Sir. I am Friday, your personal assistant. How may I be of service today?");
          // Start listening after welcome message
          setTimeout(() => {
            startListening();
          }, 1000);
        }, 1500);
        
      } catch (error) {
        console.error('Microphone access denied:', error);
        setStatusText('Please allow microphone access and refresh the page');
      }
    };

    initializeVoice();
  }, [speak, startListening]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Friday</h1>
      </header>
      
      <main className="app-main">
        <div className="sound-wave-container">
          <SoundWave state={status} />
        </div>
        
        <div className="status-text">{statusText}</div>
      </main>
      
      <footer className="app-footer">
        <p>Friday is always listening - just speak naturally</p>
      </footer>
    </div>
  );
}

export default App;
