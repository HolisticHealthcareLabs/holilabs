# 🎓 AI Learning Content Generator from Zoom Transcripts

Transform your Zoom call transcriptions into structured learning materials with AI-powered quiz generation.

## ✨ Features

- **🔍 Smart Content Extraction**: Automatically identifies the top 30-50 golden nuggets from transcripts
- **❓ Interactive Quizzes**: Generates 30 multiple-choice questions with explanations
- **📚 Study Guides**: Organizes learnings by category with importance rankings
- **🎨 Multiple Formats**: Exports to JSON, Markdown, and interactive HTML
- **📊 Progress Tracking**: Beautiful interactive quiz interface with real-time scoring
- **🎯 Importance Ranking**: Labels content as Critical, High, Medium, or Low importance

## 🚀 Quick Start

### Installation

No installation required! Just Node.js (which you already have).

### Usage

```bash
# Run with default transcript location
node transcript-to-quiz.js

# Or specify a custom transcript path
node transcript-to-quiz.js /path/to/your/transcript.md
```

### Example

```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
node transcript-to-quiz.js ~/Downloads/transcript.md
```

## 📁 Output Files

The tool generates three files in the `./learning-content` directory:

1. **JSON File** (`*_learning_content.json`)
   - Machine-readable format
   - Contains all nuggets, quiz questions, and study guide
   - Perfect for integration with other tools

2. **Markdown Study Guide** (`*_study_guide.md`)
   - Human-readable study material
   - Organized by category
   - Includes all quiz questions with answers
   - Great for review and note-taking

3. **Interactive HTML Quiz** (`*_interactive_quiz.html`)
   - Beautiful, modern interface
   - Real-time progress tracking
   - Instant feedback on answers
   - Detailed explanations for each question
   - Mobile-responsive design

## 🎯 What Gets Extracted

The system identifies and categorizes key learnings across multiple domains:

### Categories Included:

- **AI Development Tools** - Claude Code, Cursor, Codex, Anti-Gravity, OpenCode
- **Product Development** - Mobile-first design, UI/UX, deployment workflows
- **Technical Architecture** - WebSockets, DNS, Docker, email protocols
- **Developer Workflow** - Git commands, terminal usage, coding best practices
- **Entrepreneurship** - Shipping strategies, pricing, user feedback
- **Machine Learning** - Local ML development, LM Studio
- **Hardware & IoT** - Mesh networks, ESP32, Raspberry Pi
- **Email Infrastructure** - Resend, DKIM, domain configuration
- **Philosophy & Methodology** - Scientific method, AI communication
- **Business Strategy** - Market positioning, competitive analysis

## 📊 Importance Levels

Each learning nugget is ranked by importance:

- 🔴 **Critical** - Essential knowledge, foundational concepts
- 🟡 **High** - Important practical knowledge
- 🟢 **Medium** - Useful supporting information
- ⚪ **Low** - Nice-to-know details

## 🎮 Interactive Quiz Features

### Progress Tracking
- Real-time progress bar
- Current question counter
- Score percentage
- Correct answer count

### User Experience
- Smooth animations
- Hover effects
- Responsive design
- Mobile-friendly

### Learning Features
- Instant feedback
- Detailed explanations
- Related topic references
- Review all answers after completion

## 📝 Example Output Structure

### Golden Nugget Format
```json
{
  "category": "AI Development Tools",
  "topic": "Claude Code vs Cursor vs Codex",
  "content": "Claude Code is the best product for coding agents...",
  "importance": "critical"
}
```

### Quiz Question Format
```json
{
  "id": 1,
  "category": "Product Development",
  "importance": "critical",
  "question": "Why is it recommended to start with mobile-first design?",
  "options": [
    { "text": "Correct answer", "correct": true },
    { "text": "Wrong answer 1", "correct": false },
    { "text": "Wrong answer 2", "correct": false }
  ],
  "explanation": "Detailed explanation here...",
  "relatedTopic": "Mobile-First Design Philosophy"
}
```

## 🔧 Customization

You can customize the tool by editing these configuration values in `transcript-to-quiz.js`:

```javascript
const CONFIG = {
  MAX_GOLDEN_NUGGETS: 50,    // Maximum learnings to extract
  MIN_GOLDEN_NUGGETS: 30,    // Minimum learnings to extract
  QUIZ_QUESTIONS: 30,        // Number of quiz questions
  OUTPUT_DIR: './learning-content'  // Output directory
};
```

## 💡 Use Cases

### For Learners
- Review key points from mentoring sessions
- Test your understanding with interactive quizzes
- Create study materials from recorded lessons
- Track progress on complex topics

### For Educators
- Generate study guides from lectures
- Create assessment materials automatically
- Organize content by topic and importance
- Share interactive quizzes with students

### For Teams
- Document key decisions from meetings
- Create onboarding materials from training sessions
- Build knowledge bases from expert calls
- Distribute learning content in multiple formats

## 🎨 HTML Quiz Interface

The interactive quiz features:

- **Modern Design**: Gradient backgrounds, smooth animations
- **Intuitive Navigation**: Previous/Next buttons, progress tracking
- **Visual Feedback**: Color-coded answers (correct/incorrect)
- **Smart Display**: Questions organized by importance and category
- **Results Screen**: Final score with percentage and review options
- **Responsive Layout**: Works perfectly on all devices

## 📈 Example Metrics

From a typical 1-hour Zoom transcript:

- ✅ 49 key learnings extracted
- ✅ 30 quiz questions generated
- ✅ 13 topic categories organized
- ✅ Breakdown: 6 critical, 17 high, 18 medium, 8 low importance

## 🛠️ Technical Details

### Built With
- Pure Node.js (no external dependencies)
- Vanilla JavaScript for HTML quiz
- CSS3 for modern styling
- JSON for data interchange

### File Processing
1. Reads transcript from markdown file
2. Analyzes content structure
3. Extracts key concepts and learnings
4. Categorizes by topic and importance
5. Generates quiz questions with multiple-choice options
6. Creates explanations and references
7. Exports to multiple formats

## 🚧 Future Enhancements

Potential improvements for integration with real AI:

- 🤖 OpenAI/Anthropic API integration for dynamic extraction
- 🎙️ Direct audio processing (skip transcription step)
- 🌐 Web interface for drag-and-drop uploads
- 📱 Mobile app version
- 🔄 Continuous learning from user feedback
- 📊 Analytics dashboard
- 🎯 Personalized difficulty adjustment
- 🌍 Multi-language support

## 📚 Learning Philosophy

This tool is based on evidence-based learning principles:

- **Retrieval Practice**: Testing enhances long-term retention
- **Spaced Repetition**: Review materials over time
- **Active Learning**: Engage with content through questions
- **Immediate Feedback**: Learn from mistakes right away
- **Categorization**: Organize knowledge for better recall

## 🤝 Contributing

Want to enhance this tool? Some ideas:

1. Add support for different transcript formats
2. Implement difficulty levels for questions
3. Create a web API version
4. Add export to Anki flashcard format
5. Build a scoring/leaderboard system

## 📄 License

Feel free to use, modify, and distribute this tool for educational purposes.

## 🙏 Credits

Created for transforming mentorship sessions and educational Zoom calls into actionable learning materials.

---

**Happy Learning! 🎓✨**

For questions or suggestions, please reach out or create an issue.
