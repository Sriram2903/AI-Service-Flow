class AIServiceFlow {
  constructor() {
    this.currentUser = null;
    this.currentCognitoUser = null;
    this.pendingUser = null;
    this.tickets = [];
    this.filteredTickets = [];
    this.welcomeShown = false;
    this.currentTheme = 'dark';
    this.cognitoConfig = {
      UserPoolId: 'us-east-1_nH5SrKnwq',
      ClientId: '7gh090hb5vpsl1pdjpq1s3hlvo',
      Region: 'us-east-1'
    };
    this.apiUrl = 'https://p3g394cwkg.execute-api.us-east-1.amazonaws.com/prod/tickets';
    this.chatApiUrl = 'https://kv87v44u4j.execute-api.us-east-1.amazonaws.com/prod/chat';
    this.knowledgeBaseApiUrl = 'https://jaf6hrq3uybuvast2rxlhnlham0tqooh.lambda-url.us-east-1.on.aws/';
    
    // Enhanced Ticket Creator API with debugging
    this.ticketCreatorApiUrl = 'https://fqn647kgqdzinvfbcyl2xb7ufq0rrycm.lambda-url.us-east-1.on.aws/';
    this.currentAnalysis = null;
    this.currentMultiTicketAnalysis = null;
    this.requestTimeout = 30000; // 30 seconds timeout
    
    // Knowledge Base configuration
    this.knowledgeBaseResources = {
      'user-guide': {
        title: 'Complete IT User Guide',
        file: 'complete_user_guide.txt',
        description: 'Comprehensive guide covering basic computer operations and software usage'
      },
      'troubleshooting': {
        title: 'Complete Troubleshooting Guide', 
        file: 'complete_troubleshooting_guide.txt',
        description: 'Step-by-step solutions for hardware, software, and network issues'
      },
      'faq': {
        title: 'FAQ & Common Issues',
        file: 'faq_common_issues_patterns.txt', 
        description: 'Frequently asked questions and common problem solutions'
      },
      'policies': {
        title: 'Company IT Policies',
        file: 'company_policies_procedures.txt',
        description: 'Official IT policies and security requirements'
      },
      'ticket-procedures': {
        title: 'Ticket Management Procedures',
        file: 'ticket_management_procedures.txt',
        description: 'Guidelines for creating and managing support tickets'
      }
    };

    // Quick reference content
    this.quickReferenceContent = {
      'password_reset': {
        title: '🔐 Password Reset Steps',
        content: `
# Password Reset Guide

## Self-Service Password Reset:
1. **Visit the company portal login page**
2. **Click "Forgot Password"**
3. **Enter your work email address**
4. **Check your email for reset link**
5. **Follow the link and create new password**

## Password Requirements:
- Minimum 8 characters
- Must include uppercase letter
- Must include lowercase letter  
- Must include at least one number
- Must include special character (!@#$%^&*)

## If Self-Service Fails:
- Contact IT Support at ext. 2345
- Have your employee ID ready
- Verification required for security

## Security Tips:
- Never share passwords
- Use unique passwords for each system
- Enable two-factor authentication when available
        `
      },
      'wifi_setup': {
        title: '📶 WiFi Setup Guide',
        content: `
# WiFi Connection Guide

## Connect to Company WiFi:
1. Open WiFi settings on your device
2. Select "CompanyWiFi-Secure"
3. Enter your domain credentials:
   - Username: your-email@company.com
   - Password: your network password

## Troubleshooting WiFi Issues:
- Weak Signal: Move closer to access point
- Can't Connect: Restart WiFi on device
- Slow Speed: Check for interference
- Authentication Failed: Verify credentials

## Guest WiFi:
- Network: "CompanyGuest"
- Password: Contact reception
- Limited access for visitors only

## Need Help?
Contact Network Team at ext. 2367
        `
      },
      'printer_setup': {
        title: '🖨️ Printer Installation',
        content: `
# Printer Installation Guide

## Add Network Printer (Windows):
1. Open Settings > Devices > Printers & Scanners
2. Click "Add a printer or scanner"
3. Select your department printer:
   - Marketing: HP-MKT-01 (192.168.1.101)
   - Sales: Canon-SALES-02 (192.168.1.102)
   - Admin: Xerox-ADMIN-03 (192.168.1.103)

## Mac Installation:
1. System Preferences > Printers & Scanners
2. Click the "+" button
3. Select printer from list
4. Download driver if prompted

## Common Issues:
- Printer Offline: Check network connection
- Print Quality Poor: Replace toner/ink
- Paper Jam: Follow display instructions
- Driver Missing: Contact IT for installation

## Mobile Printing:
- Download company print app
- Connect to CompanyWiFi
- Select printer and print
        `
      },
      'vpn_setup': {
        title: '🔒 VPN Connection Guide', 
        content: `
# VPN Setup Guide

## Windows VPN Setup:
1. Download Cisco AnyConnect client
2. Install with admin privileges
3. Connect to: vpn.company.com
4. Enter your domain credentials

## Mac VPN Setup:
1. Download AnyConnect from App Store
2. Configure server: vpn.company.com
3. Use your network login credentials

## Mobile VPN (iOS/Android):
1. Install Cisco AnyConnect app
2. Add server: vpn.company.com
3. Login with work credentials

## Troubleshooting:
- Connection Failed: Check internet connection
- Login Issues: Verify credentials
- Slow Performance: Try different server
- Certificate Errors: Contact IT support

## Security Reminders:
- Always use VPN for remote work
- Disconnect when not needed
- Never share VPN credentials
- Report any suspicious activity
        `
      }  
    };
    
    this.init();
  }

  init() {
    try {
      // Configure AWS Cognito
      AWS.config.region = this.cognitoConfig.Region;
      this.userPool = new AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: this.cognitoConfig.UserPoolId,
        ClientId: this.cognitoConfig.ClientId
      });

      // Load saved theme
      this.loadSavedTheme();

      // Check authentication status
      const currentUser = this.userPool.getCurrentUser();
      if (currentUser) {
        currentUser.getSession((err, session) => {
          if (!err && session.isValid()) {
            this.currentUser = session.getIdToken().payload.email;
            this.currentCognitoUser = currentUser;
            this.showMainApp();
          } else {
            this.showAuthContainer();
          }
        });
      } else {
        this.showAuthContainer();
      }

      this.setupEventListeners();
      
    } catch (error) {
      console.error('🚨 Initialization error:', error);
      this.showNotification('Initialization failed. Please refresh the page.', 'error');
    }
  }

  // === THEME TOGGLE FUNCTIONALITY ===
  toggleTheme() {
    try {
      // Toggle between light and dark
      this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', this.currentTheme);
      
      // Update theme icon
      const themeIcon = document.querySelector('.theme-icon');
      if (themeIcon) {
        themeIcon.textContent = this.currentTheme === 'dark' ? '🌙' : '☀️';
      }
      
      // Save theme preference
      localStorage.setItem('preferredTheme', this.currentTheme);
      
      // Show notification
      const themeName = this.currentTheme === 'dark' ? 'Dark' : 'Light';
      this.showNotification(`🎨 Switched to ${themeName} theme`, 'success');
      
      console.log(`Theme switched to: ${this.currentTheme}`);
      
    } catch (error) {
      console.error('Error toggling theme:', error);
      this.showNotification('Error switching theme', 'error');
    }
  }

  // Add this method to load saved theme on startup
  loadSavedTheme() {
    try {
      const savedTheme = localStorage.getItem('preferredTheme');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        this.currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Update icon based on theme
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
          themeIcon.textContent = this.currentTheme === 'dark' ? '🌙' : '☀️';
        }
      }
    } catch (error) {
      console.error('Error loading saved theme:', error);
    }
  }

  setupPasswordToggle() {
    document.querySelectorAll('.password-toggle').forEach((toggle) => {
      const newToggle = toggle.cloneNode(true);
      toggle.parentNode.replaceChild(newToggle, toggle);
      newToggle.addEventListener('click', function () {
        const passwordGroup = this.closest('.password-group');
        const passwordInput = passwordGroup.querySelector('.form-input');
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          this.textContent = '🙈';
        } else {
          passwordInput.type = 'password';
          this.textContent = '👁';
        }
      });
    });
  }

  checkExistingSession() {
    const currentUser = this.userPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err, session) => {
        if (err || !session.isValid()) {
          console.log('No valid session found');
          this.showAuthForm();
        } else {
          console.log('✅ Valid Cognito session found');
          this.currentUser = currentUser.getUsername();
          this.currentCognitoUser = currentUser;
          this.showMainApp();
        }
      });
    } else {
      console.log('No current user found');
      this.showAuthForm();
    }
  }

  setupEventListeners() {
    // Authentication event listeners
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (loginTab) loginTab.addEventListener('click', () => this.switchTab('login'));
    if (signupTab) signupTab.addEventListener('click', () => this.switchTab('signup'));
    if (loginBtn) loginBtn.addEventListener('click', () => this.handleRealLogin());
    if (signupBtn) signupBtn.addEventListener('click', () => this.handleRealSignup());
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleRealLogout());

    // Navigation event listeners
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.switchSection(e.target.dataset.section);
      });
    });

    // Ticket management event listeners
    const ticketSearch = document.getElementById('ticket-search');
    if (ticketSearch) ticketSearch.addEventListener('input', (e) => this.searchTickets(e.target.value));
    
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.setActiveFilter(e.target);
        this.filterTickets(e.target.dataset.status);
      });
    });

    // Chat event listeners
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Enhanced Ticket Creator event listeners
    this.setupTicketCreatorListeners();
    
    // Knowledge Base event listeners
    this.setupKnowledgeBaseListeners();
  }

  switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.app-section').forEach((section) => {
      section.classList.remove('active');
      section.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
      targetSection.classList.add('active');
      targetSection.style.display = 'block';
    }

    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');

    // Load data for specific sections
    if (sectionName === 'tickets-dashboard') {
      this.loadTickets();
    }
  }

  // === TICKET CREATOR FUNCTIONALITY === //

  setupTicketCreatorListeners() {
    // Global functions for onclick handlers
    window.fillIssue = (issueText) => this.fillIssue(issueText);
    window.clearInput = () => this.clearInput();
    window.analyzeIssue = () => this.analyzeIssue();
    window.createFinalTicket = () => this.createFinalTicket();
    
    // Multi-ticket functions
    window.createAllTickets = () => this.createAllTickets();
    window.editTicket = (index) => this.editTicket(index);
    window.removeTicket = (index) => this.removeTicket(index);
    window.clearAnalysis = () => this.clearAnalysis();
    window.retryAnalysis = () => this.analyzeIssue();
  }

  fillIssue(issueText) {
    try {
      const descriptionInput = document.getElementById('issue-description');
      if (descriptionInput) {
        descriptionInput.value = issueText;
        descriptionInput.focus();
      }
    } catch (error) {
      console.error('Error filling issue:', error);
      this.showNotification('Error filling issue text', 'error');
    }
  }

  clearInput() {
    try {
      const descriptionInput = document.getElementById('issue-description');
      const analysisResults = document.getElementById('ai-analysis-results');
      const ticketPreview = document.getElementById('ticket-preview');
      
      if (descriptionInput) descriptionInput.value = '';
      if (ticketPreview) ticketPreview.style.display = 'none';
      
      if (analysisResults) {
        analysisResults.innerHTML = `
          <div class="analysis-placeholder">
            <div class="placeholder-icon">🤖</div>
            <p><strong>🚀 Enhanced AI Ticket Creation:</strong></p>
            <ul>
              <li data-icon="📝">Describe single or multiple issues in natural language</li>
              <li data-icon="🧠">AI automatically detects and separates multiple problems</li>
              <li data-icon="🎯">Creates individual tickets with proper categorization</li>
              <li data-icon="⚡">Handles complex scenarios like numbered lists and narratives</li>
              <li data-icon="✅">Generates professional support tickets in seconds</li>
            </ul>
            <p><strong>💡 Pro Tip:</strong> You can describe multiple issues at once using phrases like "Also", "Additionally", or numbered lists!</p>
          </div>
        `;
      }
      
      this.currentAnalysis = null;
      this.currentMultiTicketAnalysis = null;
    } catch (error) {
      console.error('Error clearing input:', error);
      this.showNotification('Error clearing form', 'error');
    }
  }

  clearAnalysis() {
    this.clearInput();
  }

  async analyzeIssue() {
    const descriptionInput = document.getElementById('issue-description');
    const resultsDiv = document.getElementById('ai-analysis-results');
    
    if (!descriptionInput || !resultsDiv) {
      this.showNotification('Form elements not found. Please refresh the page.', 'error');
      return;
    }
    
    const description = descriptionInput.value.trim();
    if (!description) {
      this.showNotification('Please describe your issue first', 'error');
      descriptionInput.focus();
      return;
    }

    if (description.length < 10) {
      this.showNotification('Please provide more detailed description (at least 10 characters)', 'warning');
      descriptionInput.focus();
      return;
    }

    // Enhanced loading state with better UX
    resultsDiv.innerHTML = `
      <div class="analyzing">
        <div class="analysis-spinner">🤖</div>
        <div class="analysis-text">
          <h4>AI is analyzing your request...</h4>
          <div class="analysis-steps">
            <p id="step-1">• Parsing issue description...</p>
            <p id="step-2" style="opacity: 0.5;">• Detecting issue patterns</p>
            <p id="step-3" style="opacity: 0.5;">• Categorizing problems</p>
            <p id="step-4" style="opacity: 0.5;">• Checking for multiple issues</p>
          </div>
        </div>
        <div class="cancel-analysis">
          <button onclick="clearAnalysis()" class="cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    // Simulate progress steps for better UX
    setTimeout(() => this.updateAnalysisStep(2), 1000);
    setTimeout(() => this.updateAnalysisStep(3), 2000);
    setTimeout(() => this.updateAnalysisStep(4), 3000);

    // Create AbortController for request cancellation
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.requestTimeout);

    try {
      console.log('Sending analysis request for:', description.substring(0, 100) + '...');
      
      const requestPayload = {
        action: 'analyze',
        description: description,
        userId: this.currentUser || 'anonymous'
      };
      
      console.log('Request payload:', requestPayload);

      const response = await fetch(this.ticketCreatorApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let analysis;
      try {
        analysis = JSON.parse(responseText);
        console.log('Parsed analysis:', analysis);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
      
      // CRITICAL: Comprehensive response validation
      if (!analysis || typeof analysis !== 'object') {
        throw new Error('Invalid response format from AI service');
      }

      if (analysis.error) {
        throw new Error(analysis.error);
      }

      if (!analysis.success && analysis.success !== undefined) {
        throw new Error(analysis.message || 'Analysis failed');
      }

      // Check if this is a multi-ticket response
      if (analysis.multiTicket === true) {
        console.log('Multi-ticket response detected');
        
        // Validate multi-ticket structure
        if (!analysis.tickets || !Array.isArray(analysis.tickets) || analysis.tickets.length === 0) {
          throw new Error('Invalid multi-ticket response: missing or empty tickets array');
        }
        
        // Validate each ticket has required properties
        for (let i = 0; i < analysis.tickets.length; i++) {
          const ticket = analysis.tickets[i];
          if (!ticket.subject || !ticket.category || !ticket.priority) {
            console.error(`Invalid ticket ${i}:`, ticket);
            throw new Error(`Invalid ticket data in position ${i + 1}`);
          }
        }
        
        this.currentMultiTicketAnalysis = analysis;
        this.displayMultiTicketAnalysis(analysis);
        
      } else {
        console.log('Single ticket response detected');
        
        // Validate single ticket structure
        if (!analysis.analysis || typeof analysis.analysis !== 'object') {
          console.error('Missing analysis object:', analysis);
          throw new Error('Invalid single ticket response: missing analysis data');
        }
        
        if (!analysis.analysis.problemType) {
          console.error('Missing problemType in analysis:', analysis.analysis);
          throw new Error('Incomplete analysis data: missing problem type');
        }
        
        if (!analysis.suggestions || typeof analysis.suggestions !== 'object') {
          console.error('Missing suggestions object:', analysis);
          throw new Error('Invalid single ticket response: missing suggestions data');
        }
        
        this.currentAnalysis = analysis;
        this.displaySingleTicketAnalysis(analysis);
      }

      this.showNotification('✅ Issue analysis completed successfully!', 'success');

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Analysis error details:', {
        error: error,
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = 'Unable to analyze your issue.';
      let troubleshootingSteps = [
        'Check your internet connection',
        'Try with a simpler description first',
        'Contact support if problem persists'
      ];
      
      // Specific error handling
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. The analysis is taking too long.';
        troubleshootingSteps = [
          'Try breaking down complex issues into simpler descriptions',
          'Check your internet connection stability',
          'Try again with a shorter description'
        ];
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network connection failed. Please check your connection.';
        troubleshootingSteps = [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable any VPN or proxy temporarily'
        ];
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Received invalid response from AI service.';
        troubleshootingSteps = [
          'Try again in a few moments',
          'Check if the service is temporarily down',
          'Contact support if issue persists'
        ];
      } else if (error.message.includes('Invalid response')) {
        errorMessage = 'AI service returned unexpected data format.';
        troubleshootingSteps = [
          'Try again with a different issue description',
          'The AI service may be temporarily unavailable',
          'Contact support for assistance'
        ];
      }
      
      // Enhanced error display
      resultsDiv.innerHTML = `
        <div class="analysis-error">
          <div class="error-header">
            <h4>❌ Analysis Failed</h4>
            <span class="error-code">${error.name || 'AnalysisError'}</span>
          </div>
          <div class="error-details">
            <p class="error-message"><strong>What happened:</strong> ${errorMessage}</p>
            <details class="error-technical">
              <summary>Technical Details (for debugging)</summary>
              <p><strong>Error:</strong> ${error.message}</p>
              <p><strong>Type:</strong> ${error.name || 'Unknown'}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            </details>
            <div class="troubleshooting">
              <p><strong>Troubleshooting steps:</strong></p>
              <ul>
                ${troubleshootingSteps.map(step => `<li>${step}</li>`).join('')}
              </ul>
            </div>
          </div>
          <div class="error-actions">
            <button onclick="retryAnalysis()" class="retry-btn" type="button">🔄 Try Again</button>
            <button onclick="clearInput()" class="clear-btn" type="button">🆕 Start Over</button>
            <button onclick="aiServiceFlow.switchSection('ai-troubleshoot')" class="chat-btn" type="button">💬 Get Help</button>
          </div>
        </div>
      `;
      
      this.showNotification(`Analysis failed: ${errorMessage}`, 'error');
    }
  }

  updateAnalysisStep(step) {
    try {
      const stepElement = document.getElementById(`step-${step}`);
      if (stepElement) {
        stepElement.style.opacity = '1';
        stepElement.style.color = '#22c55e';
        stepElement.innerHTML = stepElement.innerHTML.replace('•', '✓');
      }
    } catch (error) {
      console.warn('Error updating analysis step:', error);
    }
  }

  displayMultiTicketAnalysis(result) {
    try {
      const analysisResults = document.getElementById('ai-analysis-results');
      if (!analysisResults) throw new Error('Analysis results element not found');
      
      if (!result.tickets || result.tickets.length === 0) {
        throw new Error('No tickets found in multi-ticket response');
      }
      
      analysisResults.innerHTML = `
        <div class="multi-ticket-analysis">
          <div class="analysis-header">
            <h3>🤖 AI Analysis Complete - Multiple Issues Detected</h3>
            <div class="multi-ticket-summary">
              <span class="ticket-count">📊 ${result.totalTickets || result.tickets.length} separate tickets identified</span>
              <span class="success-rate">✅ ${result.successfulTickets || result.tickets.length}/${result.totalTickets || result.tickets.length} successfully analyzed</span>
            </div>
          </div>
          
          <div class="tickets-preview">
            ${result.tickets.map((ticket, index) => this.renderTicketPreviewCard(ticket, index)).join('')}
          </div>
          
          <div class="multi-ticket-actions">
            <button class="create-all-btn" onclick="createAllTickets()" type="button">
              ✅ Create All ${result.tickets.length} Tickets
            </button>
            <button class="analyze-again-btn" onclick="clearAnalysis()" type="button">
              🔄 Analyze Again
            </button>
          </div>
        </div>
      `;
      
      // Hide single ticket preview
      const ticketPreview = document.getElementById('ticket-preview');
      if (ticketPreview) ticketPreview.style.display = 'none';
      
      // Scroll to results
      analysisResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
    } catch (error) {
      console.error('Error displaying multi-ticket analysis:', error);
      this.showNotification('Error displaying analysis results', 'error');
      this.clearInput();
    }
  }

  renderTicketPreviewCard(ticket, index) {
    try {
      return `
        <div class="ticket-preview-card" data-ticket-index="${index}">
          <div class="ticket-header">
            <h4>🎫 Ticket ${index + 1}</h4>
            <div class="ticket-meta">
              <span class="category-badge ${(ticket.category || 'general').toLowerCase()}">${ticket.category || 'General'}</span>
              <span class="priority-badge priority-${(ticket.priority || 'medium').toLowerCase()}">${ticket.priority || 'Medium'} Priority</span>
            </div>
          </div>
          
          <div class="ticket-content">
            <div class="ticket-field">
              <strong>📌 Subject:</strong> ${ticket.subject || 'Support Request'}
            </div>
            <div class="ticket-field">
              <strong>📝 Description:</strong> ${ticket.description || 'No description available'}
            </div>
            <div class="ticket-field">
              <strong>👥 Assigned Team:</strong> ${ticket.assignedTeam || 'General Support Team'}
            </div>
            <div class="ticket-field">
              <strong>⏱️ Est. Resolution:</strong> ${ticket.estimatedResolutionTime || '2-4 hours'}
            </div>
            
            ${ticket.quickFixes && ticket.quickFixes.length > 0 ? `
              <div class="quick-fixes">
                <strong>💡 Quick Fixes:</strong>
                <ul>
                  ${ticket.quickFixes.map(fix => `<li>${fix}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          
          <div class="ticket-actions">
            <button class="edit-ticket-btn" onclick="editTicket(${index})" type="button">✏️ Edit</button>
            <button class="remove-ticket-btn" onclick="removeTicket(${index})" type="button">🗑️ Remove</button>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering ticket preview card:', error);
      return `<div class="ticket-preview-card error">Error rendering ticket ${index + 1}</div>`;
    }
  }

  displaySingleTicketAnalysis(analysis) {
    try {
      const resultsDiv = document.getElementById('ai-analysis-results');
      if (!resultsDiv) throw new Error('Results element not found');
      
      const analysisData = analysis.analysis;
      if (!analysisData) throw new Error('Analysis data missing');
      
      resultsDiv.innerHTML = `
        <div class="single-ticket-analysis">
          <h4>🎯 AI Analysis Complete</h4>
          <div class="analysis-summary">
            <p><strong>✅ Issue Detected:</strong> ${analysisData.problemType || 'General Support'}</p>
            <p><strong>⚡ Priority Level:</strong> <span class="priority-${(analysisData.priority || 'medium').toLowerCase()}">${analysisData.priority || 'Medium'}</span></p>
            <p><strong>📂 Category:</strong> ${analysisData.category || 'General'}</p>
            <p><strong>⏱️ Urgency:</strong> ${analysisData.urgency || 'Standard'}</p>
            <p><strong>👥 Recommended Team:</strong> ${analysis.suggestions?.assignToTeam || 'General Support Team'}</p>
          </div>
        </div>
      `;

      // Show single ticket preview
      this.showTicketPreview(analysis);
      
    } catch (error) {
      console.error('Error displaying single ticket analysis:', error);
      this.showNotification('Error displaying analysis results', 'error');
      this.clearInput();
    }
  }

  showTicketPreview(analysis) {
    try {
      const previewDiv = document.getElementById('ticket-preview');
      if (!previewDiv) throw new Error('Preview element not found');

      const data = analysis.analysis;
      const suggestions = analysis.suggestions;

      // Safely populate preview fields
      this.setElementText('preview-subject', data.subject);
      this.setElementText('preview-category', data.category);
      this.setElementText('preview-priority', data.priority);
      this.setElementText('preview-problem-type', data.problemType);
      this.setElementText('preview-team', suggestions?.assignToTeam);
      this.setElementText('preview-description', data.enhancedDescription);
      this.setElementText('preview-resolution-time', data.estimatedResolutionTime);

      // Set priority badge class safely
      const priorityBadge = document.getElementById('preview-priority');
      if (priorityBadge && data.priority) {
        priorityBadge.className = `priority-badge priority-${data.priority.toLowerCase()}`;
      }

      // Populate quick fixes safely
      const quickFixesList = document.getElementById('preview-quick-fixes');
      if (quickFixesList && suggestions?.quickFixes) {
        quickFixesList.innerHTML = '';
        suggestions.quickFixes.forEach(fix => {
          const li = document.createElement('li');
          li.textContent = fix;
          quickFixesList.appendChild(li);
        });
      }

      // Show preview
      previewDiv.style.display = 'block';
      
      // Scroll to preview
      previewDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
    } catch (error) {
      console.error('Error showing ticket preview:', error);
      this.showNotification('Error showing ticket preview', 'error');
    }
  }

  async createAllTickets() {
    if (!this.currentMultiTicketAnalysis) {
      this.showNotification('No multi-ticket analysis found. Please analyze issues first.', 'error');
      return;
    }

    const createButton = document.querySelector('.create-all-btn');
    if (!createButton) return;

    const originalText = createButton.innerHTML;
    createButton.disabled = true;
    createButton.innerHTML = '⏳ Creating All Tickets...';

    try {
      // In the enhanced system, tickets are created during analysis
      // This is just for display purposes
      const result = this.currentMultiTicketAnalysis;
      
      if (!result.tickets || result.tickets.length === 0) {
        throw new Error('No tickets found to create');
      }
      
      // Show success message
      this.showMultiTicketSuccess(result);
      
      // Show notification
      this.showNotification(
        `🎉 Successfully processed ${result.tickets.length} tickets!`, 
        'success'
      );
      
      // Refresh ticket list if we're on that tab
      if (document.getElementById('tickets-dashboard')?.classList.contains('active')) {
        setTimeout(() => this.loadTickets(), 1000);
      }

    } catch (error) {
      console.error('Error creating tickets:', error);
      this.showNotification(`Failed to create tickets: ${error.message}`, 'error');
    } finally {
      if (createButton) {
        createButton.disabled = false;
        createButton.innerHTML = originalText;
      }
    }
  }

  showMultiTicketSuccess(result) {
    try {
      const analysisResults = document.getElementById('ai-analysis-results');
      if (!analysisResults) throw new Error('Analysis results element not found');
      
      if (!result.tickets || result.tickets.length === 0) {
        throw new Error('No tickets to display');
      }
      
      analysisResults.innerHTML = `
        <div class="multi-ticket-success">
          <div class="success-header">
            <h3>🎉 Multi-Ticket Creation Successful!</h3>
            <div class="success-summary">
              Processed ${result.tickets.length} tickets successfully
            </div>
          </div>
          
          <div class="created-tickets-list">
            ${result.tickets.map(ticket => `
              <div class="created-ticket-item">
                <div class="ticket-id">🎫 ${ticket.ticketId || ticket.id || 'Generated'}</div>
                <div class="ticket-subject">${ticket.subject || 'Support Request'}</div>
                <div class="ticket-meta">
                  <span class="ticket-status">Status: ${ticket.status || 'Open'}</span>
                  <span class="ticket-team">Team: ${ticket.assignedTeam || 'General Support'}</span>
                  <span class="ticket-priority priority-${(ticket.priority || 'medium').toLowerCase()}">Priority: ${ticket.priority || 'Medium'}</span>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="success-actions">
            <button class="view-tickets-btn" onclick="aiServiceFlow.switchSection('tickets-dashboard')" type="button">
              📋 View All Tickets
            </button>
            <button class="new-request-btn" onclick="clearAnalysis()" type="button">
              🆕 Create New Request
            </button>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error showing success message:', error);
      this.showNotification('Tickets processed, but error showing results', 'warning');
    }
  }

  editTicket(index) {
    this.showNotification(`✏️ Ticket editing feature coming soon! (Ticket ${index + 1})`, 'info');
  }

  removeTicket(index) {
    try {
      if (!this.currentMultiTicketAnalysis) {
        this.showNotification('No multi-ticket analysis found', 'error');
        return;
      }
      
      if (index < 0 || index >= this.currentMultiTicketAnalysis.tickets.length) {
        this.showNotification('Invalid ticket index', 'error');
        return;
      }
      
      if (confirm('Are you sure you want to remove this ticket from the batch?')) {
        this.currentMultiTicketAnalysis.tickets.splice(index, 1);
        this.currentMultiTicketAnalysis.totalTickets = this.currentMultiTicketAnalysis.tickets.length;
        this.currentMultiTicketAnalysis.successfulTickets = this.currentMultiTicketAnalysis.tickets.length;
        
        if (this.currentMultiTicketAnalysis.tickets.length === 0) {
          this.clearAnalysis();
          return;
        }
        
        // Re-display updated analysis
        this.displayMultiTicketAnalysis(this.currentMultiTicketAnalysis);
        this.showNotification('Ticket removed from batch', 'success');
      }
    } catch (error) {
      console.error('Error removing ticket:', error);
      this.showNotification('Error removing ticket', 'error');
    }
  }

  async createFinalTicket() {
    if (!this.currentAnalysis) {
      this.showNotification('Please analyze an issue first', 'error');
      return;
    }

    const createBtn = document.getElementById('create-ticket-btn');
    if (!createBtn) return;

    const originalText = createBtn.textContent;
    createBtn.textContent = '⏳ Creating Ticket...';
    createBtn.disabled = true;

    try {
      const descriptionInput = document.getElementById('issue-description');
      const description = descriptionInput ? descriptionInput.value.trim() : '';
      
      if (!description) {
        throw new Error('Issue description is required');
      }

      const requestPayload = {
        action: 'create',
        description: description,
        userId: this.currentUser || 'anonymous',
        analysis: this.currentAnalysis.analysis,
        suggestions: this.currentAnalysis.suggestions
      };

      console.log('Creating ticket with payload:', requestPayload);

      const response = await fetch(this.ticketCreatorApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create ticket: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to create ticket');
      }

      if (!result.ticket) {
        throw new Error('No ticket data returned');
      }

      // Show success message
      this.displayTicketCreationSuccess(result.ticket);
      
      // Show notification
      this.showNotification(`✅ Ticket ${result.ticket.id} created successfully!`, 'success');

      // Refresh tickets if we're on that tab
      if (document.getElementById('tickets-dashboard')?.classList.contains('active')) {
        setTimeout(() => this.loadTickets(), 1000);
      }

    } catch (error) {
      console.error('Ticket creation error:', error);
      this.showNotification(`Failed to create ticket: ${error.message}`, 'error');
    } finally {
      if (createBtn) {
        createBtn.textContent = originalText;
        createBtn.disabled = false;
      }
    }
  }

  displayTicketCreationSuccess(ticket) {
    try {
      const analysisResults = document.getElementById('ai-analysis-results');
      if (!analysisResults) throw new Error('Analysis results element not found');
      
      analysisResults.innerHTML = `
        <div class="ticket-created">
          <h4>🎉 Ticket Created Successfully!</h4>
          <div class="ticket-success-details">
            <p><strong>🎫 Ticket ID:</strong> ${ticket.id || ticket.ticketId || 'Unknown'}</p>
            <p><strong>📌 Subject:</strong> ${ticket.subject || 'Support Request'}</p>
            <p><strong>⚡ Priority:</strong> <span class="priority-${(ticket.priority || 'medium').toLowerCase()}">${ticket.priority || 'Medium'}</span></p>
            <p><strong>👥 Assigned Team:</strong> ${ticket.assignedTeam || 'General Support Team'}</p>
            <p><strong>📅 Created:</strong> ${ticket.created ? new Date(ticket.created).toLocaleString() : 'Just now'}</p>
          </div>
          <div class="success-actions">
            <button onclick="aiServiceFlow.switchSection('tickets-dashboard')" class="primary-btn" type="button">
              📋 View All Tickets
            </button>
            <button onclick="clearInput()" class="secondary-btn" type="button">
              🎫 Create Another
            </button>
          </div>
        </div>
      `;

      // Hide preview
      const ticketPreview = document.getElementById('ticket-preview');
      if (ticketPreview) ticketPreview.style.display = 'none';
      
    } catch (error) {
      console.error('Error displaying success message:', error);
      this.showNotification('Ticket created successfully!', 'success');
    }
  }

  setElementText(elementId, text) {
    try {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = text || 'N/A';
      }
    } catch (error) {
      console.warn(`Error setting text for element ${elementId}:`, error);
    }
  }

  // === KNOWLEDGE BASE FUNCTIONALITY === //

  setupKnowledgeBaseListeners() {
    // Knowledge base search
    const knowledgeSearch = document.getElementById('knowledge-search');
    const knowledgeSearchBtn = document.getElementById('knowledge-search-btn');
    
    if (knowledgeSearch) {
      knowledgeSearch.addEventListener('input', (e) => this.searchKnowledgeBase(e.target.value));
      knowledgeSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.searchKnowledgeBase(e.target.value);
        }
      });
    }
    
    if (knowledgeSearchBtn) {
      knowledgeSearchBtn.addEventListener('click', () => {
        const query = knowledgeSearch ? knowledgeSearch.value : '';
        this.searchKnowledgeBase(query);
      });
    }

    // Global functions for knowledge base
    window.viewResource = (resourceType) => this.viewResource(resourceType);
    window.showQuickReference = (refType) => this.showQuickReference(refType);
    window.closeResourceModal = () => this.closeResourceModal();
    window.downloadResource = () => this.downloadResource();
    window.searchKnowledgeBase = (query) => this.searchKnowledgeBase(query);
  }

  async viewResource(resourceType) {
    try {
      const resource = this.knowledgeBaseResources[resourceType];
      if (!resource) {
        this.showNotification('Resource not found', 'error');
        return;
      }

      // Show loading modal
      this.showResourceModal('Loading...', '<div class="loading">📄 Loading resource...</div>');

      // Get resource content
      const content = this.getResourceContent(resourceType);
      
      this.showResourceModal(resource.title, content);
      
    } catch (error) {
      console.error('Error viewing resource:', error);
      this.showNotification('Error loading resource', 'error');
    }
  }

  getResourceContent(resourceType) {
    const resource = this.knowledgeBaseResources[resourceType];
    
    const placeholderContent = {
      'user-guide': `
        <div class="resource-content">
          <h3>📖 Complete IT User Guide</h3>
          <div class="content-section">
            <h4>Getting Started</h4>
            <p>This comprehensive guide covers everything you need to know about using company IT systems effectively.</p>
            
            <h4>Topics Covered:</h4>
            <ul>
              <li>🖥️ Computer basics and operations</li>
              <li>📧 Email setup and management</li>
              <li>🌐 Internet and network access</li>
              <li>💾 File management and backup</li>
              <li>🔒 Security best practices</li>
              <li>📱 Mobile device integration</li>
            </ul>
            
            <div class="help-note">
              <p><strong>💡 Note:</strong> For detailed step-by-step instructions, download the complete guide or contact IT support.</p>
            </div>
          </div>
        </div>
      `,
      'troubleshooting': `
        <div class="resource-content">
          <h3>🛠️ Complete Troubleshooting Guide</h3>
          <div class="content-section">
            <h4>Quick Troubleshooting Steps</h4>
            
            <div class="troubleshoot-category">
              <h5>🖥️ Hardware Issues</h5>
              <ul>
                <li>Computer won't start - Check power connections</li>
                <li>Screen flickering - Update display drivers</li>
                <li>Slow performance - Check for malware</li>
              </ul>
            </div>
            
            <div class="troubleshoot-category">
              <h5>🌐 Network Problems</h5>
              <ul>
                <li>No internet - Restart router/modem</li>
                <li>Slow connection - Check bandwidth usage</li>
                <li>WiFi drops - Update network drivers</li>
              </ul>
            </div>
            
            <div class="troubleshoot-category">
              <h5>💻 Software Issues</h5>
              <ul>
                <li>Application crashes - Reinstall software</li>
                <li>File won't open - Check file permissions</li>
                <li>System freezes - Check system resources</li>
              </ul>
            </div>
          </div>
        </div>
      `,
      'faq': `
        <div class="resource-content">
          <h3>❓ Frequently Asked Questions</h3>
          <div class="content-section">
            <div class="faq-item">
              <h4>Q: How do I reset my password?</h4>
              <p>A: Use the self-service portal or contact IT support at ext. 2345.</p>
            </div>
            
            <div class="faq-item">
              <h4>Q: Why is my computer running slowly?</h4>
              <p>A: Check for background applications, run antivirus scan, or restart your computer.</p>
            </div>
            
            <div class="faq-item">
              <h4>Q: How do I connect to the office WiFi?</h4>
              <p>A: Select "CompanyWiFi-Secure" and use your domain credentials.</p>
            </div>
            
            <div class="faq-item">
              <h4>Q: What do I do if my email is not working?</h4>
              <p>A: Check internet connection, restart email client, or contact IT support.</p>
            </div>
            
            <div class="faq-item">
              <h4>Q: How do I install software?</h4>
              <p>A: Contact IT for approved software installation - admin rights required.</p>
            </div>
          </div>
        </div>
      `,
      'policies': `
        <div class="resource-content">
          <h3>📜 Company IT Policies</h3>
          <div class="content-section">
            <div class="policy-section">
              <h4>🔒 Security Policies</h4>
              <ul>
                <li>Use strong passwords (8+ characters)</li>
                <li>Enable two-factor authentication</li>
                <li>Never share login credentials</li>
                <li>Report suspicious activities immediately</li>
              </ul>
            </div>
            
            <div class="policy-section">
              <h4>💻 Acceptable Use</h4>
              <ul>
                <li>Company equipment for business use only</li>
                <li>No unauthorized software installation</li>
                <li>Regular data backups required</li>
                <li>Respect intellectual property rights</li>
              </ul>
            </div>
            
            <div class="policy-section">
              <h4>📱 Mobile Device Policy</h4>
              <ul>
                <li>Install company security apps</li>
                <li>Use device lock screens</li>
                <li>Report lost/stolen devices immediately</li>
                <li>Separate personal and work data</li>
              </ul>
            </div>
          </div>
        </div>
      `,
      'ticket-procedures': `
        <div class="resource-content">
          <h3>📊 Ticket Management Procedures</h3>
          <div class="content-section">
            <div class="procedure-section">
              <h4>🎫 Creating Tickets</h4>
              <ol>
                <li>Use the AI Ticket Creator for best results</li>
                <li>Provide detailed problem description</li>
                <li>Include error messages if applicable</li>
                <li>Specify urgency level appropriately</li>
              </ol>
            </div>
            
            <div class="procedure-section">
              <h4>📋 Ticket Tracking</h4>
              <ul>
                <li>Check ticket status in dashboard</li>
                <li>Respond promptly to IT requests</li>
                <li>Provide additional info when asked</li>
                <li>Confirm resolution before closing</li>
              </ul>
            </div>
            
            <div class="procedure-section">
              <h4>⚡ Priority Levels</h4>
              <ul>
                <li><strong>High:</strong> System down, security breach</li>
                <li><strong>Medium:</strong> Functional issues, performance</li>
                <li><strong>Low:</strong> Enhancement requests, training</li>
              </ul>
            </div>
          </div>
        </div>
      `
    };
    
    return placeholderContent[resourceType] || '<p>Resource content not available.</p>';
  }

  showQuickReference(refType) {
    try {
      const reference = this.quickReferenceContent[refType];
      if (!reference) {
        this.showNotification('Quick reference not found', 'error');
        return;
      }

      const formattedContent = `
        <div class="quick-reference-content">
          <div class="quick-ref-header">
            <h3>${reference.title}</h3>
          </div>
          <div class="quick-ref-body">
            <pre class="reference-text">${reference.content}</pre>
          </div>
        </div>
      `;
      
      this.showResourceModal(reference.title, formattedContent);
      
    } catch (error) {
      console.error('Error showing quick reference:', error);
      this.showNotification('Error loading quick reference', 'error');
    }
  }

  showResourceModal(title, content) {
    try {
      const modal = document.getElementById('resource-modal');
      const modalTitle = document.getElementById('modal-title');
      const modalBody = document.getElementById('modal-body');
      
      if (!modal || !modalTitle || !modalBody) {
        console.error('Modal elements not found');
        return;
      }
      
      modalTitle.textContent = title;
      modalBody.innerHTML = content;
      modal.style.display = 'flex';
      
      // Add keyboard event listener for ESC key
      document.addEventListener('keydown', this.handleModalKeydown.bind(this));
      
      // Focus on modal for accessibility
      modal.focus();
      
    } catch (error) {
      console.error('Error showing modal:', error);
      this.showNotification('Error displaying resource', 'error');
    }
  }

  handleModalKeydown(e) {
    if (e.key === 'Escape') {
      this.closeResourceModal();
    }
  }

  closeResourceModal() {
    try {
      const modal = document.getElementById('resource-modal');
      if (modal) {
        modal.style.display = 'none';
        
        // Remove keyboard event listener
        document.removeEventListener('keydown', this.handleModalKeydown.bind(this));
      }
    } catch (error) {
      console.error('Error closing modal:', error);
    }
  }

  downloadResource() {
    try {
      const modalTitle = document.getElementById('modal-title');
      const resourceTitle = modalTitle ? modalTitle.textContent : 'Resource';
      
      this.showNotification(`📄 Download feature coming soon for: ${resourceTitle}`, 'info');
      
    } catch (error) {
      console.error('Error downloading resource:', error);
      this.showNotification('Error preparing download', 'error');
    }
  }

  searchKnowledgeBase(query) {
    try {
      if (!query || query.length < 3) {
        this.showNotification('Please enter at least 3 characters to search', 'warning');
        return;
      }
      
      console.log('Searching knowledge base for:', query);
      
      const searchResults = this.performKnowledgeSearch(query);
      this.displaySearchResults(query, searchResults);
      
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      this.showNotification('Error searching knowledge base', 'error');
    }
  }

  performKnowledgeSearch(query) {
    const mockResults = [
      {
        title: 'Password Reset Guide',
        type: 'Quick Reference',
        snippet: 'Step-by-step instructions for resetting your password...',
        action: 'showQuickReference("password_reset")'
      },
      {
        title: 'WiFi Connection Issues', 
        type: 'Troubleshooting Guide',
        snippet: 'Solutions for common WiFi connectivity problems...',
        action: 'viewResource("troubleshooting")'
      },
      {
        title: 'Company IT Policies',
        type: 'Policy Document',
        snippet: 'Official guidelines for IT usage and security...',
        action: 'viewResource("policies")'
      }
    ].filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.snippet.toLowerCase().includes(query.toLowerCase())
    );
    
    return mockResults;
  }

  displaySearchResults(query, results) {
    try {
      const resultsContent = results.length > 0 ? `
        <div class="search-results">
          <h3>🔍 Search Results for "${query}"</h3>
          <div class="results-list">
            ${results.map((result, index) => `
              <div class="search-result-item" onclick="${result.action}">
                <div class="result-title">${result.title}</div>
                <div class="result-type">${result.type}</div>
                <div class="result-snippet">${result.snippet}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="search-results">
          <h3>🔍 No Results Found</h3>
          <p>No results found for "${query}". Try different keywords or browse the knowledge base categories above.</p>
        </div>
      `;
      
      this.showResourceModal(`Search Results`, resultsContent);
      
    } catch (error) {
      console.error('Error displaying search results:', error);
      this.showNotification('Error displaying search results', 'error');
    }
  }

  // === AUTHENTICATION FUNCTIONALITY === //

  switchTab(tab) {
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const verificationSection = document.getElementById('verification-section');
    
    if (verificationSection) verificationSection.remove();
    if (loginTab) loginTab.classList.remove('active');
    if (signupTab) signupTab.classList.remove('active');
    if (loginForm) loginForm.classList.add('hidden');
    if (signupForm) signupForm.classList.add('hidden');
    
    if (tab === 'login') {
      if (loginTab) loginTab.classList.add('active');
      if (loginForm) loginForm.classList.remove('hidden');
    } else {
      if (signupTab) signupTab.classList.add('active');
      if (signupForm) signupForm.classList.remove('hidden');
    }
    
    setTimeout(() => this.setupPasswordToggle(), 100);
  }

  handleRealLogin() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    
    if (!emailInput || !passwordInput) {
      this.showNotification('Login form not found', 'error');
      return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
      this.showNotification('Please enter both email and password', 'error');
      return;
    }
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '🔄 Signing in...';
    
    const userData = { Username: email, Pool: this.userPool };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: email, Password: password });
    
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        this.currentUser = email;
        this.currentCognitoUser = cognitoUser;
        const accessToken = result.getAccessToken().getJwtToken();
        const idToken = result.getIdToken().getJwtToken();
        const refreshToken = result.getRefreshToken().getToken();
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('idToken', idToken);
        localStorage.setItem('refreshToken', refreshToken);
        this.showNotification('✅ Login successful! Loading dashboard...', 'success');
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login';
        setTimeout(() => this.showMainApp(), 1500);
      },
      onFailure: (err) => {
        let errorMessage = 'Login failed. Please try again.';
        if (err.code === 'NotAuthorizedException') errorMessage = 'Incorrect email or password.';
        else if (err.code === 'UserNotFoundException') errorMessage = 'Account not found. Please sign up first.';
        else if (err.code === 'UserNotConfirmedException') {
          errorMessage = 'Please verify your email first. Check your verification code below.';
          this.pendingUser = { email: email, cognitoUser: cognitoUser };
          setTimeout(() => this.showVerificationForm(), 2000);
        } else if (err.code === 'TooManyRequestsException') errorMessage = 'Too many attempts. Please try again later.';
        else if (err.code === 'InvalidParameterException') errorMessage = 'Invalid email or password format.';
        this.showNotification(errorMessage, 'error');
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login';
      },
      newPasswordRequired: () => {
        this.showNotification('Please set a new password', 'info');
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login';
      }
    });
  }

  handleRealSignup() {
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');
    const confirmInput = document.getElementById('signup-confirm');
    const signupBtn = document.getElementById('signup-btn');
    
    if (!emailInput || !passwordInput || !confirmInput) {
      this.showNotification('Signup form not found', 'error');
      return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmInput.value.trim();
    
    if (!email || !password || !confirmPassword) {
      this.showNotification('Please fill all fields', 'error');
      return;
    }
    
    if (password !== confirmPassword) {
      this.showNotification('Passwords do not match', 'error');
      return;
    }
    
    if (password.length < 8) {
      this.showNotification('Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters', 'error');
      return;
    }
    
    signupBtn.disabled = true;
    signupBtn.innerHTML = '🔄 Creating account...';
    
    const attributeList = [new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email })];
    
    this.userPool.signUp(email, password, attributeList, null, (err, result) => {
      signupBtn.disabled = false;
      signupBtn.innerHTML = 'Sign Up';
      if (err) {
        let errorMessage = 'Signup failed. Please try again.';
        if (err.code === 'UsernameExistsException') errorMessage = 'Account already exists. Please login instead.';
        else if (err.code === 'InvalidPasswordException') errorMessage = 'Password must contain uppercase, lowercase, numbers, and special characters.';
        else if (err.code === 'InvalidParameterException') errorMessage = 'Invalid email format.';
        else if (err.code === 'TooManyRequestsException') errorMessage = 'Too many requests. Please try again later.';
        this.showNotification(errorMessage, 'error');
        return;
      }
      this.pendingUser = { email: email, cognitoUser: result.user };
      this.showNotification('🎉 Account created! Please check your email for verification code.', 'success');
      setTimeout(() => this.showVerificationForm(), 2000);
    });
  }

  showVerificationForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (loginForm) loginForm.classList.add('hidden');
    if (signupForm) signupForm.classList.add('hidden');
    
    const existingVerification = document.getElementById('verification-section');
    if (existingVerification) existingVerification.remove();
    
    const authCard = document.querySelector('.auth-card');
    if (authCard && this.pendingUser) {
      const verificationHtml = `
        <div id="verification-section" class="auth-form">
          <div class="auth-header" style="margin-bottom: 1.2rem;">
            <div style="font-size: 2rem; margin-bottom: .6rem;">📧</div>
            <h3>Verify Your Email</h3>
            <p style="font-size: 0.9rem; color: #8a93b2; margin-top: 0.4rem;">
              We sent a verification code to:<br/>
              <strong>${this.pendingUser.email}</strong>
            </p>
          </div>
          <div class="form-group">
            <input type="text" id="verification-code" class="form-input"
              placeholder="Enter 6-digit verification code" maxlength="6"
              style="text-align:center;font-size:1.1rem;letter-spacing:.18rem;">
          </div>
          <button id="verify-btn" class="auth-btn">Verify Email</button>
          <div style="text-align:center;margin-top:.8rem;">
            <button id="resend-code-btn" style="background:none;border:none;color:#6366f1;cursor:pointer;text-decoration:underline;">
              Resend verification code
            </button>
          </div>
          <div style="text-align:center;margin-top:.4rem;">
            <button id="back-to-login-btn" style="background:none;border:none;color:#9aa3c7;cursor:pointer;">
              ← Back to login
            </button>
          </div>
        </div>`;
      authCard.insertAdjacentHTML('beforeend', verificationHtml);
      
      const verifyBtn = document.getElementById('verify-btn');
      const codeInput = document.getElementById('verification-code');
      const resendBtn = document.getElementById('resend-code-btn');
      const backBtn = document.getElementById('back-to-login-btn');
      
      if (verifyBtn) verifyBtn.addEventListener('click', () => this.handleVerification());
      if (codeInput) {
        codeInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleVerification(); });
        codeInput.focus();
      }
      if (resendBtn) resendBtn.addEventListener('click', () => this.resendVerificationCode());
      if (backBtn) backBtn.addEventListener('click', () => this.switchTab('login'));
    }
  }

  handleVerification() {
    const codeInput = document.getElementById('verification-code');
    const verifyBtn = document.getElementById('verify-btn');
    
    if (!codeInput || !this.pendingUser) {
      this.showNotification('Verification setup error', 'error');
      return;
    }
    
    const verificationCode = codeInput.value.trim();
    if (!verificationCode || verificationCode.length !== 6) {
      this.showNotification('Please enter a valid 6-digit code', 'error');
      return;
    }
    
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '🔄 Verifying...';
    
    this.pendingUser.cognitoUser.confirmRegistration(verificationCode, true, (err) => {
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = 'Verify Email';
      if (err) {
        let errorMessage = 'Verification failed. Please try again.';
        if (err.code === 'CodeMismatchException') errorMessage = 'Invalid verification code. Please try again.';
        else if (err.code === 'ExpiredCodeException') errorMessage = 'Verification code expired. Please request a new one.';
        else if (err.code === 'TooManyFailedAttemptsException') errorMessage = 'Too many failed attempts. Please try again later.';
        this.showNotification(errorMessage, 'error');
        return;
      }
      this.showNotification('🎉 Email verified! You can now log in.', 'success');
      this.pendingUser = null;
      setTimeout(() => this.switchTab('login'), 2000);
    });
  }

  resendVerificationCode() {
    if (!this.pendingUser) {
      this.showNotification('No pending verification', 'error');
      return;
    }
    
    const resendBtn = document.getElementById('resend-code-btn');
    if (resendBtn) { resendBtn.innerHTML = '🔄 Sending...'; resendBtn.disabled = true; }
    
    this.pendingUser.cognitoUser.resendConfirmationCode((err) => {
      if (resendBtn) { resendBtn.innerHTML = 'Resend verification code'; resendBtn.disabled = false; }
      if (err) {
        this.showNotification('Failed to resend code. Please try again.', 'error');
        return;
      }
      this.showNotification('📧 New verification code sent!', 'success');
    });
  }

  handleRealLogout() {
    if (this.currentCognitoUser) this.currentCognitoUser.signOut();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
    this.currentUser = null;
    this.currentCognitoUser = null;
    this.welcomeShown = false;
    this.showNotification('👋 Logged out successfully', 'info');
    setTimeout(() => this.showAuthContainer(), 1500);
  }

  showAuthContainer() {
    const authContainer = document.querySelector('.auth-container');
    const mainApp = document.querySelector('.main-app');
    if (authContainer) authContainer.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
    this.switchTab('login');
  }

  showMainApp() {
    const authContainer = document.querySelector('.auth-container');
    const mainApp = document.querySelector('.main-app');
    if (authContainer) authContainer.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';
    
    const userWelcome = document.querySelector('.user-welcome');
    if (userWelcome && this.currentUser) userWelcome.textContent = `Welcome, ${this.currentUser}`;
    
    // Initialize with ticket creator tab active
    this.switchSection('ticket-creator');
    
    // Load saved theme
    this.loadSavedTheme();
    
    if (!this.welcomeShown) {
      setTimeout(() => {
        this.addWelcomeMessage();
        this.welcomeShown = true;
      }, 1000);
    }
  }

  // === CHAT FUNCTIONALITY === //

  async sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    if (!message) return;
    
    this.addMessageToChat(message, 'user');
    chatInput.value = '';
    this.showTypingIndicator(true);
    
    try {
      const knowledgeBaseResponse = await this.queryKnowledgeBase(message);
      if (knowledgeBaseResponse && knowledgeBaseResponse.hasKnowledgeContext === true) {
        this.addMessageToChat(knowledgeBaseResponse.response, 'ai', 'knowledge-base');
        this.addKnowledgeBaseIndicator(knowledgeBaseResponse);
        return;
      }
      const fallbackResponse = await this.sendToExistingChatAPI(message);
      this.addMessageToChat(fallbackResponse, 'ai', 'fallback');
    } catch (error) {
      this.addMessageToChat('I can help with IT support questions. Contact [helpdesk@company.com](mailto:helpdesk@company.com) for assistance.', 'ai', 'error');
    } finally {
      this.hideTypingIndicator();
    }
  }

  async queryKnowledgeBase(message) {
    try {
      const response = await fetch(this.knowledgeBaseApiUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          message: message,
          ticketContext: this.getSelectedTicketContext()
        })
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.response && data.response.length > 20) {
        const hasRealKnowledgeContext =
          data.hasKnowledgeContext === true ||
          (data.citations && data.citations.length > 0) ||
          (data.knowledgeBase && data.knowledgeBase.includes('KB'));
        const isNotGenericFallback =
          !data.response.includes('Contact helpdesk@company.com') &&
          !data.response.includes('I can help with IT support questions');
        if (hasRealKnowledgeContext && isNotGenericFallback) {
          return {
            response: data.response,
            hasKnowledgeContext: true,
            model: data.model || 'claude-3-haiku',
            citations: data.citations || [],
            knowledgeBase: data.knowledgeBase || 'AIServiceFlow-IT-KB-V2',
            timestamp: data.timestamp
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async sendToExistingChatAPI(message) {
    try {
      const response = await fetch(this.chatApiUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message })
      });
      if (!response.ok) throw new Error('Chat API error');
      const data = await response.json();
      return data.response || 'I can help with general questions. For IT support, try asking about passwords, network issues, or software installation.';
    } catch {
      return 'I can help with IT support questions. Contact [helpdesk@company.com](mailto:helpdesk@company.com) for assistance.';
    }
  }

  getSelectedTicketContext() {
    const selectedTicket = document.querySelector('.ticket-item.selected');
    if (selectedTicket) {
      const ticketId = selectedTicket.querySelector('.ticket-id')?.textContent || '';
      const ticketDetails = Array.from(selectedTicket.querySelectorAll('.detail-row'))
        .map((row) => {
          const label = row.querySelector('.detail-label')?.textContent || '';
          const value = row.querySelector('.detail-value')?.textContent || '';
          return `${label}: ${value}`;
        }).join('\n');
      return `Current Ticket Context:\n${ticketId}\n${ticketDetails}`;
    }
    return '';
  }

  showTypingIndicator(isKnowledgeBase = false) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    const existingIndicator = chatMessages.querySelector('.typing-indicator');
    if (existingIndicator) existingIndicator.remove();
    const typingDiv = document.createElement('div');
    typingDiv.className = `typing-indicator${isKnowledgeBase ? ' kb-enhanced' : ''}`;
    typingDiv.innerHTML = `
      <div class="typing-dots"><span></span><span></span><span></span></div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  hideTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) typingIndicator.remove();
  }

  addMessageToChat(message, sender, type = 'standard') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message${type !== 'standard' ? ` ${type}` : ''}`;
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message;
    messageDiv.appendChild(messageContent);
    if (sender === 'ai' && type !== 'standard') {
      const qualityDiv = document.createElement('div');
      qualityDiv.className = 'response-quality';
      let qualityIndicator = '';
      if (type === 'knowledge-base') qualityIndicator = '<span class="quality-high">Knowledge Base</span>';
      else if (type === 'fallback') qualityIndicator = '<span class="quality-medium">General AI</span>';
      else if (type === 'error') qualityIndicator = '<span class="quality-fallback">Fallback</span>';
      qualityDiv.innerHTML = qualityIndicator;
      messageDiv.appendChild(qualityDiv);
    }
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  addKnowledgeBaseIndicator(response) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'knowledge-indicator';
    indicatorDiv.innerHTML = `
      <div class="kb-info">
        <span class="kb-badge">🧠 AI Knowledge Base</span>
        <span class="kb-model">${response.model}</span>
        ${response.citations && response.citations.length > 0 ? `<span class="kb-sources">📚 ${response.citations.length} sources</span>` : ''}
      </div>
    `;
    chatMessages.appendChild(indicatorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  addWelcomeMessage() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && chatMessages.querySelector('.message.ai-message.knowledge-base')) return;
    const welcomeMessage = `👋 Welcome to your Enhanced AI Service Desk! I can help you with:

🎫 **Multi-Ticket Creation** - Describe multiple issues at once
🔐 Password resets and account issues
🌐 Network and VPN troubleshooting  
💻 Software installation and configuration
📋 Company IT policies and procedures
🎯 Smart ticket routing and prioritization

I'm powered by AWS Bedrock AI with access to your company's IT knowledge base for accurate, contextual responses. Try describing multiple issues in one message!`;

    this.addMessageToChat(welcomeMessage, 'ai', 'knowledge-base');
    this.addKnowledgeBaseIndicator({ model: 'claude-3-haiku', citations: [], knowledgeBase: 'AIServiceFlow-IT-KB-V2' });
  }

  // === TICKET MANAGEMENT === //

  async loadTickets() {
    try {
      const ticketsContainer = document.getElementById('tickets-container');
      if (ticketsContainer) ticketsContainer.innerHTML = '<div class="loading-state">Loading tickets...</div>';
      const response = await fetch(this.apiUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      this.tickets = Array.isArray(data) ? data : (data.tickets || []);
      this.filteredTickets = [...this.tickets];
      this.renderTickets();
    } catch (error) {
      const ticketsContainer = document.getElementById('tickets-container');
      if (ticketsContainer) ticketsContainer.innerHTML = '<div class="loading-state">❌ Failed to load tickets</div>';
    }
  }

  renderTickets() {
    const ticketsContainer = document.getElementById('tickets-container');
    if (!ticketsContainer) return;
    if (this.filteredTickets.length === 0) {
      ticketsContainer.innerHTML = '<div class="loading-state">📋 No tickets found</div>';
      return;
    }
    const ticketsHtml = this.filteredTickets.map((ticket) => {
      const statusClass = `status-${ticket.status?.toLowerCase() || 'unknown'}`;
      const priorityClass = `priority-${ticket.priority?.toLowerCase() || 'medium'}`;
      
      // Show multi-ticket batch indicator
      const batchIndicator = ticket.isMultiTicketBatch ? 
        `<span class="batch-indicator">📦 Batch ${ticket.batchSequence}/${ticket.totalInBatch}</span>` : '';
      
      return `
        <div class="ticket-item" data-ticket-id="${ticket.id || ticket.ticketId}" onclick="aiServiceFlow.selectTicket(this)">
          <div class="ticket-header">
            <div class="ticket-id">${ticket.id || ticket.ticketId || 'N/A'}</div>
            ${batchIndicator}
          </div>
          <div class="ticket-details">
            <div class="detail-row"><span class="detail-label">Subject:</span><span class="detail-value">${ticket.subject || ticket.title || 'No subject'}</span></div>
            <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value"><span class="status-badge ${statusClass}">${ticket.status || 'Unknown'}</span></span></div>
            <div class="detail-row"><span class="detail-label">Priority:</span><span class="detail-value ${priorityClass}">${ticket.priority || 'Medium'}</span></div>
            <div class="detail-row"><span class="detail-label">Assignee:</span><span class="detail-value">${ticket.assignee || 'Unassigned'}</span></div>
            <div class="detail-row"><span class="detail-label">Created:</span><span class="detail-value">${ticket.created || ticket.createdDate || 'Unknown'}</span></div>
          </div>
        </div>`;
    }).join('');
    ticketsContainer.innerHTML = ticketsHtml;
  }

  selectTicket(ticketElement) {
    document.querySelectorAll('.ticket-item').forEach((item) => item.classList.remove('selected'));
    ticketElement.classList.add('selected');
  }

  searchTickets(query) {
    if (!query) {
      this.filteredTickets = [...this.tickets];
    } else {
      this.filteredTickets = this.tickets.filter((t) => {
        const fields = [t.id, t.ticketId, t.subject, t.title, t.description, t.assignee, t.status, t.priority];
        return fields.some((f) => f && f.toString().toLowerCase().includes(query.toLowerCase()));
      });
    }
    this.renderTickets();
  }

  setActiveFilter(activeBtn) {
    document.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  filterTickets(status) {
    if (!status || status === 'all') {
      this.filteredTickets = [...this.tickets];
    } else {
      this.filteredTickets = this.tickets.filter((t) => t.status && t.status.toLowerCase() === status.toLowerCase());
    }
    this.renderTickets();
  }

  // === UTILITY FUNCTIONS === //

  showNotification(message, type = 'info') {
    try {
      const n = document.querySelector('.notification');
      if (!n) return;
      n.textContent = message;
      n.className = `notification ${type}`;
      n.style.display = 'block';
      setTimeout(() => (n.style.display = 'none'), 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback to console log if notification element not available
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  window.aiServiceFlow = new AIServiceFlow();
});
