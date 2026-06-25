import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outputPath = path.resolve(__dirname, '../src/modules/pte/_01_data/similar_answer_short_question_questions.json')

const rows = [
  ['Animal', 'Which animal is known for having a very long neck?', 'giraffe', ['a giraffe'], 0],
  ['Planet', 'Which planet is closest to the sun?', 'Mercury', [], 0],
  ['Color', 'What color do you get when you mix blue and yellow?', 'green', [], 0],
  ['Transport', 'What do people wear on a bicycle to protect their head?', 'helmet', ['a helmet'], 0],
  ['Time', 'How many days are there in a week?', 'seven', ['7'], 0],
  ['Direction', 'Where does the sun rise, in the east or the west?', 'east', ['the east'], 0],
  ['Body', 'Which organ pumps blood through the human body?', 'heart', ['the heart'], 0],
  ['School', 'What do students use to write on a blackboard?', 'chalk', [], 0],
  ['Weather', 'What do we call frozen rain that falls as white flakes?', 'snow', [], 0],
  ['Food', 'What fruit is yellow and usually curved?', 'banana', ['a banana'], 0],
  ['Geometry', 'How many sides does a triangle have?', 'three', ['3'], 0],
  ['Measurement', 'What is the opposite of heavy?', 'light', [], 0],
  ['Geography', 'What is the largest ocean on Earth?', 'Pacific', ['the Pacific', 'Pacific Ocean', 'the Pacific Ocean'], 1],
  ['Science', 'What gas do plants absorb from the air?', 'carbon dioxide', ['CO2'], 1],
  ['Language', 'What is the plural of mouse?', 'mice', [], 1],
  ['Technology', 'What device do you use to take photographs digitally?', 'camera', ['a camera'], 0],
  ['Music', 'What do we call a person who writes music?', 'composer', ['a composer'], 1],
  ['Job', 'Who treats patients in a hospital?', 'doctor', ['a doctor'], 0],
  ['Math', 'What is five plus seven?', 'twelve', ['12'], 0],
  ['City', 'What do we call a large road in a city with many lanes?', 'avenue', ['an avenue'], 1],
  ['Nature', 'What is the hard outer layer of a tree called?', 'bark', ['tree bark'], 1],
  ['Language', 'What punctuation mark ends a direct question?', 'question mark', ['a question mark'], 1],
  ['Cooking', 'What kitchen appliance is used to keep food cold?', 'refrigerator', ['a refrigerator', 'fridge', 'a fridge'], 0],
  ['Transport', 'What do you call a train that runs below ground?', 'subway', ['the subway', 'metro', 'underground'], 1],
  ['Business', 'What document shows how much money a company earns and spends?', 'budget', ['a budget'], 1],
  ['Environment', 'What do we call energy produced by the sun?', 'solar energy', ['solar power'], 1],
  ['Animals', 'Which bird is often associated with wisdom?', 'owl', ['an owl'], 1],
  ['Grammar', 'What is the past tense of go?', 'went', [], 0],
  ['Literature', 'Who writes novels and stories?', 'author', ['an author', 'writer', 'a writer'], 1],
  ['Health', 'What do you call the temperature of the human body when it is higher than normal?', 'fever', ['a fever'], 1],
  ['Shopping', 'What do customers usually receive after making a payment?', 'receipt', ['a receipt'], 0],
  ['Communication', 'What do we call a message sent by email to many people at once?', 'newsletter', ['a newsletter'], 2],
  ['Transport', 'Which vehicle usually lands on a runway?', 'airplane', ['plane', 'an airplane', 'a plane'], 0],
  ['Office', 'What machine prints paper documents?', 'printer', ['a printer'], 0],
  ['History', 'What do we call a period of one hundred years?', 'century', ['a century'], 1],
  ['Science', 'What force keeps planets moving around the sun?', 'gravity', [], 2],
  ['Biology', 'What do bees collect from flowers?', 'nectar', [], 1],
  ['Media', 'What do we call a moving image advertisement on television?', 'commercial', ['an advertisement', 'advertisement', 'ad'], 1],
  ['Calendar', 'Which month comes after September?', 'October', [], 0],
  ['Sports', 'What sport uses a racket and a shuttlecock?', 'badminton', [], 1],
  ['Business', 'What is a person called who starts a new business?', 'entrepreneur', ['an entrepreneur'], 2],
  ['Internet', 'What do we call a secret string of characters used to access an account?', 'password', ['a password'], 0],
  ['Grammar', 'What part of speech describes a noun?', 'adjective', ['an adjective'], 1],
  ['Economics', 'What is the term for a general rise in prices over time?', 'inflation', [], 2],
  ['Weather', 'What instrument measures temperature?', 'thermometer', ['a thermometer'], 1],
  ['Astronomy', 'What is the natural satellite of the Earth?', 'moon', ['the moon'], 0],
  ['Education', 'What do we call the final part of a book where key ideas are summarized?', 'conclusion', ['the conclusion'], 2],
  ['Maps', 'What do we call the line dividing the Earth into northern and southern halves?', 'equator', ['the equator'], 1],
  ['Law', 'What do we call a written agreement between two parties?', 'contract', ['a contract'], 1],
  ['Chemistry', 'What is H2O commonly called?', 'water', [], 0],
  ['Travel', 'What document allows you to travel internationally?', 'passport', ['a passport'], 0],
  ['Transport', 'What do you call the place where buses regularly stop for passengers?', 'bus stop', ['a bus stop'], 0],
  ['Culture', 'What do we call the traditional food of a country or region?', 'cuisine', [], 2],
  ['Technology', 'What do we call software damage caused by harmful code?', 'virus', ['a virus', 'computer virus'], 1],
  ['Math', 'What do we call the answer to a multiplication problem?', 'product', ['the product'], 1],
  ['Environment', 'What do we call the process of using old materials again?', 'recycling', [], 0],
  ['Language', 'What is the opposite of ancient?', 'modern', [], 0],
  ['Agriculture', 'What machine is commonly used to harvest wheat?', 'combine', ['combine harvester', 'a combine harvester'], 2],
  ['Art', 'What do we call a picture made with a camera?', 'photograph', ['photo', 'a photograph', 'a photo'], 0],
  ['Hospital', 'What room do surgeons work in during operations?', 'operating room', ['operation room', 'surgery', 'the operating room'], 2],
  ['Finance', 'What do we call money borrowed from a bank to buy a house?', 'mortgage', ['a mortgage'], 2],
  ['Geography', 'What is the capital city of Canada?', 'Ottawa', [], 1],
  ['Science', 'What process turns liquid water into vapor?', 'evaporation', [], 2],
]

const questions = rows.map((row, index) => {
  const [promptTitle, text, answer, acceptedAnswers = [], difficulty = 1] = row
  const alternatives = [...new Set([answer, ...acceptedAnswers].filter(Boolean))]
  return {
    id: index + 1,
    title: `Answer Short Question Similar Practice ${index + 1}`,
    promptTitle,
    text,
    answer,
    acceptedAnswers: alternatives,
    source: 'AI-Generated Similar Practice',
    sourceLabel: 'AI-Generated Similar Practice',
    preparationTime: 0,
    answerTime: 10,
    difficulty,
    difficultyLabel: difficulty === 0 ? 'Easy' : difficulty === 1 ? 'Medium' : 'Hard',
  }
})

fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2) + '\n', 'utf8')
console.log(`Wrote ${questions.length} similar ASQ questions to ${outputPath}`)
