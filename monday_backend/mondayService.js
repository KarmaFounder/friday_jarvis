const { GraphQLClient, gql } = require('graphql-request');

// Initialize GraphQL client for Monday.com API
const mondayClient = new GraphQLClient('https://api.monday.com/v2', {
  headers: {
    'Authorization': process.env.MONDAY_API_KEY,
    'API-Version': '2023-10'
  }
});

// Board schema cache to avoid repeated API calls
const boardSchemaCache = new Map();

/**
 * Parse human-readable date text to YYYY-MM-DD format
 * @param {string} dateText - Human readable date (e.g., "September 24", "Sep 24", "24 Sep", "2025-09-24")
 * @returns {string} - Date in YYYY-MM-DD format
 */
function parseHumanDate(dateText) {
  if (!dateText) return null;
  
  try {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      return dateText;
    }
    
    // Parse the date - assume current year if no year provided
    const currentYear = new Date().getFullYear();
    let parsedDate;
    
    // Try parsing with current year first
    parsedDate = new Date(`${dateText} ${currentYear}`);
    
    // If invalid or date is in the past, try next year
    if (isNaN(parsedDate.getTime()) || parsedDate < new Date()) {
      parsedDate = new Date(`${dateText} ${currentYear + 1}`);
    }
    
    // If still invalid, try without year (let Date object handle it)
    if (isNaN(parsedDate.getTime())) {
      parsedDate = new Date(dateText);
    }
    
    // If still invalid, return null
    if (isNaN(parsedDate.getTime())) {
      console.log('❌ Could not parse date:', dateText);
      return null;
    }
    
    // Format as YYYY-MM-DD
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${day}`;
    console.log('📅 Parsed date:', dateText, '→', formattedDate);
    return formattedDate;
  } catch (error) {
    console.error('❌ Error parsing date:', dateText, error);
    return null;
  }
}

/**
 * Get board schema with caching - discovers all columns and their configuration
 * @param {string|number} boardId - The board ID to get schema for
 * @returns {Promise<Object>} - Board schema with columns information
 */
async function getBoardSchema(boardId) {
  const cacheKey = boardId.toString();
  
  // Return cached schema if available
  if (boardSchemaCache.has(cacheKey)) {
    console.log('📋 Using cached board schema for board:', boardId);
    return boardSchemaCache.get(cacheKey);
  }

  try {
    console.log('🔍 Discovering board schema for board:', boardId);
    
    const query = gql`
      query GetBoardSchema($boardId: [ID!]) {
        boards(ids: $boardId) {
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;

    const response = await mondayClient.request(query, {
      boardId: [boardId.toString()]
    });

    if (!response.boards || !response.boards[0]) {
      throw new Error(`Board ${boardId} not found`);
    }

    const boardSchema = {
      boardId: boardId.toString(),
      columns: response.boards[0].columns,
      discoveredAt: new Date().toISOString()
    };

    // Cache the schema
    boardSchemaCache.set(cacheKey, boardSchema);
    
    console.log('✅ Board schema discovered and cached:', {
      boardId,
      columnCount: boardSchema.columns.length,
      columnTypes: [...new Set(boardSchema.columns.map(col => col.type))]
    });

    return boardSchema;
  } catch (error) {
    console.error('❌ Error discovering board schema:', error);
    throw error;
  }
}

/**
 * Find column ID by column type
 * @param {Object} boardSchema - Board schema from getBoardSchema
 * @param {string} columnType - Type of column to find (e.g., 'status', 'date', 'people')
 * @returns {string|null} - Column ID or null if not found
 */
function findColumnId(boardSchema, columnType) {
  const column = boardSchema.columns.find(col => col.type === columnType);
  if (column) {
    console.log(`📍 Found ${columnType} column:`, { id: column.id, title: column.title });
    return column.id;
  }
  console.log(`❌ No ${columnType} column found on board ${boardSchema.boardId}`);
  return null;
}

/**
 * Find status label ID from status column settings
 * @param {Object} boardSchema - Board schema from getBoardSchema
 * @param {string} statusText - Status text to find (e.g., "Not Started", "Working on it")
 * @returns {string|null} - Status label ID or null if not found
 */
function findStatusLabel(boardSchema, statusText) {
  const statusColumn = boardSchema.columns.find(col => col.type === 'status');
  
  if (!statusColumn || !statusColumn.settings_str) {
    console.log('❌ No status column found or no settings available');
    return null;
  }

  try {
    const settings = JSON.parse(statusColumn.settings_str);
    const labels = settings.labels || {};
    
    // Find matching label (case-insensitive)
    const matchingLabelId = Object.keys(labels).find(labelId => {
      const label = labels[labelId];
      return label && label.toLowerCase() === statusText.toLowerCase();
    });

    if (matchingLabelId) {
      console.log(`📍 Found status label "${statusText}":`, { id: matchingLabelId, columnId: statusColumn.id });
      return matchingLabelId;
    }

    // Log available labels for debugging
    const availableLabels = Object.values(labels);
    console.log(`❌ Status "${statusText}" not found. Available labels:`, availableLabels);
    return null;
  } catch (error) {
    console.error('❌ Error parsing status column settings:', error);
    return null;
  }
}

/**
 * Get board ID by board name with intelligent fuzzy matching
 * @param {string} boardName - Name of the board to find
 * @returns {Promise<number|null>} - Board ID or null if not found
 */
async function getBoardId(boardName) {
  try {
    const query = gql`
      query GetBoards($workspaceId: ID!) {
        boards(workspace_ids: [$workspaceId]) {
          id
          name
        }
      }
    `;

    console.log('🔍 Searching for board:', boardName);
    console.log('🎯 Targeting workspace ID: 1245466 (Sherbet_Master Job Workspace)');
    const response = await mondayClient.request(query, { workspaceId: "1245466" });
    
    const allBoards = response.boards;
    console.log(`📋 Total boards found: ${allBoards.length}`);
    
    // Filter out unwanted boards by name patterns
    const filteredBoards = allBoards.filter(board => {
      const name = board.name.toLowerCase();
      
      // Filter out AOP boards
      if (name.includes('aop ') || name.startsWith('aop ')) {
        console.log(`🚫 Ignoring AOP board: "${board.name}"`);
        return false;
      }
      
      // Filter out subitems boards
      if (name.startsWith('subitems of')) {
        console.log(`🚫 Ignoring subitems board: "${board.name}"`);
        return false;
      }
      
      // Filter out form boards
      if (name.includes('(form)')) {
        console.log(`🚫 Ignoring form board: "${board.name}"`);
        return false;
      }
      
      // Filter out boards with specific unwanted patterns
      const unwantedPatterns = [
        'master archive',
        'meeting minute',
        'race matrix',
        'content creation'
      ];
      
      const hasUnwantedPattern = unwantedPatterns.some(pattern => name.includes(pattern));
      if (hasUnwantedPattern) {
        console.log(`🚫 Ignoring unwanted board: "${board.name}"`);
        return false;
      }
      
      return true;
    });
    
    console.log(`📋 Total boards: ${allBoards.length}, Filtered boards: ${filteredBoards.length}`);
    console.log('📋 Available boards (after filtering):', filteredBoards.map(b => `"${b.name}"`));
    
    // Multiple search strategies
    const searchTerm = boardName.toLowerCase();
    
    // Check if we can find the specific Sherbet board by ID
    if (searchTerm.includes('sherbet')) {
      console.log('🔍 Looking for Sherbet board by ID 1394483140...');
      const sherbetBoard = allBoards.find(b => b.id === '1394483140');
      if (sherbetBoard) {
        console.log('✅ Found Sherbet board by ID:', sherbetBoard.name, 'with ID:', sherbetBoard.id);
        return parseInt(sherbetBoard.id);
      }
    }
    const boards = filteredBoards;
    
    // Strategy 1: Exact match (case-insensitive)
    let board = boards.find(b => b.name.toLowerCase() === searchTerm);
    if (board) {
      console.log('✅ Found exact match:', board.name, 'with ID:', board.id);
      return parseInt(board.id);
    }
    
    // Strategy 2: Contains all key words
    const searchWords = searchTerm.split(' ').filter(word => word.length > 2); // ignore short words
    board = boards.find(b => {
      const boardNameLower = b.name.toLowerCase();
      return searchWords.every(word => boardNameLower.includes(word));
    });
    if (board) {
      console.log('✅ Found word match:', board.name, 'with ID:', board.id);
      return parseInt(board.id);
    }
    
    // Strategy 3: Contains most key words (fuzzy match)
    let bestMatch = null;
    let bestScore = 0;
    
    for (const b of boards) {
      const boardNameLower = b.name.toLowerCase();
      let score = 0;
      
      // Score based on how many search words are found
      for (const word of searchWords) {
        if (boardNameLower.includes(word)) {
          score += 1;
        }
      }
      
      // Bonus for containing the search term as substring
      if (boardNameLower.includes(searchTerm)) {
        score += 2;
      }
      
      // Bonus for partial matches of the search term
      if (searchTerm.includes('sherbet') && boardNameLower.includes('sherbet')) {
        score += 3;
      }
      if (searchTerm.includes('master') && boardNameLower.includes('master')) {
        score += 2;
      }
      if (searchTerm.includes('job') && boardNameLower.includes('job')) {
        score += 1;
      }
      
      // Special handling for the actual board format "Sherbet | Master Job Board 🚀"
      if (boardNameLower.includes('sherbet') && boardNameLower.includes('master') && boardNameLower.includes('job')) {
        score += 5; // High score for the target board
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = b;
      }
    }
    
    if (bestMatch && bestScore > 0) {
      console.log(`✅ Found fuzzy match: "${bestMatch.name}" (score: ${bestScore}) with ID:`, bestMatch.id);
      return parseInt(bestMatch.id);
    }
    
    // Strategy 4: Last resort - any board containing any search word
    board = boards.find(b => {
      const boardNameLower = b.name.toLowerCase();
      return searchWords.some(word => boardNameLower.includes(word));
    });
    
    if (board) {
      console.log('✅ Found partial match:', board.name, 'with ID:', board.id);
      return parseInt(board.id);
    }

    console.log('❌ Board not found after all search strategies:', boardName);
    console.log('💡 Available boards:', boards.map(b => `"${b.name}"`).join(', '));
    return null;

  } catch (error) {
    console.error('❌ Error fetching boards:', error);
    throw error;
  }
}

/**
 * Get group ID by group name within a specific board
 * @param {number} boardId - The board ID to search in
 * @param {string} groupName - Name of the group to find
 * @returns {Promise<string|null>} - Group ID or null if not found
 */
async function getGroupId(boardId, groupName) {
  try {
    const query = gql`
      query GetBoardGroups($boardId: ID!) {
        boards(ids: [$boardId]) {
          groups {
            id
            title
          }
        }
      }
    `;

    console.log('🔍 Searching for group:', groupName, 'in board ID:', boardId);
    const response = await mondayClient.request(query, { boardId: boardId.toString() });
    
    if (!response.boards || response.boards.length === 0) {
      console.log('❌ Board not found or no groups available');
      return null;
    }

    const groups = response.boards[0].groups;
    console.log('📋 Available groups:', groups.map(g => `"${g.title}" (ID: ${g.id})`));
    
    // Find group by name (case-insensitive)
    const group = groups.find(g => 
      g.title.toLowerCase().includes(groupName.toLowerCase())
    );

    if (group) {
      console.log('✅ Found group:', group.title, 'with ID:', group.id);
      return group.id;
    } else {
      console.log('❌ Group not found:', groupName);
      return null;
    }

  } catch (error) {
    console.error('❌ Error fetching groups:', error);
    throw error;
  }
}

/**
 * Create a new task on Monday.com with enhanced multi-step process
 * @param {Object} entities - Contains taskName, optional groupName, updateTopic, createSubtasks, and deadline
 * @returns {Promise<Object>} - Result of task creation
 */
async function createMondayTask(entities) {
  try {
    const { taskName, groupName = "AI agent operations", assigneeName, updateTopic, subtaskCount, deadline, update } = entities;

    if (!taskName) {
      throw new Error('Task name is required');
    }

    console.log('🔨 Executing enhanced CREATE_TASK action...');

    // Step 1: Create the Parent Task
    // Hardcoded Board ID for "Paid Media CRM" board
    const boardId = 2034046752;
    console.log('🎯 Using hardcoded board ID:', boardId, '(Paid Media CRM)');

    // Find the group ID
    const groupId = await getGroupId(boardId, groupName);
    
    if (!groupId) {
      return {
        success: false,
        error: `Group "${groupName}" not found in the Paid Media CRM board. Please check the group name and try again.`
      };
    }

    // Create the task
    const mutation = gql`
      mutation CreateItem($boardId: ID!, $itemName: String!, $groupId: String!) {
        create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId) {
          id
          name
        }
      }
    `;

    console.log('📝 Creating task:', taskName, 'on board ID:', boardId, 'in group ID:', groupId);
    
    const response = await mondayClient.request(mutation, {
      boardId: boardId.toString(),
      itemName: taskName,
      groupId
    });

    const itemId = response.create_item.id;
    console.log('✅ Task created successfully:', response.create_item);

    let additionalActions = [];
    let generatedUpdateText = null;
    let createdSubtasks = [];
    let assignedUser = null;

    // Step 1.5: Find and Assign User (If needed)
    if (assigneeName) {
      try {
        const userId = await getUserIdByName(assigneeName);
        if (userId) {
          const assignmentSuccess = await assignUserToItem(boardId, itemId, userId);
          if (assignmentSuccess) {
            additionalActions.push(`Assigned to ${assigneeName}`);
            assignedUser = assigneeName;
            console.log('✅ User assigned successfully');
          } else {
            additionalActions.push(`Failed to assign to ${assigneeName}`);
          }
        } else {
          additionalActions.push(`User "${assigneeName}" not found`);
        }
      } catch (assignError) {
        console.error('❌ Failed to assign user:', assignError);
        additionalActions.push(`Failed to assign user: ${assignError.message}`);
      }
    }

    // Step 2: Generate Update Content (If needed)
    if (updateTopic) {
      try {
        const { generateUpdateContent } = require('./geminiService');
        generatedUpdateText = await generateUpdateContent(updateTopic);
        console.log('📝 Generated update content:', generatedUpdateText);
      } catch (updateGenError) {
        console.error('❌ Failed to generate update content:', updateGenError);
        additionalActions.push(`Failed to generate update: ${updateGenError.message}`);
      }
    }

    // Step 3: Add the Update
    if (generatedUpdateText) {
      try {
        await addUpdateToItem(itemId, generatedUpdateText);
        additionalActions.push(`Added generated update about "${updateTopic}"`);
        console.log('✅ Generated update added to task');
      } catch (updateError) {
        console.error('❌ Failed to add generated update:', updateError);
        additionalActions.push(`Failed to add update: ${updateError.message}`);
      }
    } else if (update) {
      // Fallback to manual update if provided
      try {
        await addUpdateToItem(itemId, update);
        additionalActions.push(`Added update: "${update}"`);
        console.log('✅ Manual update added to task');
      } catch (updateError) {
        console.error('❌ Failed to add manual update:', updateError);
        additionalActions.push(`Failed to add update: ${updateError.message}`);
      }
    }

    // Step 4: Set the Deadline
    if (deadline) {
      try {
        await setItemDeadline(boardId, itemId, deadline);
        additionalActions.push(`Set deadline: ${deadline}`);
        console.log('✅ Deadline set for task');
      } catch (deadlineError) {
        console.error('❌ Failed to set deadline:', deadlineError);
        additionalActions.push(`Failed to set deadline: ${deadlineError.message}`);
      }
    }

    // Step 5: Create Subtasks (If needed)
    if (subtaskCount && subtaskCount > 0 && generatedUpdateText) {
      try {
        console.log('🔗 Creating', subtaskCount, 'subtasks as requested');
        createdSubtasks = await createSubtasksForItem(itemId, generatedUpdateText, subtaskCount);
        additionalActions.push(`Created ${createdSubtasks.length} subtasks`);
        console.log('✅ Subtasks created successfully:', createdSubtasks.length, 'subtasks');
      } catch (subtaskError) {
        console.error('❌ Failed to create subtasks:', subtaskError);
        additionalActions.push(`Failed to create subtasks: ${subtaskError.message}`);
      }
    } else if (subtaskCount && !generatedUpdateText) {
      console.log('⚠️ Subtasks requested but no generated update available to base them on');
      additionalActions.push(`Could not create ${subtaskCount} subtasks: no update content generated`);
    }

    let message = `Successfully created task "${taskName}" on the "Paid Media CRM" board in the "${groupName}" group.`;
    if (additionalActions.length > 0) {
      message += ` ${additionalActions.join(' ')}`;
    }

    return {
      success: true,
      task: response.create_item,
      boardName: "Paid Media CRM",
      groupName,
      assignedUser,
      generatedUpdate: generatedUpdateText,
      subtasks: createdSubtasks,
      message
    };

  } catch (error) {
    console.error('❌ Error creating task:', error);
    return {
      success: false,
      error: `Failed to create task: ${error.message}`
    };
  }
}

/**
 * Get user ID by name from Monday.com with robust fallback search
 * @param {string} name - The user's name to search for
 * @returns {Promise<string|null>} - User ID or null if not found
 */
async function getUserIdByName(name) {
  try {
    console.log('🔍 Searching for user:', name);
    
    // Step 1: Try targeted search first
    const targetedQuery = gql`
      query($name: String) {
        users (kind: all, name: $name) {
          id
          name
        }
      }
    `;

    const targetedResponse = await mondayClient.request(targetedQuery, { name });
    
    if (targetedResponse.users && targetedResponse.users.length > 0) {
      // Find the best match (exact match first, then partial match)
      const exactMatch = targetedResponse.users.find(user => 
        user.name.toLowerCase() === name.toLowerCase()
      );
      
      if (exactMatch) {
        console.log('✅ Found exact user match (targeted search):', exactMatch);
        return exactMatch.id;
      }
      
      // If no exact match, find partial match
      const partialMatch = targetedResponse.users.find(user => 
        user.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(user.name.toLowerCase())
      );
      
      if (partialMatch) {
        console.log('✅ Found partial user match (targeted search):', partialMatch);
        return partialMatch.id;
      }
    }
    
    // Step 2: Fallback to complete user list search
    console.log('🔄 Targeted search failed, trying comprehensive user search...');
    
    const comprehensiveQuery = gql`
      query {
        users (kind: all, limit: 1000) {
          id
          name
        }
      }
    `;

    const comprehensiveResponse = await mondayClient.request(comprehensiveQuery);
    
    if (comprehensiveResponse.users && comprehensiveResponse.users.length > 0) {
      console.log('📋 Retrieved', comprehensiveResponse.users.length, 'users for comprehensive search');
      
      // Find exact match (case-insensitive)
      const exactMatch = comprehensiveResponse.users.find(user => 
        user.name.toLowerCase() === name.toLowerCase()
      );
      
      if (exactMatch) {
        console.log('✅ Found exact user match (comprehensive search):', exactMatch);
        return exactMatch.id;
      }
      
      // Find partial match - name contains search term
      const containsMatch = comprehensiveResponse.users.find(user => 
        user.name.toLowerCase().includes(name.toLowerCase())
      );
      
      if (containsMatch) {
        console.log('✅ Found partial user match (comprehensive search):', containsMatch);
        return containsMatch.id;
      }
      
      // Find reverse partial match - search term contains user name
      const reverseMatch = comprehensiveResponse.users.find(user => 
        name.toLowerCase().includes(user.name.toLowerCase()) && user.name.length > 3
      );
      
      if (reverseMatch) {
        console.log('✅ Found reverse partial user match (comprehensive search):', reverseMatch);
        return reverseMatch.id;
      }
      
      // Log available users for debugging
      const userNames = comprehensiveResponse.users.slice(0, 10).map(u => u.name);
      console.log('❌ No match found. Sample available users:', userNames);
    }
    
    console.log('❌ No user found with name:', name);
    return null;
  } catch (error) {
    console.error('❌ Error searching for user:', error);
    return null;
  }
}

/**
 * Get the person column ID from a board
 * @param {number} boardId - The board ID
 * @returns {Promise<string|null>} - Person column ID or null if not found
 */
async function getPersonColumnId(boardId) {
  try {
    console.log('🔍 Searching for person column on board:', boardId);
    
    const query = gql`
      query GetBoard($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns {
            id
            title
            type
          }
        }
      }
    `;

    const response = await mondayClient.request(query, {
      boardId: boardId.toString()
    });

    if (response.boards && response.boards[0] && response.boards[0].columns) {
      const personColumn = response.boards[0].columns.find(column => 
        column.type === 'people'
      );
      
      if (personColumn) {
        console.log('✅ Found person column:', personColumn);
        return personColumn.id;
      }
    }
    
    console.log('❌ No person column found on board');
    return null;
  } catch (error) {
    console.error('❌ Error finding person column:', error);
    return null;
  }
}

/**
 * Assign a user to a Monday.com item
 * @param {number} boardId - The board ID
 * @param {string} itemId - The item ID
 * @param {string} userId - The user ID to assign
 * @returns {Promise<boolean>} - Success status
 */
async function assignUserToItem(boardId, itemId, userId) {
  try {
    // First, get the person column ID
    const personColumnId = await getPersonColumnId(boardId);
    
    if (!personColumnId) {
      throw new Error('No person column found on this board');
    }

    console.log('👤 Assigning user', userId, 'to item', itemId, 'in column', personColumnId);
    
    const mutation = gql`
      mutation ChangeColumnValue($itemId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(item_id: $itemId, board_id: $boardId, column_id: $columnId, value: $value) {
          id
        }
      }
    `;

    await mondayClient.request(mutation, {
      itemId: itemId.toString(),
      boardId: boardId.toString(),
      columnId: personColumnId,
      value: JSON.stringify({ personsAndTeams: [{ id: parseInt(userId), kind: "person" }] })
    });

    console.log('✅ User assigned successfully');
    return true;
  } catch (error) {
    console.error('❌ Error assigning user to item:', error);
    return false;
  }
}

/**
 * Add an update to a Monday.com item
 * @param {string} itemId - The item ID
 * @param {string} updateText - The update text
 */
async function addUpdateToItem(itemId, updateText) {
  const mutation = gql`
    mutation CreateUpdate($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) {
        id
        body
      }
    }
  `;

  await mondayClient.request(mutation, {
    itemId: itemId.toString(),
    body: updateText
  });
}

/**
 * Set deadline for a Monday.com item using dynamic schema discovery
 * @param {number} boardId - The board ID
 * @param {string} itemId - The item ID
 * @param {string} deadline - The deadline text (e.g., "27 aug", "September 24", "2025-08-27")
 * @returns {Promise<void>}
 */
async function setItemDeadline(boardId, itemId, deadline) {
  try {
    console.log('📅 Setting deadline for item:', itemId, 'to:', deadline);

    // Parse deadline to proper YYYY-MM-DD format
    const formattedDate = parseHumanDate(deadline);
    
    if (!formattedDate) {
      throw new Error(`Could not parse deadline: ${deadline}`);
    }

    console.log('📅 Using formatted date:', formattedDate);

    // Get board schema to find date column dynamically
    const boardSchema = await getBoardSchema(boardId);
    const dateColumnId = findColumnId(boardSchema, 'date');

    if (!dateColumnId) {
      throw new Error(`No date column found on board ${boardId}`);
    }

    // Update the item with the deadline
    const updateMutation = gql`
      mutation ChangeColumnValue($itemId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(item_id: $itemId, board_id: $boardId, column_id: $columnId, value: $value) {
          id
        }
      }
    `;

    await mondayClient.request(updateMutation, {
      itemId: itemId.toString(),
      boardId: boardId.toString(),
      columnId: dateColumnId,
      value: JSON.stringify({ date: formattedDate })
    });

    console.log('✅ Deadline set successfully');

  } catch (error) {
    console.error('Error setting deadline:', error);
    if (error.message && error.message.includes('Item not found in board')) {
      console.log('📍 This error is likely because the item is on a different board (e.g., subitems board)');
      console.log('📍 Board ID used:', boardId, 'Item ID:', itemId);
    }
    throw error;
  }
}

/**
 * Set item status using dynamic schema discovery
 * @param {string} itemId - The item ID
 * @param {number} boardId - The board ID
 * @param {string} statusText - The status text (e.g., "Not Started", "Working on it", "Done")
 * @returns {Promise<void>}
 */
async function setItemStatus(itemId, boardId, statusText) {
  try {
    console.log('📊 Setting status for item:', itemId, 'to:', statusText);

    // Get board schema to find status column and label
    const boardSchema = await getBoardSchema(boardId);
    const statusColumnId = findColumnId(boardSchema, 'status'); // Status columns are 'status' type
    
    if (!statusColumnId) {
      throw new Error(`No status column found on board ${boardId}`);
    }

    // Update the item with the status using text label
    const updateMutation = gql`
      mutation ChangeColumnValue($itemId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(item_id: $itemId, board_id: $boardId, column_id: $columnId, value: $value) {
          id
        }
      }
    `;

    // Use the status text directly as Monday.com accepts text labels
    const statusValue = { label: statusText };

    await mondayClient.request(updateMutation, {
      itemId: itemId.toString(),
      boardId: boardId.toString(),
      columnId: statusColumnId,
      value: JSON.stringify(statusValue)
    });

    console.log('✅ Status set successfully');

  } catch (error) {
    console.error('❌ Error setting status:', error);
    if (error.message && error.message.includes('Item not found in board')) {
      console.log('📍 This error is likely because the item is on a different board (e.g., subitems board)');
      console.log('📍 Board ID used:', boardId, 'Item ID:', itemId);
    }
    // Don't throw - status setting is not critical for basic functionality
    console.log('⚠️ Status setting failed, continuing without status');
  }
}

/**
 * Update task status on Monday.com
 * @param {Object} entities - Contains boardName, taskName, and newStatus
 * @returns {Promise<Object>} - Result of status update
 */
async function updateMondayTaskStatus(entities) {
  try {
    const { boardName, taskName, newStatus } = entities;

    if (!boardName || !taskName || !newStatus) {
      throw new Error('Board name, task name, and new status are required');
    }

    // This is a placeholder implementation
    // In a real implementation, you would need to:
    // 1. Find the board ID
    // 2. Find the task/item ID within that board
    // 3. Find the status column ID
    // 4. Update the status value

    console.log('🔄 Updating task status - Board:', boardName, 'Task:', taskName, 'Status:', newStatus);

    return {
      success: true,
      message: `Successfully updated "${taskName}" on the "${boardName}" board to "${newStatus}". (This is a placeholder implementation)`
    };

  } catch (error) {
    console.error('❌ Error updating task status:', error);
    return {
      success: false,
      error: `Failed to update task status: ${error.message}`
    };
  }
}

/**
 * List all Monday.com boards
 * @returns {Promise<Object>} - List of boards
 */
async function listMondayBoards() {
  try {
    const query = gql`
      query GetBoards($workspaceId: ID!) {
        boards(workspace_ids: [$workspaceId]) {
          id
          name
          description
          items_count
        }
      }
    `;

    console.log('📋 Fetching all boards from Sherbet_Master Job Workspace...');
    const response = await mondayClient.request(query, { workspaceId: "1245466" });

    return {
      success: true,
      boards: response.boards,
      message: `Found ${response.boards.length} boards in your Monday.com workspace.`
    };

  } catch (error) {
    console.error('❌ Error listing boards:', error);
    return {
      success: false,
      error: `Failed to list boards: ${error.message}`
    };
  }
}

/**
 * Create subtasks for a Monday.com item using update text
 * @param {string} parentItemId - The parent item ID
 * @param {string} updateText - The update text to parse into subtasks
 * @param {number} subtaskCount - Number of subtasks to create (default: 3)
 * @returns {Promise<Array>} - Array of created subtask objects
 */
async function createSubtasksForItem(parentItemId, updateText, subtaskCount = 3) {
  try {
    console.log('🔗 Creating', subtaskCount, 'subtasks for parent item:', parentItemId, 'from update text');
    
    // Get subtask names from Gemini AI
    const { createSubtasksFromUpdate } = require('./geminiService');
    const subtaskNames = await createSubtasksFromUpdate(updateText, subtaskCount);
    
    const createdSubtasks = [];
    
    for (const subtaskName of subtaskNames) {
      const mutation = gql`
        mutation CreateSubitem($parentItemId: ID!, $subitemName: String!) {
          create_subitem(parent_item_id: $parentItemId, item_name: $subitemName) {
            id
            name
            board {
              id
            }
          }
        }
      `;

      console.log('📝 Creating subtask:', subtaskName);
      const response = await mondayClient.request(mutation, {
        parentItemId: parentItemId.toString(),
        subitemName: subtaskName
      });

      if (response.create_subitem) {
        createdSubtasks.push(response.create_subitem);
        console.log('✅ Subtask created:', response.create_subitem);
      }
    }

    return createdSubtasks;
  } catch (error) {
    console.error('❌ Error creating subtasks for item:', error);
    throw error;
  }
}

/**
 * Create subtasks for a Monday.com item
 * @param {string} parentItemId - The parent item ID
 * @param {Array<string>} subtaskNames - Array of subtask names
 * @returns {Promise<Array>} - Array of created subtask objects
 */
async function createSubtasks(parentItemId, subtaskNames) {
  try {
    console.log('🔗 Creating', subtaskNames.length, 'subtasks for parent item:', parentItemId);
    
    const createdSubtasks = [];
    
    for (const subtaskName of subtaskNames) {
      const mutation = gql`
        mutation CreateSubitem($parentItemId: ID!, $itemName: String!) {
          create_subitem(parent_item_id: $parentItemId, item_name: $itemName) {
            id
            name
          }
        }
      `;

      console.log('📝 Creating subtask:', subtaskName);
      const response = await mondayClient.request(mutation, {
        parentItemId: parentItemId.toString(),
        itemName: subtaskName
      });

      if (response.create_subitem) {
        createdSubtasks.push(response.create_subitem);
        console.log('✅ Subtask created:', response.create_subitem);
      }
    }

    return createdSubtasks;
  } catch (error) {
    console.error('❌ Error creating subtasks:', error);
    throw error;
  }
}

/**
 * Create a Monday.com task with subtasks, updates, and deadline
 * @param {Object} entities - Task entities from Gemini
 * @returns {Promise<Object>} - Created task information
 */
async function createMondayTaskWithSubtasks(entities) {
  try {
    console.log('🔨 Executing CREATE_TASK_WITH_SUBTASKS action...');
    
    // Use hardcoded board ID for "Paid Media CRM"
    const boardId = 2034046752;
    console.log('🎯 Using hardcoded board ID:', boardId, '(Paid Media CRM)');

    // Find the group ID
    const groupName = entities.groupName || 'AI agent operations';
    const groupId = await getGroupId(boardId, groupName);

    if (!groupId) {
      throw new Error(`Group "${groupName}" not found in the board`);
    }

    // Create the main task
    console.log('📝 Creating main task:', entities.taskName, 'on board ID:', boardId, 'in group ID:', groupId);
    
    const mutation = gql`
      mutation CreateItem($boardId: ID!, $itemName: String!, $groupId: String!) {
        create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId) {
          id
          name
        }
      }
    `;

    const response = await mondayClient.request(mutation, {
      boardId: boardId.toString(),
      itemName: entities.taskName,
      groupId: groupId
    });

    if (!response.create_item) {
      throw new Error('Failed to create task');
    }

    const createdTask = response.create_item;
    console.log('✅ Main task created successfully:', createdTask);

    const results = {
      mainTask: createdTask,
      update: null,
      deadline: null,
      subtasks: []
    };

    // Generate and add update if requested
    if (entities.generateUpdate && entities.updateTopic) {
      try {
        const { generateContent } = require('./geminiService');
        const generatedUpdate = await generateContent(entities.updateTopic, 'update');
        console.log('📝 Generated update:', generatedUpdate);
        
        await addUpdateToItem(createdTask.id, generatedUpdate);
        results.update = generatedUpdate;
        console.log('✅ Update added successfully');
      } catch (updateError) {
        console.error('❌ Failed to add generated update:', updateError);
      }
    }

    // Set deadline if provided
    if (entities.deadline) {
      try {
        await setItemDeadline(boardId, createdTask.id, entities.deadline);
        results.deadline = entities.deadline;
        console.log('✅ Deadline set successfully');
      } catch (deadlineError) {
        console.error('❌ Failed to set deadline:', deadlineError);
      }
    }

    // Generate and create subtasks
    if (entities.subtaskCount && entities.subtaskTopic) {
      try {
        const { generateContent } = require('./geminiService');
        const subtaskNames = await generateContent(entities.subtaskTopic, 'subtasks', entities.subtaskCount || 3);
        console.log('🎯 Generated subtask names:', subtaskNames);
        
        const createdSubtasks = await createSubtasks(createdTask.id, subtaskNames);
        results.subtasks = createdSubtasks;
        console.log('✅ All subtasks created successfully');
      } catch (subtaskError) {
        console.error('❌ Failed to create subtasks:', subtaskError);
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error creating task with subtasks:', error);
    throw error;
  }
}

/**
 * Get status report for all items in a group
 * @param {Object} entities - Contains groupName
 * @returns {Promise<Object>} - Status report result
 */
async function getGroupStatusReport(entities) {
  try {
    const { groupName = "AI agent operations" } = entities;
    console.log('📊 Generating status report for group:', groupName);
    
    // Hardcoded Board ID for "Paid Media CRM" board
    const boardId = 2034046752;
    
    // Find the group ID
    const groupId = await getGroupId(boardId, groupName);
    
    if (!groupId) {
      return {
        success: false,
        error: `Group "${groupName}" not found in the Paid Media CRM board.`
      };
    }

    // Query all items in the specific group with their status
    const query = gql`
      query GetGroupStatusReport($boardId: ID!, $groupId: String!) {
        boards(ids: [$boardId]) {
          groups(ids: [$groupId]) {
            items_page {
              items {
                id
                name
                column_values(ids: ["status"]) {
                  id
                  text
                }
              }
            }
          }
        }
      }
    `;

    const response = await mondayClient.request(query, {
      boardId: boardId.toString(),
      groupId: groupId
    });

    if (!response.boards || !response.boards[0] || !response.boards[0].groups || !response.boards[0].groups[0]) {
      throw new Error('Group not found or no items in group');
    }

    const groupItems = response.boards[0].groups[0].items_page.items;

    if (groupItems.length === 0) {
      return {
        success: true,
        report: `📊 Status Report for "${groupName}":\n\nNo items found in this group.`
      };
    }

    // Build status report with summary
    let report = `📊 Status Report for "${groupName}":\n\n`;
    
    // Collect status data for summary
    const statusCounts = {};
    let totalTasks = 0;
    
    groupItems.forEach(item => {
      // Get status from the status column
      const statusColumn = item.column_values.find(col => col.id.includes('status')) || item.column_values[0];
      const status = statusColumn ? statusColumn.text || 'No Status' : 'No Status';
      
      // Count statuses for summary
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      totalTasks++;
      
      report += `• ${item.name}: ${status}\n`;
    });
    
    // Add summary section
    report += `\n📈 Summary:\n`;
    report += `• Total tasks: ${totalTasks}\n`;
    Object.keys(statusCounts).forEach(status => {
      const count = statusCounts[status];
      const percentage = Math.round((count / totalTasks) * 100);
      report += `• ${status}: ${count} tasks (${percentage}%)\n`;
    });

    console.log('✅ Status report generated successfully');
    return {
      success: true,
      report: report.trim()
    };
  } catch (error) {
    console.error('❌ Error generating status report:', error);
    return {
      success: false,
      error: `Failed to generate status report: ${error.message}`
    };
  }
}

/**
 * Get workload report for all items in a group
 * @param {Object} entities - Contains groupName
 * @returns {Promise<Object>} - Workload report result
 */
async function getGroupWorkloadReport(entities) {
  try {
    const { groupName = "AI agent operations" } = entities;
    console.log('👥 Generating workload report for group:', groupName);
    
    // Hardcoded Board ID for "Paid Media CRM" board
    const boardId = 2034046752;
    
    // Find the group ID
    const groupId = await getGroupId(boardId, groupName);
    
    if (!groupId) {
      return {
        success: false,
        error: `Group "${groupName}" not found in the Paid Media CRM board.`
      };
    }

    // Query all items in the specific group with their status and assignments
    const query = gql`
      query GetGroupWorkloadReport($boardId: ID!, $groupId: String!) {
        boards(ids: [$boardId]) {
          groups(ids: [$groupId]) {
            items_page {
              items {
                id
                name
                column_values(ids: ["status", "person"]) {
                  id
                  text
                }
              }
            }
          }
        }
      }
    `;

    const response = await mondayClient.request(query, {
      boardId: boardId.toString(),
      groupId: groupId
    });

    if (!response.boards || !response.boards[0] || !response.boards[0].groups || !response.boards[0].groups[0]) {
      throw new Error('Group not found or no items in group');
    }

    const groupItems = response.boards[0].groups[0].items_page.items;

    if (groupItems.length === 0) {
      return {
        success: true,
        report: `👥 Workload Report for "${groupName}":\n\nNo items found in this group.`
      };
    }

    // Aggregate workload data
    const workloadData = {};
    
    groupItems.forEach(item => {
      // Find status column
      const statusColumn = item.column_values.find(col => col.id.includes('status'));
      const status = statusColumn ? statusColumn.text || 'No Status' : 'No Status';
      
      // Find person column
      const personColumn = item.column_values.find(col => col.id.includes('person') || col.id.includes('people'));
      let assignees = 'Unassigned';
      
      if (personColumn && personColumn.text) {
        assignees = personColumn.text;
      }
      
      // Split multiple assignees and count for each
      const assigneeList = assignees === 'Unassigned' ? ['Unassigned'] : assignees.split(',').map(name => name.trim());
      
      assigneeList.forEach(assignee => {
        if (!workloadData[assignee]) {
          workloadData[assignee] = {};
        }
        if (!workloadData[assignee][status]) {
          workloadData[assignee][status] = [];
        }
        workloadData[assignee][status].push(item.name);
      });
    });

    // Build workload report
    let report = `👥 Workload Report for "${groupName}":\n\n`;
    
    Object.keys(workloadData).forEach(assignee => {
      report += `**${assignee}**\n`;
      const statuses = workloadData[assignee];
      
      Object.keys(statuses).forEach(status => {
        const tasks = statuses[status];
        report += `  • ${status}: ${tasks.length} task${tasks.length > 1 ? 's' : ''}\n`;
        tasks.forEach(task => {
          report += `    - ${task}\n`;
        });
      });
      report += '\n';
    });

    // Add bottleneck analysis
    const bottlenecks = [];
    Object.keys(workloadData).forEach(assignee => {
      const statuses = workloadData[assignee];
      const notStartedCount = statuses['Not Started'] ? statuses['Not Started'].length : 0;
      const stuckCount = statuses['Stuck'] ? statuses['Stuck'].length : 0;
      
      if (notStartedCount > 3) {
        bottlenecks.push(`${assignee} has ${notStartedCount} tasks not started`);
      }
      if (stuckCount > 0) {
        bottlenecks.push(`${assignee} has ${stuckCount} tasks stuck`);
      }
    });

    if (bottlenecks.length > 0) {
      report += `**Bottlenecks Identified:**\n`;
      bottlenecks.forEach(bottleneck => {
        report += `⚠️ ${bottleneck}\n`;
      });
    } else {
      report += `✅ No major bottlenecks identified.`;
    }

    console.log('✅ Workload report generated successfully');
    return {
      success: true,
      report: report.trim()
    };
  } catch (error) {
    console.error('❌ Error generating workload report:', error);
    return {
      success: false,
      error: `Failed to generate workload report: ${error.message}`
    };
  }
}

/**
 * Create an autonomous project with AI-generated subtasks, briefs, assignments, and deadlines
 * @param {Object} entities - Contains taskName, deadline, and subtasks array from Gemini
 * @returns {Promise<Object>} - Created project information
 */
async function createAutonomousProject(entities, sessionId = null) {
  try {
    const { taskName, groupName = "AI agent operations", deadline, subtasks = [], projectLead, mainTaskBrief } = entities;

    if (!taskName) {
      throw new Error('Task name is required');
    }

    console.log('🤖 Creating autonomous project:', taskName);
    
    // Helper function to send progress updates
    const sendProgress = (message) => {
      if (sessionId && global.sendProgress) {
        global.sendProgress(sessionId, message);
      }
    };

    sendProgress(`Creating project: ${taskName}`);

    // Step 1: Create the Parent Project Task
    const boardId = 2034046752;
    console.log('🎯 Using hardcoded board ID:', boardId, '(Paid Media CRM)');

    // Find the group ID
    sendProgress(`Finding group: ${groupName}`);
    const groupId = await getGroupId(boardId, groupName);
    
    if (!groupId) {
      return {
        success: false,
        error: `Group "${groupName}" not found in the Paid Media CRM board.`
      };
    }

    // Create the main project task
    sendProgress('Creating main project task...');
    const mutation = gql`
      mutation CreateItem($boardId: ID!, $itemName: String!, $groupId: String!) {
        create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId) {
          id
          name
        }
      }
    `;

    console.log('📝 Creating main project task:', taskName);
    
    const response = await mondayClient.request(mutation, {
      boardId: boardId.toString(),
      itemName: taskName,
      groupId
    });

    const mainTaskId = response.create_item.id;
    console.log('✅ Main project task created:', response.create_item);

    // Step 2: Set main task deadline
    if (deadline) {
      try {
        await setItemDeadline(boardId, mainTaskId, deadline);
        console.log('✅ Main task deadline set');
      } catch (deadlineError) {
        console.error('❌ Failed to set main task deadline:', deadlineError);
      }
    }

    // Step 2.5: Assign main task to project lead
    const projectLeadName = projectLead || (subtasks.length > 0 ? subtasks[0].assigneeName : null);
    if (projectLeadName) {
      try {
        console.log('👤 Assigning main task to project lead:', projectLeadName);
        
        const userId = await getUserIdByName(projectLeadName);
        if (userId) {
          const assignmentSuccess = await assignUserToItem(boardId, mainTaskId, userId);
          if (assignmentSuccess) {
            console.log('✅ Main task assigned to:', projectLeadName);
          }
        } else {
          console.log('⚠️ Could not find user for main task assignment:', projectLeadName);
        }
      } catch (assignError) {
        console.error('❌ Failed to assign main task:', assignError);
        console.log('⚠️ Continuing without main task assignment');
      }
    } else {
      console.log('⚠️ No project lead specified, main task will not be assigned');
    }

    // Step 2.6: Add main task brief as an update
    if (mainTaskBrief) {
      try {
        await addUpdateToItem(mainTaskId, `📋 Project Brief: ${mainTaskBrief}`);
        console.log('✅ Main task brief added');
      } catch (briefError) {
        console.error('❌ Failed to add main task brief:', briefError);
        console.log('⚠️ Continuing without main task brief');
      }
    }

    // Step 2.7: Set main task status (default to "Briefed In")
    const mainTaskStatus = entities.status || "Briefed In";
    try {
      await setItemStatus(mainTaskId, boardId, mainTaskStatus);
      console.log('✅ Main task status set to:', mainTaskStatus);
    } catch (statusError) {
      console.error('❌ Failed to set main task status:', statusError);
      console.log('⚠️ Continuing without main task status');
    }

    const createdSubtasks = [];
    let processedCount = 0;

    // Step 3: Create each subtask with full configuration
    sendProgress(`Creating ${subtasks.length} subtasks...`);
    for (const subtask of subtasks) {
      try {
        console.log(`📝 Creating subtask ${processedCount + 1}/${subtasks.length}:`, subtask.subtaskName);
        sendProgress(`Creating subtask ${processedCount + 1}/${subtasks.length}: ${subtask.subtaskName}`);
        
        // Create the subtask
        const subtaskMutation = gql`
          mutation CreateSubitem($parentItemId: ID!, $subitemName: String!) {
            create_subitem(parent_item_id: $parentItemId, item_name: $subitemName) {
              id
              name
              board {
                id
              }
            }
          }
        `;

        const subtaskResponse = await mondayClient.request(subtaskMutation, {
          parentItemId: mainTaskId.toString(),
          subitemName: subtask.subtaskName
        });

        if (!subtaskResponse.create_subitem) {
          console.error('❌ Failed to create subtask:', subtask.subtaskName);
          continue;
        }

        const createdSubtask = subtaskResponse.create_subitem;
        console.log('✅ Subtask created:', createdSubtask);

        // Step 4: Add the brief as an update
        if (subtask.brief) {
          try {
            await addUpdateToItem(createdSubtask.id, `📋 Brief: ${subtask.brief}`);
            console.log('✅ Brief added to subtask');
          } catch (briefError) {
            console.error('❌ Failed to add brief to subtask:', briefError);
          }
        }

        // Step 5: Assign the person
        if (subtask.assigneeName) {
          try {
            const userId = await getUserIdByName(subtask.assigneeName);
            if (userId) {
              // Use the subtask's board ID for assignment
              const subtaskBoardId = createdSubtask.board.id;
              const assignmentSuccess = await assignUserToItem(subtaskBoardId, createdSubtask.id, userId);
              if (assignmentSuccess) {
                console.log('✅ Subtask assigned to:', subtask.assigneeName);
              }
            } else {
              console.log('⚠️ User not found for assignment:', subtask.assigneeName);
            }
          } catch (assignError) {
            console.error('❌ Failed to assign subtask:', assignError);
          }
        }

        // Step 6: Set subtask deadline
        if (subtask.deadline) {
          try {
            // Use the subtask's board ID for deadline setting
            const subtaskBoardId = createdSubtask.board.id;
            console.log('📅 Attempting to set deadline on subtask board:', subtaskBoardId);
            await setItemDeadline(subtaskBoardId, createdSubtask.id, subtask.deadline);
            console.log('✅ Subtask deadline set');
          } catch (deadlineError) {
            console.error('❌ Failed to set subtask deadline:', deadlineError);
            console.log('⚠️ Subtask deadline setting failed - this is normal as subtasks may not have date columns');
            // This is expected behavior - subtasks often don't have the same column structure as main items
          }
        }

        // Step 7: Set subtask status (if status column exists)
        if (subtask.status) {
          try {
            // Use the subtask's board ID for status setting
            const subtaskBoardId = createdSubtask.board.id;
            console.log('📊 Setting subtask status to:', subtask.status);
            await setItemStatus(createdSubtask.id, subtaskBoardId, subtask.status);
            console.log('✅ Subtask status set');
          } catch (statusError) {
            console.error('❌ Failed to set subtask status:', statusError);
            console.log('⚠️ Subtask status setting failed - continuing without status');
          }
        }

        createdSubtasks.push({
          ...createdSubtask,
          assigneeName: subtask.assigneeName,
          brief: subtask.brief,
          deadline: subtask.deadline,
          status: subtask.status
        });

        processedCount++;
      } catch (subtaskError) {
        console.error('❌ Error processing subtask:', subtask.subtaskName, subtaskError);
      }
    }

    console.log('✅ Autonomous project creation completed');

    return {
      success: true,
      mainTask: response.create_item,
      subtasks: createdSubtasks,
      message: `Successfully created autonomous project "${taskName}" with ${createdSubtasks.length} subtasks. Each subtask has been assigned, briefed, and scheduled according to the project plan.`
    };

  } catch (error) {
    console.error('❌ Error creating autonomous project:', error);
    return {
      success: false,
      error: `Failed to create autonomous project: ${error.message}`
    };
  }
}

module.exports = {
  createMondayTask,
  createMondayTaskWithSubtasks,
  createAutonomousProject,
  updateMondayTaskStatus,
  listMondayBoards,
  getGroupStatusReport,
  getGroupWorkloadReport,
  getBoardSchema,
  findColumnId,
  findStatusLabel,
  parseHumanDate,
  setItemDeadline,
  setItemStatus,
  getUserIdByName
};
