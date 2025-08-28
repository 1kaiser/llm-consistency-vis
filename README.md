# LLM consistency visualzation

When an LLM returns a response, we’re actually sampling from a probability distribution over many possible outputs. But we usually only see one of those samples—the response that gets returned.

If we’re just using the model to get an answer or write some text, that’s fine. But if we want to understand how the model behaves—or build systems that depend on it—we need more than just one response. **We need to understand the whole distribution of possible outputs.**

However, it's hard to grasp the shape of a distribution by reading dozens or hundreds of individual outputs. So how can we explore this space more effectively? Can graph lattice visualizations help show patterns beyond a single generation?

## 🔍 How Input Data is Generated

This visualization explores LLM response distributions by analyzing **multiple generations from single prompts**. Here's how the data works:

### 📊 Data Structure & Generation Method

**1. Pre-generated LLM Responses (Cached)**
```typescript
// Multiple responses to single prompts
export const examples = {
  'Tell me a one-sentence story about Seattle': [
    "Seattle's rain whispered secrets to the coffee cups...",
    "In Seattle, the Space Needle watched over dreams...",  
    "A barista in Seattle discovered magic in espresso...",
    // ... 30-50 unique variations
  ],
  'Translate this to English: "Du temps que la Nature..."': [
    "In the days when Nature in her powerful creativity...",
    "In the time when Nature in her powerful mood...",
    // ... 50+ translation variations
  ]
}
```

**2. Generation Process**
- **Single input prompt** → **30-50 diverse LLM responses**
- **OpenAI GPT-4** with **temperature sampling (0.7)** for variation
- **Pre-cached results** to avoid API calls during visualization
- **Real-time generation** option available with API key

**3. Example Categories**
The dataset includes diverse prompt types:
- **Translation tasks** (French poetry → English variations)
- **Creative writing** ("Tell me a story about Seattle")  
- **Factual queries** ("Who is Jeff Heer?", "First line of A Tale of Two Cities")
- **Mathematical tasks** ("Give me 10 random numbers between 1-100")
- **Political summaries** (Trump/Obama presidencies in one sentence)
- **Poetry generation** ("Write me a haiku about snow")

### 🎯 Core Research Question

**Emily Reif's Insight**: 
> "When an LLM returns a response, we're sampling from a probability distribution. How can we visualize the **whole distribution** of possible outputs rather than just one?"

### 📈 Visualization Pipeline

```
Single Prompt → Multiple LLM Generations → Pattern Analysis → Interactive Graph Visualization
```

**Graph Creation Process**:
- **Nodes**: Words/phrases extracted from all response variations
- **Edges**: Co-occurrence relationships and semantic similarities  
- **Clustering**: Group responses with similar patterns/word choices
- **Interactivity**: Hover to highlight patterns, drag to explore connections

### 🔧 Key Technical Components

**Data Flow**:
1. `cached_data/examples.tsx` - Pre-generated response variations
2. `state.tsx` - Manages data fetching and caching (OpenAI integration)
3. `single_example_wordgraph.tsx` - D3.js network visualization
4. `single_example_wordtree.tsx` - Hierarchical word frequency trees
5. `single_example_highlights.tsx` - Text highlighting patterns

**Real-time Generation** (Optional):
```typescript
// Generate new variations on-demand
const response = await openaiClient.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: selectedPrompt }],
  temperature: 0.7,
  n: 30  // Generate 30 variations at once
});
```

### 🎨 Visualization Types

1. **Graph Network**: Shows word co-occurrence patterns across all responses
2. **Word Tree**: Hierarchical visualization of phrase beginnings and continuations  
3. **Highlights**: Text-based view with pattern highlighting and frequency analysis

### 🔑 Key Insight

This approach reveals that **LLM consistency analysis** requires:
- **Multiple samples from identical prompts** (not different prompts)
- **Statistical analysis** of linguistic variation patterns
- **Visual exploration** of the complete response distribution
- **Interactive tools** to understand model behavior beyond single outputs

This fundamentally differs from typical chatbot interfaces that show only one response, providing deeper insights into model reliability and behavior patterns.

## Development

This vis is built using [react](https://react.dev/) and typescript, rather than just being static js/css/html. To build and run it, follow the steps below:

### Install node/npm
Download node/npm [here](https://nodejs.org/en/download/) if you don't already have it.

Open a terminal, and check that it worked with `npm -v`. It should say a version number (not `command not found`).

### Run the app in development mode
`cd` into the llm-consistency-vis github and run `npm start`. 

Open [http://localhost:3000](http://localhost:3000). When you edit the code, it should update.

### Deploy to gitlab pages
When it's time to push your changes and deploy, run:

```
npm run build_and_deploy
```

which will deploy the app [here](https://emilyreif.com/llm-consistency-vis/) (might take a couple of minutes)