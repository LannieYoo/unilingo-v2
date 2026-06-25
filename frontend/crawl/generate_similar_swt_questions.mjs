import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outputPath = path.resolve(__dirname, '../src/modules/pte/_01_data/similar_summarize_written_text_questions.json')

const questions = [
  {
    title: 'Urban Farming',
    passage: 'Urban farming has grown rapidly in major cities because it improves access to fresh food, shortens supply chains, and encourages community participation. Researchers also note that rooftop gardens can reduce heat, improve air quality, and help residents understand sustainable food systems.',
    answer: 'The passage discusses the growth of urban farming, highlighting its role in improving food access, strengthening communities, and supporting environmental sustainability through benefits such as reduced heat and better air quality.',
  },
  {
    title: 'Remote Collaboration',
    passage: 'Remote collaboration has become a common feature of modern workplaces. Although digital platforms make communication faster and more flexible, successful remote teamwork still depends on clear expectations, regular feedback, and well-structured routines that maintain trust and accountability.',
    answer: 'The passage explains that while remote collaboration offers speed and flexibility, its success depends on clear expectations, regular feedback, and structured routines that preserve trust and accountability in teams.',
  },
  {
    title: 'Renewable Energy Investment',
    passage: 'Governments and private companies are investing heavily in renewable energy to reduce carbon emissions and strengthen long-term energy security. However, experts argue that infrastructure upgrades, battery storage, and policy consistency are essential if these investments are to deliver reliable results.',
    answer: 'The passage discusses renewable energy investment, emphasizing that although it helps reduce emissions and improve energy security, reliable outcomes require better infrastructure, storage capacity, and consistent policy support.',
  },
  {
    title: 'Museum Education',
    passage: 'Museums are no longer viewed simply as places to display objects. Many institutions now design interactive programs, digital archives, and school partnerships to encourage critical thinking, cultural understanding, and lifelong learning among diverse audiences.',
    answer: 'The passage describes how museums have evolved beyond display spaces by offering interactive programs, digital resources, and educational partnerships that promote cultural understanding and lifelong learning.',
  },
  {
    title: 'Sleep and Memory',
    passage: 'Sleep plays a vital role in memory formation because the brain uses rest periods to organize and strengthen information learned during the day. Studies show that inadequate sleep can reduce concentration, impair recall, and weaken long-term learning outcomes.',
    answer: 'The passage explains that sleep is essential for memory formation because it helps the brain consolidate information, whereas inadequate sleep harms concentration, recall, and long-term learning.',
  },
  {
    title: 'Public Transport',
    passage: 'Efficient public transport systems can reduce traffic congestion, lower pollution, and improve access to jobs and education. Yet transport planners warn that affordability, reliability, and last-mile connectivity must be addressed if more people are to shift away from private cars.',
    answer: 'The passage discusses the value of efficient public transport in reducing congestion and pollution while improving access, but notes that affordability, reliability, and last-mile links are necessary to attract more users.',
  },
  {
    title: 'Artificial Reefs',
    passage: 'Artificial reefs are being introduced in coastal areas to encourage marine biodiversity and support tourism. Scientists caution, however, that poorly designed structures may damage ecosystems, meaning that long-term monitoring and site-specific planning are critical.',
    answer: 'The passage explains that artificial reefs can support biodiversity and tourism, although their success depends on careful design, site-specific planning, and ongoing monitoring to avoid ecological harm.',
  },
  {
    title: 'Language Learning Apps',
    passage: 'Language learning apps are popular because they allow users to study whenever they want and often present lessons in short, engaging formats. Nevertheless, educators stress that apps are most effective when combined with speaking practice, feedback, and meaningful exposure to real communication.',
    answer: 'The passage discusses language learning apps, noting that while they offer flexible and engaging study, they work best when supported by speaking practice, feedback, and authentic communication.',
  },
  {
    title: 'Waste Reduction',
    passage: 'Reducing household waste requires both individual behavior change and supportive public policy. Reusable packaging, food planning, and better recycling systems can all make a difference, but progress is strongest when citizens, businesses, and local authorities work together.',
    answer: 'The passage explains that household waste reduction depends on both behavior change and policy support, with the greatest progress occurring when individuals, businesses, and authorities cooperate.',
  },
  {
    title: 'Water Management',
    passage: 'Water shortages are becoming more common in regions affected by climate change, population growth, and inefficient infrastructure. Experts argue that conservation, modern irrigation, and investment in resilient systems are all necessary to secure water supplies for the future.',
    answer: 'The passage discusses growing water shortages caused by climate and infrastructure pressures, emphasizing that conservation, irrigation reform, and resilient investment are needed to protect future supplies.',
  },
  {
    title: 'Online Learning Motivation',
    passage: 'Students in online courses often enjoy flexibility, but many struggle to remain motivated without social interaction or direct supervision. Research suggests that short goals, instructor presence, and peer engagement can improve persistence and course completion.',
    answer: 'The passage explains that although online learning offers flexibility, student motivation may weaken without interaction, so short goals, instructor presence, and peer engagement are important for persistence.',
  },
  {
    title: 'Tourism and Heritage',
    passage: 'Tourism can generate income for historic communities, but excessive visitor numbers may damage cultural sites and disrupt local life. Sustainable tourism strategies therefore aim to balance economic opportunity with conservation and community wellbeing.',
    answer: 'The passage discusses tourism in historic communities, showing that while it brings income, sustainable strategies are required to balance economic benefits with conservation and local wellbeing.',
  },
]

const output = questions.map((item, index) => ({
  id: index + 1,
  title: `Summarize Written Text Similar Practice ${index + 1}`,
  promptTitle: item.title,
  text: item.passage,
  answer: item.answer,
  source: 'UniLingo Similar Practice',
  sourceLabel: 'Similar Practice',
  difficulty: 1,
  difficultyLabel: 'Medium',
  answerTime: 600,
  minWords: 25,
  maxWords: 50,
  maxSentences: 2,
  templateHintId: index % 2 === 0 ? 'swt-one-sentence' : 'swt-cause-effect',
}))

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8')
console.log(`Wrote ${output.length} similar SWT questions to ${outputPath}`)
