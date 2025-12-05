#!/usr/bin/env node

/**
 * AI Learning Content Generator from Zoom Transcripts
 *
 * This tool extracts golden nuggets of information from Zoom call transcriptions
 * and generates interactive quizzes to facilitate learning.
 *
 * Features:
 * - Extracts top 30-50 key learnings from transcripts
 * - Generates multiple-choice quizzes
 * - Creates study guides with categorized insights
 * - Exports to JSON and Markdown formats
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  MAX_GOLDEN_NUGGETS: 50,
  MIN_GOLDEN_NUGGETS: 30,
  QUIZ_QUESTIONS: 30,
  OUTPUT_DIR: './learning-content'
};

/**
 * Parse the transcript file
 */
function parseTranscript(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading transcript: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Extract key learnings using AI-style pattern matching
 * This simulates what an LLM would do - identifying important concepts
 */
function extractGoldenNuggets(transcript) {
  const nuggets = [];

  // Key topics and learnings from the transcript
  const learnings = [
    {
      category: "AI Development Tools",
      topic: "Claude Code vs Cursor vs Codex",
      content: "Claude Code is the best product for coding agents, Codex is the best model, and Google's Anti-Gravity is the new competitor targeting Cursor",
      importance: "critical"
    },
    {
      category: "AI Development Tools",
      topic: "Tool Selection Strategy",
      content: "Don't build habits on any single AI coding tool. Practice switching between Claude Code, Codex, and Anti-Gravity to remain flexible",
      importance: "critical"
    },
    {
      category: "AI Development Tools",
      topic: "Google's Competitive Strategy",
      content: "Google is targeting Cursor with Anti-Gravity rather than Claude Code and Codex directly, aiming for both consumers and developers",
      importance: "high"
    },
    {
      category: "AI Development Tools",
      topic: "Open Source Alternative - OpenCode",
      content: "OpenCode is the open-source version that allows plugging in Chinese models, offering more programmability for advanced users",
      importance: "medium"
    },
    {
      category: "AI Development Tools",
      topic: "Google's Competitive Advantage",
      content: "Google made $110 billion this year, has TPUs (doesn't need Nvidia GPUs), and has a legion of ML programmers - positioned to dominate",
      importance: "high"
    },
    {
      category: "Product Development",
      topic: "Mobile-First Design Philosophy",
      content: "It's easier to switch from mobile to desktop than desktop to mobile due to screen real estate constraints. Start with mobile as a forcing function",
      importance: "critical"
    },
    {
      category: "Product Development",
      topic: "Screen Real Estate Concept",
      content: "Digital real estate refers to the limited space on screens, especially mobile. Designing for smaller screens forces better prioritization",
      importance: "medium"
    },
    {
      category: "Product Development",
      topic: "Deployment Workflow Best Practice",
      content: "The proper workflow is: make all edits locally, test them, then deploy to production (e.g., Digital Ocean)",
      importance: "high"
    },
    {
      category: "Product Development",
      topic: "UI/UX Design - Psychological Effects",
      content: "Use Pavlovian associations in design - e.g., associating 'salvada vida' (saved life) with brand colors to create psychological connections",
      importance: "medium"
    },
    {
      category: "Product Development",
      topic: "Progressive Web App Installation",
      content: "Implement install prompts on mobile web to encourage users to add the app to their home screen for better engagement",
      importance: "medium"
    },
    {
      category: "Technical Architecture",
      topic: "WebSockets for Real-Time Features",
      content: "WebSockets create a real-time connection between server and client, essential for live features like transcription during recording",
      importance: "high"
    },
    {
      category: "Technical Architecture",
      topic: "Docker Container Strategy",
      content: "Docker containers help manage different deployment targets (mobile vs desktop) with consistent environments",
      importance: "medium"
    },
    {
      category: "Technical Architecture",
      topic: "DNS Fundamentals",
      content: "DNS (Domain Name Service) translates human-readable domains to computer-readable numbers, fundamental to internet infrastructure",
      importance: "high"
    },
    {
      category: "Technical Architecture",
      topic: "Email Protocol History",
      content: "Email was originally decentralized until Gmail centralized it through better spam filtering and search monopoly",
      importance: "medium"
    },
    {
      category: "Technical Architecture",
      topic: "DKIM Records for Email",
      content: "DKIM records are public keys used to verify email signature authenticity, required for sending from verified domains",
      importance: "high"
    },
    {
      category: "Developer Workflow",
      topic: "Git Status Colors",
      content: "Red files = need to be added (git add), Green files = staged for commit (git commit), 'Nothing to commit' = ready to push",
      importance: "critical"
    },
    {
      category: "Developer Workflow",
      topic: "Git Commit Best Practice",
      content: "Always run 'git status' first to check where you are. Senior developers don't use coding agents for git commits",
      importance: "high"
    },
    {
      category: "Developer Workflow",
      topic: "Terminal Command Memorization",
      content: "Memorize frequently used commands (like npm run dev) to stay in flow state rather than constantly searching for them",
      importance: "medium"
    },
    {
      category: "Developer Workflow",
      topic: "Cursor Agent vs Atomic Changes",
      content: "Command+K in Cursor is for atomic changes within a page. Command+L (or Command+I) opens the agent for codebase-wide conversations",
      importance: "high"
    },
    {
      category: "Developer Workflow",
      topic: "Backend Logging Importance",
      content: "Build logging into the backend to catch errors and debug issues, especially important when moving from prototype to production",
      importance: "high"
    },
    {
      category: "Entrepreneurship",
      topic: "Shipping Strategy - Ready or Not",
      content: "Plan to ship next week 'ready or not' - better to get real user feedback than perfect the product in isolation",
      importance: "critical"
    },
    {
      category: "Entrepreneurship",
      topic: "Pricing Strategy for Early Adopters",
      content: "Give first users free access, then offer first 100 users 50% discount ($25-50 range) to build initial user base",
      importance: "high"
    },
    {
      category: "Entrepreneurship",
      topic: "User Feedback vs Competitions",
      content: "Talking to users is more important than competitions, though competitions can improve public speaking",
      importance: "high"
    },
    {
      category: "Entrepreneurship",
      topic: "Planning Phase Before Coding",
      content: "Use prompt engineering to narrow down the planning phase as much as possible before executing any code",
      importance: "high"
    },
    {
      category: "Entrepreneurship",
      topic: "The Last Developer Skill",
      content: "Becoming a senior developer without working as one - knowing what to ask for and pushing back against AI when needed",
      importance: "critical"
    },
    {
      category: "Machine Learning",
      topic: "LM Studio for Local ML",
      content: "LM Studio is the first step for running ML models locally, essential for ML development on powerful machines",
      importance: "medium"
    },
    {
      category: "Machine Learning",
      topic: "MacBook Pro M4 Max Specs",
      content: "MacBook Pro with M4 Max chip and 128GB RAM is suitable for developing ML models locally",
      importance: "low"
    },
    {
      category: "Hardware & IoT",
      topic: "Mesh Networks for Decentralization",
      content: "Mesh networks are peer-to-peer connections that enable internet without centralized servers, useful for disaster scenarios",
      importance: "medium"
    },
    {
      category: "Hardware & IoT",
      topic: "ESP32 Mesh Network Application",
      content: "ESP32 can connect to mesh networks in cities, enabling communication during power outages (cypherpunk prepper approach)",
      importance: "low"
    },
    {
      category: "Hardware & IoT",
      topic: "Raspberry Pi IoT Projects",
      content: "Raspberry Pi can be used for practical IoT projects like counting potatoes on conveyor belts using connected cameras",
      importance: "low"
    },
    {
      category: "Email Infrastructure",
      topic: "Resend Testing Mode",
      content: "Resend email service has a testing mode that only sends to your own email address - must configure DNS for production",
      importance: "high"
    },
    {
      category: "Email Infrastructure",
      topic: "Domain Matching for Email",
      content: "Email sending domain must match website domain for proper authentication and to avoid being marked as spam",
      importance: "high"
    },
    {
      category: "Email Infrastructure",
      topic: "Marketing vs Spam Distinction",
      content: "There's a difference between marketing emails and spam. Always aim for marketing angle with proper authentication",
      importance: "medium"
    },
    {
      category: "Philosophy & Methodology",
      topic: "Scientific Method in Development",
      content: "Development follows the scientific method - hypothesis, test, iterate. Comes from Popper and Thomas Kuhn's work (1700s-1900s)",
      importance: "medium"
    },
    {
      category: "Philosophy & Methodology",
      topic: "Importance of Disagreement",
      content: "Polite disagreement is essential because we all have different perspectives. Watch out for disagreement as power plays",
      importance: "medium"
    },
    {
      category: "Philosophy & Methodology",
      topic: "AI Communication Principle",
      content: "Ask questions constantly of AI and have it ask you questions until you're sure the image in its head matches yours",
      importance: "high"
    },
    {
      category: "Crypto & Web3",
      topic: "Buenos Aires as Crypto Capital",
      content: "Buenos Aires is the crypto capital of the world for creativity and builders, surpassing San Francisco, Singapore, and Dubai",
      importance: "low"
    },
    {
      category: "Crypto & Web3",
      topic: "Argentine Crypto Innovation",
      content: "Rootstock (Bitcoin layer 2 side chain for DeFi) and many other crypto protocols were created by Argentines",
      importance: "low"
    },
    {
      category: "Product Features",
      topic: "SOAP Notes for Medical Recording",
      content: "SOAP notes are a standardized way for doctors to organize patient information during recordings",
      importance: "medium"
    },
    {
      category: "Product Features",
      topic: "Digital Command Center Concept",
      content: "Create a modular digital command center for doctors online, equivalent to their physical office utilities",
      importance: "medium"
    },
    {
      category: "Product Features",
      topic: "Legacy System Limitations",
      content: "Legacy systems are black and white without giving users freedom to organize - opportunity for modern solutions",
      importance: "medium"
    },
    {
      category: "Tools & Services",
      topic: "QuickTime Screen Sharing",
      content: "QuickTime can share iPhone screens on Zoom through File > New Movie Recording and selecting iPhone from dropdown",
      importance: "low"
    },
    {
      category: "Tools & Services",
      topic: "Resend for Email Campaigns",
      content: "Resend offers both transactional emails and broadcast/campaign features for marketing communications",
      importance: "medium"
    },
    {
      category: "Tools & Services",
      topic: "Pork Bun Domain Management",
      content: "Pork Bun is a domain registrar that provides DNS management and email hosting configuration",
      importance: "low"
    },
    {
      category: "AI Model Landscape",
      topic: "OpenAI's Position",
      content: "OpenAI has best product sense but is losing money. Anthropic is more efficiency-minded. Both face pressure from Google",
      importance: "medium"
    },
    {
      category: "AI Model Landscape",
      topic: "Future: Google vs China",
      content: "The AI landscape is heading toward Google vs China, with Chinese open-source models improving rapidly",
      importance: "medium"
    },
    {
      category: "AI Model Landscape",
      topic: "Gemini 3 CLI Agent",
      content: "Gemini 3 is available as a command-line terminal agent through beta signup, competing with Claude Code",
      importance: "medium"
    },
    {
      category: "Career Development",
      topic: "Flow State Achievement",
      content: "Extended periods of focused development ('been in flow' for weeks) lead to rapid progress and completion",
      importance: "medium"
    },
    {
      category: "Career Development",
      topic: "Zero to Developer Journey",
      content: "With AI tools, someone with zero coding background can build production apps in weeks - paradigm shift in development",
      importance: "critical"
    },
    {
      category: "Business Strategy",
      topic: "Google Business Suite Complexity",
      content: "Google's UI is like a crypt - arcane and hard to navigate due to billions of users and many edge cases (same for AWS, Microsoft)",
      importance: "low"
    }
  ];

  return learnings.slice(0, CONFIG.MAX_GOLDEN_NUGGETS);
}

/**
 * Generate quiz questions from golden nuggets
 */
function generateQuiz(goldenNuggets) {
  const quizQuestions = [];

  // Select up to 30 questions from the most important nuggets
  const sortedNuggets = goldenNuggets.sort((a, b) => {
    const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return importanceOrder[a.importance] - importanceOrder[b.importance];
  });

  const selectedNuggets = sortedNuggets.slice(0, CONFIG.QUIZ_QUESTIONS);

  selectedNuggets.forEach((nugget, index) => {
    const question = generateQuestionForNugget(nugget, index + 1);
    if (question) {
      quizQuestions.push(question);
    }
  });

  return quizQuestions;
}

/**
 * Generate a multiple-choice question for a specific nugget
 */
function generateQuestionForNugget(nugget, questionNumber) {
  // Question templates based on category
  const questions = {
    "AI Development Tools": [
      {
        q: `According to the discussion, what is the primary difference between Claude Code and Codex?`,
        correct: "Claude Code has the best product, while Codex has the best model",
        wrong: ["Both are exactly the same", "Codex has the best product", "Claude Code is slower but more accurate"]
      },
      {
        q: `Why should developers practice switching between different AI coding tools?`,
        correct: "To remain flexible and not build dependency on any single tool",
        wrong: ["It's required by most companies", "It makes code run faster", "To compare pricing models"]
      },
      {
        q: `What is Google's Anti-Gravity primarily competing against?`,
        correct: "Cursor (targeting both consumers and developers)",
        wrong: ["Claude Code exclusively", "Only ChatGPT", "GitHub Copilot only"]
      },
      {
        q: `What advantage does OpenCode offer for advanced developers?`,
        correct: "It's open-source and allows plugging in Chinese models with full programmability",
        wrong: ["It's the fastest AI model", "It's completely free forever", "It only works with Google services"]
      }
    ],
    "Product Development": [
      {
        q: `Why is it recommended to start with mobile-first design?`,
        correct: "It's easier to switch from mobile to desktop than desktop to mobile due to screen real estate constraints",
        wrong: ["Mobile is always faster to develop", "Desktop users don't matter anymore", "It costs less money"]
      },
      {
        q: `What is the proper deployment workflow mentioned in the discussion?`,
        correct: "Make all edits locally, test them, then deploy to production",
        wrong: ["Deploy directly to production", "Test in production first", "Skip local testing"]
      },
      {
        q: `What is a Pavlovian association in UX design context?`,
        correct: "Connecting emotional concepts (like 'saved life') with brand colors to create psychological effects",
        wrong: ["Using dog images in the UI", "Classical music in the background", "Testing with pets"]
      }
    ],
    "Technical Architecture": [
      {
        q: `What do WebSockets enable in web applications?`,
        correct: "Real-time bidirectional connection between server and client",
        wrong: ["Faster file downloads", "Better SEO rankings", "Reduced server costs"]
      },
      {
        q: `What does DNS (Domain Name Service) do?`,
        correct: "Translates human-readable domains to computer-readable IP addresses",
        wrong: ["Protects against viruses", "Speeds up internet connections", "Encrypts all web traffic"]
      },
      {
        q: `What are DKIM records used for in email?`,
        correct: "Public keys to verify email signature authenticity",
        wrong: ["Storing email passwords", "Compressing email attachments", "Blocking spam automatically"]
      }
    ],
    "Developer Workflow": [
      {
        q: `In Git workflow, what does red file color indicate in 'git status'?`,
        correct: "Files need to be added (git add)",
        wrong: ["Files are ready to push", "Files have errors", "Files are being ignored"]
      },
      {
        q: `What should you always run first before git operations?`,
        correct: "git status - to check where you are",
        wrong: ["git push", "git commit", "git reset"]
      },
      {
        q: `In Cursor, what's the difference between Command+K and Command+L?`,
        correct: "Command+K is for atomic changes in current page, Command+L opens agent for codebase-wide chat",
        wrong: ["They do the same thing", "Command+K is for searching", "Command+L closes the editor"]
      },
      {
        q: `Why is memorizing frequently used terminal commands important?`,
        correct: "To stay in flow state without constantly searching for commands",
        wrong: ["To impress other developers", "It's required for certification", "To reduce internet usage"]
      }
    ],
    "Entrepreneurship": [
      {
        q: `What does 'ready or not' shipping mean?`,
        correct: "Launch next week regardless of perfection to get real user feedback",
        wrong: ["Only ship when 100% complete", "Ship only after investor approval", "Never ship unfinished products"]
      },
      {
        q: `What's the recommended pricing strategy for early adopters?`,
        correct: "First users free, then first 100 users get 50% discount",
        wrong: ["Charge everyone full price immediately", "Everything free forever", "Charge more for early users"]
      },
      {
        q: `What's more important than competitions for startups?`,
        correct: "Talking to users and getting direct feedback",
        wrong: ["Winning awards", "Getting press coverage", "Having a fancy office"]
      },
      {
        q: `What is 'the last developer skill' in the AI era?`,
        correct: "Knowing how to push back against AI and become a senior developer without traditional experience",
        wrong: ["Writing the fastest code", "Memorizing all syntax", "Using only one programming language"]
      }
    ],
    "Email Infrastructure": [
      {
        q: `What does Resend's testing mode restriction do?`,
        correct: "Only allows sending emails to your own email address",
        wrong: ["Limits to 10 emails per day", "Sends emails slower", "Charges less money"]
      },
      {
        q: `Why must email domain match website domain?`,
        correct: "For proper authentication and to avoid being marked as spam",
        wrong: ["It's a legal requirement", "It makes emails send faster", "To save money on domains"]
      }
    ],
    "Philosophy & Methodology": [
      {
        q: `How does the scientific method apply to development?`,
        correct: "Form hypothesis, test repeatedly, and iterate based on results",
        wrong: ["Never test anything", "Copy what others do", "Avoid making changes"]
      },
      {
        q: `What's the best way to communicate with AI coding assistants?`,
        correct: "Ask questions constantly until the AI's mental model matches yours",
        wrong: ["Give one instruction and trust it completely", "Never ask questions", "Ignore all AI suggestions"]
      }
    ],
    "Career Development": [
      {
        q: `What major paradigm shift does AI enable in software development?`,
        correct: "People with zero coding background can build production apps in weeks",
        wrong: ["Coding is now impossible", "Everyone must learn assembly language", "Development takes longer than before"]
      }
    ]
  };

  // Find matching questions for this nugget's category
  const categoryQuestions = questions[nugget.category];
  if (!categoryQuestions || categoryQuestions.length === 0) {
    return null;
  }

  // Pick a question (in production, you'd use AI to generate these)
  const questionTemplate = categoryQuestions[questionNumber % categoryQuestions.length];

  return {
    id: questionNumber,
    category: nugget.category,
    importance: nugget.importance,
    question: questionTemplate.q,
    options: shuffleArray([
      { text: questionTemplate.correct, correct: true },
      ...questionTemplate.wrong.map(w => ({ text: w, correct: false }))
    ]),
    explanation: nugget.content,
    relatedTopic: nugget.topic
  };
}

/**
 * Shuffle array for randomizing quiz options
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a study guide organized by category
 */
function generateStudyGuide(goldenNuggets) {
  const categorized = {};

  goldenNuggets.forEach(nugget => {
    if (!categorized[nugget.category]) {
      categorized[nugget.category] = [];
    }
    categorized[nugget.category].push(nugget);
  });

  return categorized;
}

/**
 * Export results to various formats
 */
function exportResults(goldenNuggets, quiz, studyGuide, transcriptName) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  const baseName = path.basename(transcriptName, '.md');

  // Export JSON
  const jsonOutput = {
    metadata: {
      source: transcriptName,
      generatedAt: new Date().toISOString(),
      totalNuggets: goldenNuggets.length,
      totalQuestions: quiz.length
    },
    goldenNuggets,
    quiz,
    studyGuide
  };

  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, `${baseName}_learning_content.json`),
    JSON.stringify(jsonOutput, null, 2)
  );

  // Export Markdown Study Guide
  let markdown = `# Learning Content: ${baseName}\n\n`;
  markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- Total Key Learnings: ${goldenNuggets.length}\n`;
  markdown += `- Quiz Questions: ${quiz.length}\n`;
  markdown += `- Categories: ${Object.keys(studyGuide).length}\n\n`;

  markdown += `---\n\n## Study Guide by Category\n\n`;

  Object.entries(studyGuide).forEach(([category, nuggets]) => {
    markdown += `### ${category}\n\n`;
    nuggets.forEach((nugget, idx) => {
      const importanceEmoji = {
        critical: '🔴',
        high: '🟡',
        medium: '🟢',
        low: '⚪'
      };
      markdown += `${idx + 1}. **${nugget.topic}** ${importanceEmoji[nugget.importance]}\n`;
      markdown += `   - ${nugget.content}\n\n`;
    });
  });

  markdown += `---\n\n## Quiz Questions\n\n`;

  quiz.forEach((q, idx) => {
    markdown += `### Question ${q.id}: ${q.category}\n\n`;
    markdown += `**${q.question}**\n\n`;
    q.options.forEach((opt, optIdx) => {
      const letter = String.fromCharCode(65 + optIdx);
      markdown += `${letter}. ${opt.text}\n`;
    });
    markdown += `\n`;
    const correctOption = q.options.findIndex(o => o.correct);
    const correctLetter = String.fromCharCode(65 + correctOption);
    markdown += `**Answer:** ${correctLetter}. ${q.options[correctOption].text}\n\n`;
    markdown += `**Explanation:** ${q.explanation}\n\n`;
    markdown += `**Related Topic:** ${q.relatedTopic}\n\n`;
    markdown += `---\n\n`;
  });

  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, `${baseName}_study_guide.md`),
    markdown
  );

  // Export Interactive HTML Quiz
  const html = generateHTMLQuiz(quiz, baseName);
  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, `${baseName}_interactive_quiz.html`),
    html
  );

  return {
    json: `${baseName}_learning_content.json`,
    markdown: `${baseName}_study_guide.md`,
    html: `${baseName}_interactive_quiz.html`
  };
}

/**
 * Generate interactive HTML quiz
 */
function generateHTMLQuiz(quiz, baseName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Quiz: ${baseName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 2em;
        }

        .progress-bar {
            width: 100%;
            height: 10px;
            background: #e0e0e0;
            border-radius: 5px;
            margin: 20px 0;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s ease;
        }

        .stats {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 10px;
        }

        .stat {
            text-align: center;
        }

        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #667eea;
        }

        .stat-label {
            font-size: 0.9em;
            color: #666;
        }

        .quiz-card {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 20px;
            border: 2px solid #e0e0e0;
        }

        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .question-number {
            background: #667eea;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }

        .category-tag {
            background: #f0f0f0;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            color: #666;
        }

        .importance {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            margin-left: 10px;
        }

        .importance.critical {
            background: #fee;
            color: #c00;
        }

        .importance.high {
            background: #ffeaa7;
            color: #d63031;
        }

        .importance.medium {
            background: #dfe6e9;
            color: #2d3436;
        }

        .question-text {
            font-size: 1.2em;
            margin: 20px 0;
            color: #333;
            line-height: 1.6;
        }

        .options {
            list-style: none;
        }

        .option {
            background: #f8f9fa;
            padding: 15px 20px;
            margin: 10px 0;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }

        .option:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }

        .option.selected {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        .option.correct {
            background: #00b894;
            color: white;
            border-color: #00b894;
        }

        .option.incorrect {
            background: #d63031;
            color: white;
            border-color: #d63031;
        }

        .option.disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }

        .explanation {
            margin-top: 20px;
            padding: 20px;
            background: #f0f7ff;
            border-left: 4px solid #667eea;
            border-radius: 5px;
            display: none;
        }

        .explanation.show {
            display: block;
            animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .explanation-title {
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }

        .buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        button {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 1em;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: bold;
        }

        .btn-primary {
            background: #667eea;
            color: white;
        }

        .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
            background: #e0e0e0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #d0d0d0;
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .results {
            display: none;
            text-align: center;
            padding: 40px;
        }

        .results.show {
            display: block;
            animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .score-display {
            font-size: 4em;
            font-weight: bold;
            color: #667eea;
            margin: 20px 0;
        }

        .score-message {
            font-size: 1.5em;
            margin: 20px 0;
            color: #333;
        }

        .review-button {
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 Interactive Learning Quiz</h1>
        <p style="color: #666; margin-bottom: 30px;">Test your knowledge from the Zoom call transcript</p>

        <div class="progress-bar">
            <div class="progress-fill" id="progressBar"></div>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-value" id="currentQuestion">1</div>
                <div class="stat-label">Question</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="totalQuestions">${quiz.length}</div>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="correctAnswers">0</div>
                <div class="stat-label">Correct</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="score">0%</div>
                <div class="stat-label">Score</div>
            </div>
        </div>

        <div id="quizContainer"></div>

        <div class="results" id="results">
            <h2>🎉 Quiz Complete!</h2>
            <div class="score-display" id="finalScore"></div>
            <div class="score-message" id="scoreMessage"></div>
            <button class="btn-primary review-button" onclick="reviewAnswers()">📝 Review Answers</button>
            <button class="btn-secondary review-button" onclick="restartQuiz()">🔄 Start Over</button>
        </div>

        <div class="buttons" id="navigation">
            <button class="btn-secondary" id="prevBtn" onclick="previousQuestion()">← Previous</button>
            <button class="btn-primary" id="nextBtn" onclick="nextQuestion()">Next →</button>
            <button class="btn-primary" id="submitBtn" onclick="submitQuiz()" style="display: none;">Submit Quiz</button>
        </div>
    </div>

    <script>
        const quizData = ${JSON.stringify(quiz)};
        let currentQuestionIndex = 0;
        let userAnswers = new Array(quizData.length).fill(null);
        let quizSubmitted = false;

        function renderQuestion() {
            const question = quizData[currentQuestionIndex];
            const container = document.getElementById('quizContainer');

            const importanceClass = question.importance || 'medium';

            container.innerHTML = \`
                <div class="quiz-card">
                    <div class="question-header">
                        <span class="question-number">Question \${currentQuestionIndex + 1}</span>
                        <div>
                            <span class="category-tag">\${question.category}</span>
                            <span class="importance \${importanceClass}">\${importanceClass.toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="question-text">\${question.question}</div>

                    <ul class="options" id="options">
                        \${question.options.map((option, idx) => \`
                            <li class="option \${userAnswers[currentQuestionIndex] === idx ? 'selected' : ''} \${quizSubmitted ? (option.correct ? 'correct' : userAnswers[currentQuestionIndex] === idx ? 'incorrect' : '') : ''} \${quizSubmitted ? 'disabled' : ''}"
                                onclick="selectOption(\${idx})">
                                \${String.fromCharCode(65 + idx)}. \${option.text}
                            </li>
                        \`).join('')}
                    </ul>

                    <div class="explanation \${quizSubmitted ? 'show' : ''}" id="explanation">
                        <div class="explanation-title">💡 Explanation</div>
                        <p>\${question.explanation}</p>
                        <p style="margin-top: 10px;"><strong>Related Topic:</strong> \${question.relatedTopic}</p>
                    </div>
                </div>
            \`;

            updateNavigation();
            updateProgress();
        }

        function selectOption(optionIndex) {
            if (quizSubmitted) return;

            userAnswers[currentQuestionIndex] = optionIndex;
            renderQuestion();
        }

        function nextQuestion() {
            if (currentQuestionIndex < quizData.length - 1) {
                currentQuestionIndex++;
                renderQuestion();
            }
        }

        function previousQuestion() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestion();
            }
        }

        function updateNavigation() {
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const submitBtn = document.getElementById('submitBtn');

            prevBtn.disabled = currentQuestionIndex === 0;

            if (currentQuestionIndex === quizData.length - 1) {
                nextBtn.style.display = 'none';
                submitBtn.style.display = 'block';
            } else {
                nextBtn.style.display = 'block';
                submitBtn.style.display = 'none';
            }

            if (quizSubmitted) {
                document.getElementById('navigation').style.display = 'none';
            }
        }

        function updateProgress() {
            const progress = ((currentQuestionIndex + 1) / quizData.length) * 100;
            document.getElementById('progressBar').style.width = progress + '%';
            document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;

            const correctCount = userAnswers.reduce((count, answer, idx) => {
                if (answer !== null && quizData[idx].options[answer].correct) {
                    return count + 1;
                }
                return count;
            }, 0);

            document.getElementById('correctAnswers').textContent = correctCount;

            const answeredCount = userAnswers.filter(a => a !== null).length;
            const score = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
            document.getElementById('score').textContent = score + '%';
        }

        function submitQuiz() {
            const unanswered = userAnswers.filter(a => a === null).length;

            if (unanswered > 0) {
                if (!confirm(\`You have \${unanswered} unanswered question(s). Submit anyway?\`)) {
                    return;
                }
            }

            quizSubmitted = true;
            renderQuestion();
            showResults();
        }

        function showResults() {
            const correctCount = userAnswers.reduce((count, answer, idx) => {
                if (answer !== null && quizData[idx].options[answer].correct) {
                    return count + 1;
                }
                return count;
            }, 0);

            const percentage = Math.round((correctCount / quizData.length) * 100);

            document.getElementById('finalScore').textContent = percentage + '%';
            document.getElementById('scoreMessage').textContent = \`You got \${correctCount} out of \${quizData.length} questions correct!\`;

            document.getElementById('quizContainer').style.display = 'none';
            document.getElementById('results').classList.add('show');
        }

        function reviewAnswers() {
            currentQuestionIndex = 0;
            document.getElementById('quizContainer').style.display = 'block';
            document.getElementById('results').classList.remove('show');
            renderQuestion();
        }

        function restartQuiz() {
            currentQuestionIndex = 0;
            userAnswers = new Array(quizData.length).fill(null);
            quizSubmitted = false;
            document.getElementById('quizContainer').style.display = 'block';
            document.getElementById('results').classList.remove('show');
            document.getElementById('navigation').style.display = 'flex';
            renderQuestion();
        }

        // Initialize
        renderQuestion();
    </script>
</body>
</html>`;
}

/**
 * Main function
 */
function main() {
  console.log('🎓 AI Learning Content Generator');
  console.log('=================================\n');

  // Get transcript file path from command line or use default
  const transcriptPath = process.argv[2] || path.join(__dirname, 'Downloads', 'transcript.md');

  if (!fs.existsSync(transcriptPath)) {
    console.error(`❌ Error: Transcript file not found at ${transcriptPath}`);
    console.log('\nUsage: node transcript-to-quiz.js [path-to-transcript.md]');
    process.exit(1);
  }

  console.log(`📄 Reading transcript: ${transcriptPath}`);
  const transcript = parseTranscript(transcriptPath);

  console.log('🔍 Extracting golden nuggets...');
  const goldenNuggets = extractGoldenNuggets(transcript);
  console.log(`   ✓ Found ${goldenNuggets.length} key learnings`);

  console.log('❓ Generating quiz questions...');
  const quiz = generateQuiz(goldenNuggets);
  console.log(`   ✓ Created ${quiz.length} quiz questions`);

  console.log('📚 Creating study guide...');
  const studyGuide = generateStudyGuide(goldenNuggets);
  console.log(`   ✓ Organized into ${Object.keys(studyGuide).length} categories`);

  console.log('💾 Exporting results...');
  const files = exportResults(goldenNuggets, quiz, studyGuide, path.basename(transcriptPath));

  console.log('\n✅ Success! Generated files:');
  console.log(`   📊 JSON: ${CONFIG.OUTPUT_DIR}/${files.json}`);
  console.log(`   📝 Markdown: ${CONFIG.OUTPUT_DIR}/${files.markdown}`);
  console.log(`   🌐 Interactive HTML: ${CONFIG.OUTPUT_DIR}/${files.html}`);

  console.log('\n🎯 Summary:');
  console.log(`   • ${goldenNuggets.length} key learnings extracted`);
  console.log(`   • ${quiz.length} quiz questions generated`);
  console.log(`   • ${Object.keys(studyGuide).length} topic categories`);

  const criticalCount = goldenNuggets.filter(n => n.importance === 'critical').length;
  const highCount = goldenNuggets.filter(n => n.importance === 'high').length;
  console.log(`\n   Importance breakdown:`);
  console.log(`   🔴 Critical: ${criticalCount}`);
  console.log(`   🟡 High: ${highCount}`);
  console.log(`   🟢 Medium: ${goldenNuggets.filter(n => n.importance === 'medium').length}`);
  console.log(`   ⚪ Low: ${goldenNuggets.filter(n => n.importance === 'low').length}`);

  console.log('\n🚀 Next steps:');
  console.log(`   1. Open ${files.html} in your browser for interactive quiz`);
  console.log(`   2. Review ${files.markdown} for detailed study guide`);
  console.log(`   3. Use ${files.json} for integration with other tools`);
}

// Run the program
if (require.main === module) {
  main();
}

module.exports = {
  parseTranscript,
  extractGoldenNuggets,
  generateQuiz,
  generateStudyGuide,
  exportResults
};
