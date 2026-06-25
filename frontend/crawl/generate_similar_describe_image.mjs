import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'modules', 'pte', '_01_data');
const OUTPUT = path.join(DATA_DIR, 'similar_describe_image_questions.json');

const chartSeeds = [
  ['Renewable Energy Share by Source', ['Solar', 'Wind', 'Hydro', 'Biomass']],
  ['Monthly App Downloads by Region', ['North', 'South', 'East', 'West']],
  ['University Library Usage by Faculty', ['Science', 'Business', 'Arts', 'Engineering']],
  ['Online Course Completion Rates', ['Week 1', 'Week 2', 'Week 3', 'Week 4']],
  ['Household Water Use by Activity', ['Kitchen', 'Laundry', 'Bathing', 'Garden']],
  ['Commuting Methods of Employees', ['Car', 'Bus', 'Train', 'Bicycle']],
  ['Tourist Visits Across Seasons', ['Spring', 'Summer', 'Autumn', 'Winter']],
  ['Company Sales by Quarter', ['Q1', 'Q2', 'Q3', 'Q4']],
  ['Daily Screen Time by Age Group', ['Teens', '20s', '30s', '40s+']],
  ['Farm Output by Crop Type', ['Wheat', 'Rice', 'Corn', 'Soy']],
  ['Student Preferences for Study Spaces', ['Home', 'Library', 'Cafe', 'Campus Lounge']],
  ['Electric Vehicle Charging Sessions', ['Morning', 'Noon', 'Evening', 'Night']],
  ['Hospital Visits by Department', ['Emergency', 'Pediatrics', 'Surgery', 'Cardiology']],
  ['Carbon Emissions by Sector', ['Transport', 'Industry', 'Energy', 'Agriculture']],
  ['Book Sales by Genre', ['Fiction', 'History', 'Science', 'Biography']],
  ['Fitness Club Membership by Plan', ['Basic', 'Standard', 'Premium', 'Family']],
  ['Internet Traffic by Device', ['Mobile', 'Desktop', 'Tablet', 'TV']],
  ['House Prices by City Zone', ['North', 'South', 'Central', 'Suburban']],
  ['Research Funding by Discipline', ['Medicine', 'Physics', 'Computing', 'Environment']],
  ['Recycling Rates by Material', ['Paper', 'Glass', 'Plastic', 'Metal']],
  ['Passenger Numbers by Transport Mode', ['Bus', 'Rail', 'Air', 'Ferry']],
  ['Coffee Consumption by Workplace Team', ['Sales', 'HR', 'Tech', 'Support']],
  ['Language Learners by Target Language', ['English', 'French', 'Chinese', 'Spanish']],
  ['Energy Consumption by Appliance', ['Fridge', 'AC', 'Lighting', 'Washer']],
];

const processSeeds = [
  ['Online Shopping Delivery Process', ['Browse products', 'Place order', 'Package shipment', 'Home delivery']],
  ['Water Treatment Cycle', ['Collect raw water', 'Filter impurities', 'Disinfect supply', 'Distribute clean water']],
  ['University Admission Workflow', ['Submit application', 'Review documents', 'Receive offer', 'Confirm enrollment']],
  ['Recycling Plant Operation', ['Collect waste', 'Sort materials', 'Process items', 'Reuse output']],
  ['Coffee Production Chain', ['Harvest beans', 'Dry and roast', 'Grind product', 'Serve beverage']],
  ['Mobile App Development Stages', ['Plan features', 'Design interface', 'Build and test', 'Launch update']],
  ['Airport Passenger Journey', ['Check in', 'Security screening', 'Board aircraft', 'Arrive destination']],
  ['Solar Power Generation Process', ['Capture sunlight', 'Convert to electricity', 'Store power', 'Supply grid']],
  ['Food Delivery Platform Flow', ['Receive request', 'Assign driver', 'Collect meal', 'Deliver customer order']],
  ['Job Recruitment Pipeline', ['Post vacancy', 'Screen applicants', 'Interview candidates', 'Make final offer']],
  ['Paper Recycling Process', ['Collect paper', 'Pulp material', 'Remove ink', 'Create new sheets']],
  ['Blood Donation Procedure', ['Register donor', 'Medical check', 'Collect donation', 'Store and distribute']],
];

const mapSeeds = [
  ['Campus Layout Map', ['Library', 'Cafeteria', 'Lecture Hall', 'Parking Area']],
  ['Shopping Mall Floor Plan', ['Entrance', 'Food Court', 'Cinema', 'Retail Zone']],
  ['Museum Visitor Route', ['Main gate', 'History wing', 'Art gallery', 'Exit shop']],
  ['City Park Development Map', ['Lake', 'Playground', 'Walking path', 'Sports field']],
  ['Office Floor Arrangement', ['Reception', 'Meeting room', 'Workstations', 'Break area']],
  ['Transit Hub Direction Map', ['Bus bays', 'Train platform', 'Ticket office', 'Taxi rank']],
];

const sceneSeeds = [
  ['Busy Farmers Market', ['vendors', 'fresh produce', 'customers', 'open stalls']],
  ['Modern Classroom Discussion', ['students', 'teacher', 'screen', 'group activity']],
  ['Construction Site Safety', ['workers', 'helmets', 'machinery', 'warning signs']],
  ['Family Picnic in a Park', ['family members', 'green grass', 'food basket', 'trees']],
  ['Airport Departure Lounge', ['passengers', 'seating area', 'display board', 'luggage']],
  ['Cyclists in a City Street', ['bicycles', 'road lane', 'traffic', 'buildings']],
  ['Scientists in a Laboratory', ['researchers', 'equipment', 'samples', 'workbench']],
  ['Beach Cleanup Activity', ['volunteers', 'waste bags', 'coastline', 'gloves']],
  ['Office Team Meeting', ['colleagues', 'table', 'presentation', 'discussion']],
  ['Rainy Urban Intersection', ['pedestrians', 'umbrellas', 'crosswalk', 'vehicles']],
  ['Children in a Library', ['bookshelves', 'reading area', 'children', 'librarian']],
  ['Restaurant Kitchen Scene', ['chefs', 'cooking station', 'ingredients', 'orders']],
];

function difficultyLabel(index) {
  if (index % 5 === 0) return { difficulty: 2, difficultyLabel: 'Hard' };
  if (index % 2 === 0) return { difficulty: 1, difficultyLabel: 'Medium' };
  return { difficulty: 0, difficultyLabel: 'Easy' };
}

function buildChartQuestion([topic, labels], index) {
  const typeCycle = ['bar', 'line', 'pie', 'table'];
  const chartType = typeCycle[index % typeCycle.length];
  const values = labels.map((_, idx) => 20 + (((index + 3) * (idx + 4) * 7) % 65));
  const maxIndex = values.indexOf(Math.max(...values));
  const minIndex = values.indexOf(Math.min(...values));

  return {
    id: index + 1,
    title: `Describe Image Similar Practice ${index + 1}`,
    promptTitle: topic,
    source: 'AI-Generated Similar Practice',
    visualCategory: 'chart',
    chartType,
    render: {
      kind: 'chart',
      chartType,
      labels,
      values,
      unit: chartType === 'pie' ? '%' : 'units',
    },
    answer: `The ${chartType} chart illustrates ${topic.toLowerCase()}. At first glance, ${labels[maxIndex]} records the highest figure, whereas ${labels[minIndex]} shows the lowest value. Overall, the visual indicates a clear difference among the categories and suggests an uneven distribution across the data set.`,
    keyPoints: [
      topic,
      `${labels[maxIndex]} is highest`,
      `${labels[minIndex]} is lowest`,
      'overall comparison',
    ],
    templateHintId: chartType === 'bar'
      ? 'di-bar-chart'
      : chartType === 'line'
        ? 'di-line-chart'
        : chartType === 'pie'
          ? 'di-pie-chart'
          : 'di-graph-core',
    preparationTime: 25,
    answerTime: 40,
    ...difficultyLabel(index + 1),
  };
}

function buildProcessQuestion([topic, steps], index, isMap = false) {
  return {
    id: index + 1,
    title: `Describe Image Similar Practice ${index + 1}`,
    promptTitle: topic,
    source: 'AI-Generated Similar Practice',
    visualCategory: isMap ? 'map' : 'process',
    render: {
      kind: isMap ? 'map' : 'process',
      title: topic,
      steps,
    },
    answer: isMap
      ? `The image presents ${topic.toLowerCase()}. It highlights key locations such as ${steps[0].toLowerCase()}, ${steps[1].toLowerCase()}, and ${steps[2].toLowerCase()}, while the route finally reaches ${steps[3].toLowerCase()}. Overall, the layout shows how the main areas are arranged and connected.`
      : `The image presents ${topic.toLowerCase()} and explains how the system develops step by step. It begins with ${steps[0].toLowerCase()}, then moves through ${steps[1].toLowerCase()} and ${steps[2].toLowerCase()}. In the final stage, it ends with ${steps[3].toLowerCase()}, so the overall process highlights a clear sequence of actions.`,
    keyPoints: isMap
      ? [topic, steps[0], steps[1], steps[3], 'layout connection']
      : [topic, steps[0], steps[2], steps[3], 'process sequence'],
    templateHintId: isMap ? 'di-map' : 'di-process',
    preparationTime: 25,
    answerTime: 40,
    ...difficultyLabel(index + 1),
  };
}

function buildSceneQuestion([topic, details], index) {
  return {
    id: index + 1,
    title: `Describe Image Similar Practice ${index + 1}`,
    promptTitle: topic,
    source: 'AI-Generated Similar Practice',
    visualCategory: 'scene',
    render: {
      kind: 'scene',
      title: topic,
      focus: details[0],
      details: details.slice(1),
    },
    answer: `The picture shows ${topic.toLowerCase()}. The main focus appears to be ${details[0]}, while the background includes ${details.slice(1).join(', ')}. Overall, the image gives the impression of an active and realistic everyday scene.`,
    keyPoints: [topic, details[0], details[1], details[2], 'overall impression'],
    templateHintId: 'di-photo',
    preparationTime: 25,
    answerTime: 40,
    ...difficultyLabel(index + 1),
  };
}

function main() {
  const questions = [];

  chartSeeds.forEach((seed, idx) => {
    questions.push(buildChartQuestion(seed, questions.length));
  });

  processSeeds.forEach((seed) => {
    questions.push(buildProcessQuestion(seed, questions.length, false));
  });

  mapSeeds.forEach((seed) => {
    questions.push(buildProcessQuestion(seed, questions.length, true));
  });

  sceneSeeds.forEach((seed) => {
    questions.push(buildSceneQuestion(seed, questions.length));
  });

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(questions, null, 2) + '\n', 'utf8');
  console.log(`DI: wrote ${questions.length} similar questions to ${OUTPUT}`);
}

main();
