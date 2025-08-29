// Friday AI Assistant - Web Interface JavaScript

class FridayWebInterface {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recognition = null;
        this.isListening = false;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeSpeechRecognition();
        this.loadMondayBoards();
    }

    initializeElements() {
        // Main elements
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.voiceButton = document.getElementById('voiceButton');
        this.messageList = document.getElementById('messageList');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.soundWaveContainer = document.getElementById('soundWaveContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Monday.com elements
        this.sidePanel = document.getElementById('sidePanel');
        this.mondayToggle = document.getElementById('mondayToggle');
        this.closePanelBtn = document.getElementById('closePanelBtn');
        this.boardSelect = document.getElementById('boardSelect');
        this.quickTaskName = document.getElementById('quickTaskName');
        this.createTaskBtn = document.getElementById('createTaskBtn');
    }

    initializeEventListeners() {
        // Chat input events
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.sendButton.addEventListener('click', () => this.sendMessage());

        // Voice recording events
        this.voiceButton.addEventListener('mousedown', () => this.startRecording());
        this.voiceButton.addEventListener('mouseup', () => this.stopRecording());
        this.voiceButton.addEventListener('mouseleave', () => this.stopRecording());
        
        // Touch events for mobile
        this.voiceButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        this.voiceButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });

        // Monday.com panel events
        this.mondayToggle.addEventListener('click', () => this.toggleMondayPanel());
        this.closePanelBtn.addEventListener('click', () => this.closeMondayPanel());
        this.createTaskBtn.addEventListener('click', () => this.createMondayTask());

        // Auto-resize message input
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 100) + 'px';
        });
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateStatus('listening', 'Listening...');
                this.showSoundWave('listening');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.sendMessage();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updateStatus('ready', 'Ready');
                this.hideSoundWave();
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateStatus('ready', 'Ready');
                this.hideSoundWave();
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    }

    startRecording() {
        if (this.recognition && !this.isListening) {
            this.recognition.start();
            this.voiceButton.classList.add('recording');
        }
    }

    stopRecording() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.voiceButton.classList.remove('recording');
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Show loading state
        this.updateStatus('thinking', 'Friday is thinking...');
        this.showLoading();

        try {
            // Send message to backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();

            if (response.ok) {
                // Add Friday's response
                this.addMessage(data.response, 'assistant');
                this.speakResponse(data.response);
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('Apologies, Sir, but I encountered a technical difficulty. Please try again.', 'assistant');
        } finally {
            this.hideLoading();
            this.updateStatus('ready', 'Ready');
        }
    }

    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="avatar ${type}-avatar">${type === 'user' ? 'Y' : 'F'}</div>
                <div class="text">${this.escapeHtml(text)}</div>
            </div>
            <div class="timestamp">${timeString}</div>
        `;

        this.messageList.appendChild(messageDiv);
        this.scrollToBottom();
    }

    speakResponse(text) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;

            // Find a good voice (prefer British English for Friday's character)
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.lang.includes('en-GB') || 
                voice.name.includes('Daniel') || 
                voice.name.includes('British')
            ) || voices.find(voice => voice.lang.includes('en'));

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            utterance.onstart = () => {
                this.updateStatus('speaking', 'Friday is speaking...');
                this.showSoundWave('speaking');
            };

            utterance.onend = () => {
                this.updateStatus('ready', 'Ready');
                this.hideSoundWave();
            };

            speechSynthesis.speak(utterance);
        }
    }

    showSoundWave(type) {
        this.soundWaveContainer.className = `sound-wave-container active ${type}`;
    }

    hideSoundWave() {
        this.soundWaveContainer.className = 'sound-wave-container';
    }

    updateStatus(type, text) {
        this.statusDot.className = `status-dot ${type}`;
        this.statusText.textContent = text;
    }

    showLoading() {
        this.loadingOverlay.classList.add('show');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('show');
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messageList.scrollTop = this.messageList.scrollHeight;
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    // Monday.com Integration
    toggleMondayPanel() {
        this.sidePanel.classList.toggle('open');
    }

    closeMondayPanel() {
        this.sidePanel.classList.remove('open');
    }

    async loadMondayBoards() {
        try {
            const response = await fetch('/api/tools/monday/boards');
            const data = await response.json();
            
            if (response.ok) {
                // Parse the response to extract board information
                // This is a simplified parser - you might want to improve this
                const boardText = data.response;
                if (boardText.includes('boards')) {
                    // For now, we'll add some example options
                    // In a real implementation, you'd parse the actual board data
                    this.addBoardOption('Example Board 1', '123456789');
                    this.addBoardOption('Example Board 2', '987654321');
                }
            }
        } catch (error) {
            console.error('Error loading Monday boards:', error);
        }
    }

    addBoardOption(name, id) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        this.boardSelect.appendChild(option);
    }

    async createMondayTask() {
        const taskName = this.quickTaskName.value.trim();
        const boardId = this.boardSelect.value;

        if (!taskName || !boardId) {
            alert('Please enter a task name and select a board.');
            return;
        }

        try {
            this.createTaskBtn.disabled = true;
            this.createTaskBtn.textContent = 'Creating...';

            const response = await fetch('/api/tools/monday/create-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_name: taskName,
                    board_id: boardId
                }),
            });

            const data = await response.json();

            if (response.ok) {
                this.addMessage(`Task created: ${taskName}`, 'assistant');
                this.quickTaskName.value = '';
                this.closeMondayPanel();
            } else {
                throw new Error(data.error || 'Failed to create task');
            }
        } catch (error) {
            console.error('Error creating task:', error);
            alert('Failed to create task. Please try again.');
        } finally {
            this.createTaskBtn.disabled = false;
            this.createTaskBtn.textContent = 'Create Task';
        }
    }
}

// Quick message function for quick actions
function sendQuickMessage(message) {
    if (window.fridayApp) {
        window.fridayApp.messageInput.value = message;
        window.fridayApp.sendMessage();
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.fridayApp = new FridayWebInterface();
    
    // Load voices for speech synthesis
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            // Voices are now loaded
        };
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause any ongoing speech when tab is hidden
        if ('speechSynthesis' in window) {
            speechSynthesis.pause();
        }
    } else {
        // Resume speech when tab is visible again
        if ('speechSynthesis' in window && speechSynthesis.paused) {
            speechSynthesis.resume();
        }
    }
});
