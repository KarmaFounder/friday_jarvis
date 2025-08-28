const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI client
console.log('🔑 GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : 'UNDEFINED');
console.log('🔑 API Key Length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 'N/A');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Analyzes user prompt and extracts intent and entities using Gemini AI
 * @param {string} userPrompt - The user's natural language request
 * @returns {Promise<Object>} - Object containing intent and entities
 */
async function getIntentAndEntities(userPrompt) {
  try {
    const instructionPrompt = `You are an expert AI project manager that processes natural language requests into structured JSON commands for the Monday.com API. Your primary context is the "Paid Media CRM" board and its "AI agent operations" group.

**INTENTS:**
- "CREATE_AUTONOMOUS_PROJECT": For when a user wants you to ideate and create a full project plan with subtasks.
- "GET_STATUS_REPORT": For summarizing the status of all tasks in a group.
- "GET_WORKLOAD_REPORT": For summarizing who is assigned to what in a group.
- "UNKNOWN": If the request is unclear.

**TEAM ROLES & ASSIGNMENT LOGIC:**
- **Nakai Williams** is a **Paid Media Specialist**. Assign marketing strategy, ad creative, analytics, and reporting tasks to him.
- **Elton Matanda** is a **Software Developer**. Assign technical implementation, API integration, coding, and backend tasks to him.

**ENTITY EXTRACTION & GENERATION RULES:**

1.  **For "CREATE_AUTONOMOUS_PROJECT":**
    * The user will provide a high-level \`taskName\`, a main \`deadline\`, and a list of \`assigneeNames\`.
    * You MUST autonomously generate:
        * \`projectLead\`: Choose the most suitable person from assigneeNames to oversee the entire project.
        * \`mainTaskBrief\`: A 2-4 sentence structured brief for the overall project, formatted as numbered points (1. 2. 3.) providing clear goals, strategy, and success metrics.
        * \`subtasks\`: A list of required subtasks to complete the main task.
    * For each generated subtask, you MUST create:
        * \`subtaskName\`: A clear, actionable title.
        * \`brief\`: A 2-4 sentence structured brief formatted as numbered points (1. 2.) providing clear objectives and actionable guidance.
        * \`assigneeName\`: Assign the subtask to the most appropriate person from the user's list based on their defined role. Distribute the work logically.
        * \`status\`: The initial status for the subtask. Default to "Briefed In".
        * \`deadline\`: A logical deadline for the subtask that allows the main project deadline to be met. Sequence the deadlines correctly.

2.  **For Reporting Intents:**
    * \`groupName\`: The name of the group to report on. Default to "AI agent operations".

**EXAMPLE (CREATE_AUTONOMOUS_PROJECT):**
* **User Prompt:** "We need to launch a 'New Product Hunt Campaign'. The main deadline is Sep 15. The team is Nakai Williams and Elton Matanda."
* **Your JSON Output:**
\`\`\`json
{
  "intent": "CREATE_AUTONOMOUS_PROJECT",
  "entities": {
    "taskName": "New Product Hunt Campaign",
    "groupName": "AI agent operations",
    "projectLead": "Nakai Williams",
    "mainTaskBrief": "1. This project's goal is to achieve a top 5 ranking on Product Hunt for maximum visibility. 2. We will focus on pre-launch community engagement and compelling visual presentation. 3. Success will be measured by upvotes, new user sign-ups, and social media engagement metrics.",
    "deadline": "September 15",
    "subtasks": [
      {
        "subtaskName": "Draft Campaign Messaging & Value Props",
        "brief": "1. Create compelling copy and key messages for the Product Hunt launch page to attract upvotes. 2. Focus on highlighting unique value propositions that differentiate our product from competitors.",
        "assigneeName": "Nakai Williams",
        "status": "Briefed In",
        "deadline": "September 1"
      },
      {
        "subtaskName": "Integrate Product Hunt API for Real-time Stats",
        "brief": "1. Develop a script to pull live upvote and comment data into our internal dashboard. 2. Ensure the integration updates every 5 minutes to provide actionable real-time insights for campaign optimization.",
        "assigneeName": "Elton Matanda",
        "status": "Briefed In",
        "deadline": "September 5"
      },
      {
        "subtaskName": "Design Launch Graphics & Video",
        "brief": "1. Produce high-quality visual assets for the launch page to capture user attention and drive engagement. 2. Prioritize mobile-first design since 70% of Product Hunt traffic comes from mobile devices.",
        "assigneeName": "Nakai Williams",
        "status": "Briefed In",
        "deadline": "September 8"
      }
    ]
  }
}
\`\`\`

Now, process the following user prompt: ${userPrompt}

RESPOND WITH ONLY THE JSON:`;

    console.log('🤖 Sending request to Gemini AI...');
    console.log('📤 User prompt being analyzed:', userPrompt);
    const result = await model.generateContent(instructionPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('📥 Raw Gemini response:', text);

    // Parse the JSON response from Gemini (handle markdown code blocks)
    try {
      // Remove markdown code block formatting if present
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsedResponse = JSON.parse(cleanedText);
      console.log('✅ Parsed intent and entities:', parsedResponse);
      return parsedResponse;
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON:', parseError);
      console.error('❌ Raw text was:', text);
      // Return unknown intent if parsing fails
      return {
        intent: 'UNKNOWN',
        entities: {}
      };
    }

  } catch (error) {
    console.error('❌ Error calling Gemini AI:', error);
    throw error;
  }
}

/**
 * Generates update content for a specific topic using Gemini AI
 * @param {string} topic - The topic to generate content about
 * @returns {Promise<string>} - Generated update content
 */
async function generateUpdateContent(topic) {
  try {
    const prompt = `Write a brief, professional update with a few key steps about the following topic: ${topic}`;
    
    console.log('📝 Generating update content for topic:', topic);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('✅ Generated update content:', text);
    return text;
  } catch (error) {
    console.error('❌ Error generating update content:', error);
    // Fallback content
    return `This project focuses on ${topic}. We will follow industry best practices and ensure high-quality deliverables. The project timeline and milestones will be tracked carefully.`;
  }
}

/**
 * Creates subtasks from update text using Gemini AI
 * @param {string} updateText - The update text to parse into subtasks
 * @param {number} subtaskCount - Number of subtasks to create (default: 3)
 * @returns {Promise<Array<string>>} - Array of subtask names
 */
async function createSubtasksFromUpdate(updateText, subtaskCount = 3) {
  try {
    const prompt = `From the following text, extract ${subtaskCount} actionable steps that can be turned into subtasks. Return a JSON array of strings. Text: ${updateText}`;
    
    console.log('🔗 Creating', subtaskCount, 'subtasks from update text');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Remove markdown code block formatting if present
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const subtasks = JSON.parse(text);
    console.log('✅ Generated subtasks:', subtasks);
    
    // Ensure we have an array and limit to requested count
    if (Array.isArray(subtasks)) {
      return subtasks.slice(0, subtaskCount);
    } else {
      throw new Error('Expected array of subtasks');
    }
  } catch (error) {
    console.error('❌ Error creating subtasks from update:', error);
    // Fallback subtasks based on count
    const fallbackTasks = [
      'Research and planning',
      'Implementation phase',
      'Review and finalization',
      'Testing and validation',
      'Documentation and delivery',
      'Quality assurance',
      'Stakeholder approval'
    ];
    return fallbackTasks.slice(0, subtaskCount);
  }
}

/**
 * Generates content for specific topics using Gemini AI
 * @param {string} topic - The topic to generate content about
 * @param {string} type - Type of content ('update' or 'subtasks')
 * @param {number} count - Number of items for subtasks
 * @returns {Promise<string|Array>} - Generated content
 */
async function generateContent(topic, type = 'update', count = 3) {
  try {
    let prompt;
    
    if (type === 'update') {
      prompt = `Generate a professional project update about "${topic}". The update should be 2-3 sentences describing the key steps or phases involved. Make it sound like a project brief that outlines the main workflow. Do not use markdown formatting, just plain text.`;
    } else if (type === 'subtasks') {
      prompt = `Generate ${count} specific subtask names for a project about "${topic}". Each subtask should be:
- A clear, actionable task name (2-6 words)
- Related to different phases of ${topic}
- Professional and specific

Return only the task names, one per line, no numbers or bullets. Example format:
Research requirements
Design architecture
Implement solution`;
    }

    console.log('🎯 Generating content for topic:', topic, 'type:', type);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    if (type === 'subtasks') {
      // Split into array and clean up
      return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, count); // Ensure we only get the requested count
    }
    
    return text;
  } catch (error) {
    console.error('❌ Error generating content:', error);
    // Fallback content
    if (type === 'update') {
      return `This project focuses on ${topic}. We will follow industry best practices and ensure high-quality deliverables. The project timeline and milestones will be tracked carefully.`;
    } else {
      const fallbackTasks = [
        'Research and planning',
        'Design and architecture',
        'Implementation',
        'Testing and validation',
        'Documentation'
      ];
      return fallbackTasks.slice(0, count);
    }
  }
}

module.exports = {
  getIntentAndEntities,
  generateUpdateContent,
  createSubtasksFromUpdate,
  generateContent
};
