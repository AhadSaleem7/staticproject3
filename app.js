// Import dependencies for offline support
document.addEventListener('DOMContentLoaded', function() {
    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
});

// Application State
let currentLanguage = 'hi'; // 'hi' for Hindi, 'en' for English
let conversationState = 'welcome';
let isTyping = false;
let currentSymptomFlow = null;

// Speech recognition setup
let recognition = null;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('message-input').value = transcript;
    };
}

// Sample data based on provided JSON
const appData = {
    quickActions: [
        {id: "symptoms", text: "Check Symptoms", textHi: "लक्षण जांच", icon: "🩺"},
        {id: "appointment", text: "Book Appointment", textHi: "अपॉइंटमेंट", icon: "📅"},
        {id: "emergency", text: "Emergency Help", textHi: "आपातकाल", icon: "🚨"},
        {id: "education", text: "Health Tips", textHi: "स्वास्थ्य टिप्स", icon: "📚"}
    ],
    
    conversations: {
        welcome: {
            hi: "नमस्ते! मैं आपका स्वास्थ्य सहायक हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",
            en: "Hello! I'm your health assistant. How can I help you today?"
        },
        
        symptoms: {
            fever: {
                hi: "बुखार कितने दिन से है? कृपया बताएं:",
                en: "How many days have you had fever? Please tell me:",
                options: {
                    hi: ["1 दिन", "2-3 दिन", "4+ दिन"],
                    en: ["1 day", "2-3 days", "4+ days"]
                }
            },
            cough: {
                hi: "खांसी के साथ कोई और लक्षण है?",
                en: "Do you have any other symptoms with the cough?",
                options: {
                    hi: ["बुखार भी है", "सांस लेने में तकलीफ", "सिर्फ खांसी"],
                    en: ["Also have fever", "Breathing difficulty", "Only cough"]
                }
            }
        },
        
        appointments: {
            hi: "नजदीकी स्वास्थ्य केंद्र देखने के लिए 'केंद्र देखें' दबाएं।",
            en: "Press 'View Centers' to see nearby health facilities."
        },
        
        emergency: {
            hi: "🚨 आपातकाल की स्थिति में तुरंत 108 पर कॉल करें!",
            en: "🚨 In emergency, immediately call 108!"
        },
        
        healthTips: [
            {
                title: {hi: "टीकाकरण शेड्यूल", en: "Vaccination Schedule"},
                content: {hi: "बच्चों के लिए जरूरी टीके समय पर लगवाना जरूरी है।", en: "It's important to get children vaccinated on time."}
            },
            {
                title: {hi: "मातृत्व देखभाल", en: "Maternal Care"},
                content: {hi: "गर्भावस्था में नियमित जांच कराना आवश्यक है।", en: "Regular checkups during pregnancy are essential."}
            },
            {
                title: {hi: "मधुमेह प्रबंधन", en: "Diabetes Management"},
                content: {hi: "डायबिटीज़ को नियंत्रित रखने के लिए दवा और खान-पान दोनों पर ध्यान दें।", en: "Control diabetes with proper medication and diet."}
            }
        ]
    }
};

// Make functions globally available
window.startChat = function() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('chat-interface').classList.remove('hidden');
    
    // Send welcome message
    setTimeout(() => {
        addBotMessage(appData.conversations.welcome[currentLanguage]);
    }, 500);
};

window.goBack = function() {
    document.getElementById('chat-interface').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
};

window.toggleLanguage = function() {
    currentLanguage = currentLanguage === 'hi' ? 'en' : 'hi';
    document.getElementById('lang-text').textContent = currentLanguage === 'hi' ? 'EN' : 'हिं';
    
    // Update quick action texts
    updateQuickActionTexts();
};

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (message === '') return;
    
    // Add user message
    addUserMessage(message);
    input.value = '';
    
    // Process message and generate bot response
    setTimeout(() => {
        processBotResponse(message);
    }, 1000);
};

window.selectOption = function(option) {
    // Add user's selection as a message
    addUserMessage(option);
    
    // Generate appropriate response based on selection
    setTimeout(() => {
        if (currentSymptomFlow === 'fever') {
            handleFeverResponse(option);
        } else if (currentSymptomFlow === 'cough') {
            handleCoughResponse(option);
        }
    }, 1000);
};

window.showEmergencyModal = function() {
    document.getElementById('emergency-modal').classList.remove('hidden');
    
    // Also send bot message
    const emergencyMsg = appData.conversations.emergency[currentLanguage];
    addBotMessage(emergencyMsg);
};

window.showFacilitiesModal = function() {
    document.getElementById('facilities-modal').classList.remove('hidden');
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.add('hidden');
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Add event listeners
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Quick action buttons
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleQuickAction(action);
        });
    });
    
    // Voice button simulation
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceRecording);
    }
    
    // Check online/offline status
    window.addEventListener('online', () => updateConnectionStatus(true));
    window.addEventListener('offline', () => updateConnectionStatus(false));
    
    updateConnectionStatus(navigator.onLine);
    
    // Add click handlers for dynamic content
    document.addEventListener('click', handleDynamicClicks);
}

function handleDynamicClicks(e) {
    const target = e.target;
    
    // Handle "View Centers" option
    if (target.textContent && (target.textContent.includes('केंद्र देखें') || target.textContent.includes('View Centers'))) {
        showFacilitiesModal();
    }
    
    // Handle "ASHA Worker" option
    if (target.textContent && (target.textContent.includes('ASHA') || target.textContent.includes('आशा'))) {
        const msg = currentLanguage === 'hi' ? 
            "आशा कार्यकर्ता सुनीता देवी से संपर्क करें: 📞 9876543210" :
            "Contact ASHA Worker Sunita Devi: 📞 9876543210";
        addBotMessage(msg);
    }
    
    // Handle health education "more" request
    if (target.textContent && (target.textContent.includes('और बताएं') || target.textContent.includes('tell more'))) {
        showHealthEducation();
    }
    
    // Handle thank you responses
    if (target.textContent && (target.textContent.includes('धन्यवाद') || target.textContent.includes('Thank you'))) {
        const thankMsg = currentLanguage === 'hi' ? 
            "आपका स्वागत है! और कोई मदद चाहिए तो पूछें। स्वस्थ रहें! 🙏" :
            "You're welcome! Ask if you need more help. Stay healthy! 🙏";
        addBotMessage(thankMsg);
    }
}

function updateQuickActionTexts() {
    document.querySelectorAll('.quick-action-btn').forEach((btn, index) => {
        const action = appData.quickActions[index];
        const textSpan = btn.querySelector('.action-text');
        if (textSpan && action) {
            textSpan.textContent = currentLanguage === 'hi' ? action.textHi : action.text;
        }
    });
}

function addUserMessage(text) {
    const messagesContainer = document.getElementById('messages-container');
    const messageDiv = createMessageElement('user', text);
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addBotMessage(text, options = null) {
    showTypingIndicator();
    
    setTimeout(() => {
        hideTypingIndicator();
        const messagesContainer = document.getElementById('messages-container');
        const messageDiv = createMessageElement('bot', text, options);
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }, 1500);
}

function createMessageElement(sender, text, options = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const time = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    
    let optionsHtml = '';
    if (options && options.length > 0) {
        optionsHtml = `
            <div class="message-options">
                ${options.map(option => `
                    <button class="option-btn" onclick="selectOption('${option}')">${option}</button>
                `).join('')}
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-content">${text}</div>
            ${optionsHtml}
            <div class="message-time">${time}</div>
        </div>
    `;
    
    return messageDiv;
}

function processBotResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check for symptom keywords
    if (lowerMessage.includes('बुखार') || lowerMessage.includes('fever')) {
        handleSymptomFlow('fever');
    } else if (lowerMessage.includes('खांसी') || lowerMessage.includes('cough')) {
        handleSymptomFlow('cough');
    } else if (lowerMessage.includes('सिरदर्द') || lowerMessage.includes('headache')) {
        const response = currentLanguage === 'hi' ? 
            "सिरदर्द कितनी देर से है? क्या आराम करने से कम हो जाता है?" :
            "How long have you had the headache? Does it reduce with rest?";
        addBotMessage(response);
    } else if (lowerMessage.includes('पेट दर्द') || lowerMessage.includes('stomach')) {
        const response = currentLanguage === 'hi' ? 
            "पेट दर्द कैसा है? तेज़ है या धीमा? खाना खाने के बाद बढ़ता है?" :
            "How is the stomach pain? Sharp or dull? Does it increase after eating?";
        addBotMessage(response);
    } else if (lowerMessage.includes('डॉक्टर') || lowerMessage.includes('doctor') || 
               lowerMessage.includes('अपॉइंटमेंट') || lowerMessage.includes('appointment')) {
        handleAppointmentRequest();
    } else if (lowerMessage.includes('आपातकाल') || lowerMessage.includes('emergency')) {
        showEmergencyModal();
    } else {
        // Generic helpful response
        const responses = {
            hi: [
                "मैं समझ गया। क्या आप अपने लक्षणों के बारे में और बता सकते हैं?",
                "अधिक जानकारी के लिए नीचे दिए गए विकल्पों में से चुनें।",
                "यदि यह गंभीर है तो कृपया तुरंत डॉक्टर से मिलें।"
            ],
            en: [
                "I understand. Can you tell me more about your symptoms?",
                "Please choose from the options below for more information.",
                "If this is serious, please see a doctor immediately."
            ]
        };
        
        const randomResponse = responses[currentLanguage][Math.floor(Math.random() * responses[currentLanguage].length)];
        addBotMessage(randomResponse);
    }
}

function handleSymptomFlow(symptom) {
    const symptomData = appData.conversations.symptoms[symptom];
    if (symptomData) {
        const message = symptomData[currentLanguage];
        const options = symptomData.options[currentLanguage];
        addBotMessage(message, options);
        currentSymptomFlow = symptom;
    }
}

function handleFeverResponse(option) {
    let advice = '';
    
    if (option.includes('1') || option === '1 day') {
        advice = currentLanguage === 'hi' ? 
            "1 दिन का बुखार चिंता की बात नहीं। आराम करें, पानी पिएं। यदि बुखार 102°F से ज्यादा हो तो डॉक्टर से मिलें।" :
            "1-day fever is not concerning. Rest and drink water. See a doctor if fever is above 102°F.";
    } else if (option.includes('2-3') || option === '2-3 days') {
        advice = currentLanguage === 'hi' ? 
            "2-3 दिन का बुखार हो तो डॉक्टर से सलाह लें। पैरासिटामोल ले सकते हैं। नजदीकी PHC जाएं।" :
            "For 2-3 days fever, consult a doctor. You can take paracetamol. Visit nearby PHC.";
    } else {
        advice = currentLanguage === 'hi' ? 
            "4+ दिन का बुखार गंभीर हो सकता है। तुरंत डॉक्टर से मिलें। ब्लड टेस्ट की जरूरत हो सकती है।" :
            "4+ days fever can be serious. See a doctor immediately. Blood test may be needed.";
    }
    
    addBotMessage(advice);
    
    // Offer to show nearby facilities
    setTimeout(() => {
        const facilityMsg = currentLanguage === 'hi' ? 
            "नजदीकी स्वास्थ्य केंद्र देखना चाहते हैं?" :
            "Would you like to see nearby health centers?";
        addBotMessage(facilityMsg, [
            currentLanguage === 'hi' ? 'हाँ, दिखाएं' : 'Yes, show me',
            currentLanguage === 'hi' ? 'नहीं, धन्यवाद' : 'No, thank you'
        ]);
    }, 2000);
}

function handleCoughResponse(option) {
    let advice = '';
    
    if (option.includes('बुखार') || option.includes('fever')) {
        advice = currentLanguage === 'hi' ? 
            "खांसी और बुखार साथ हो तो इन्फेक्शन हो सकता है। डॉक्टर से मिलें। गर्म पानी पिएं।" :
            "Cough with fever might be an infection. See a doctor. Drink warm water.";
    } else if (option.includes('सांस') || option.includes('breathing')) {
        advice = currentLanguage === 'hi' ? 
            "🚨 सांस लेने में तकलीफ गंभीर है। तुरंत अस्पताल जाएं या 108 कॉल करें।" :
            "🚨 Breathing difficulty is serious. Go to hospital immediately or call 108.";
    } else {
        advice = currentLanguage === 'hi' ? 
            "सिर्फ खांसी हो तो शहद-अदरक लें। धूम्रपान न करें। 3 दिन में ठीक न हो तो डॉक्टर से मिलें।" :
            "For just cough, take honey-ginger. Don't smoke. See doctor if not better in 3 days.";
    }
    
    addBotMessage(advice);
}

function handleQuickAction(action) {
    switch(action) {
        case 'symptoms':
            const symptomsMsg = currentLanguage === 'hi' ? 
                "आपको कौन सा लक्षण है? बताएं:" :
                "What symptoms do you have? Please tell me:";
            addBotMessage(symptomsMsg, [
                currentLanguage === 'hi' ? 'बुखार' : 'Fever',
                currentLanguage === 'hi' ? 'खांसी' : 'Cough',
                currentLanguage === 'hi' ? 'सिरदर्द' : 'Headache',
                currentLanguage === 'hi' ? 'पेट दर्द' : 'Stomach Pain'
            ]);
            break;
            
        case 'appointment':
            handleAppointmentRequest();
            break;
            
        case 'emergency':
            showEmergencyModal();
            break;
            
        case 'education':
            showHealthEducation();
            break;
    }
}

function handleAppointmentRequest() {
    const msg = appData.conversations.appointments[currentLanguage];
    addBotMessage(msg, [
        currentLanguage === 'hi' ? 'केंद्र देखें' : 'View Centers',
        currentLanguage === 'hi' ? 'ASHA कार्यकर्ता से बात करें' : 'Talk to ASHA Worker'
    ]);
}

function showHealthEducation() {
    const tip = appData.conversations.healthTips[Math.floor(Math.random() * appData.conversations.healthTips.length)];
    
    const message = `
        <div class="health-tip-card">
            <div class="health-tip-title">${tip.title[currentLanguage]}</div>
            <div class="health-tip-content">${tip.content[currentLanguage]}</div>
        </div>
    `;
    
    addBotMessage(message);
    
    setTimeout(() => {
        const moreMsg = currentLanguage === 'hi' ? 
            "और कोई स्वास्थ्य जानकारी चाहिए?" :
            "Do you need more health information?";
        addBotMessage(moreMsg, [
            currentLanguage === 'hi' ? 'हाँ, और बताएं' : 'Yes, tell more',
            currentLanguage === 'hi' ? 'धन्यवाद' : 'Thank you'
        ]);
    }, 2000);
}

function showTypingIndicator() {
    if (isTyping) return;
    isTyping = true;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        scrollToBottom();
    }
}

function hideTypingIndicator() {
    isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function toggleVoiceRecording() {
    const voiceBtn = document.getElementById('voice-btn');
    
    if (voiceBtn.classList.contains('voice-recording')) {
        // Stop recording
        voiceBtn.classList.remove('voice-recording');
        voiceBtn.textContent = '🎤';
        
        // Simulate voice message
        setTimeout(() => {
            const voiceMsg = `
                <div class="audio-message">
                    <span class="audio-icon">🎵</span>
                    <div class="audio-waveform"></div>
                    <span class="audio-duration">0:03</span>
                </div>
            `;
            
            const messagesContainer = document.getElementById('messages-container');
            const messageDiv = createMessageElement('user', voiceMsg);
            messagesContainer.appendChild(messageDiv);
            scrollToBottom();
            
            // Bot responds to voice message
            setTimeout(() => {
                const response = currentLanguage === 'hi' ? 
                    "मैंने आपका voice message सुना। कृपया text में भी बता सकते हैं?" :
                    "I heard your voice message. Can you please also type it?";
                addBotMessage(response);
            }, 1000);
        }, 500);
        
    } else {
        // Start recording
        voiceBtn.classList.add('voice-recording');
        voiceBtn.textContent = '⏹️';
    }
}

function updateConnectionStatus(online) {
    const offlineIndicator = document.getElementById('offline-indicator');
    const statusText = document.getElementById('bot-status-text');
    
    if (offlineIndicator && statusText) {
        if (online) {
            offlineIndicator.classList.add('hidden');
            statusText.textContent = currentLanguage === 'hi' ? 'ऑनलाइन' : 'online';
        } else {
            offlineIndicator.classList.remove('hidden');
            statusText.textContent = currentLanguage === 'hi' ? 'ऑफलाइन' : 'offline';
        }
    }
}