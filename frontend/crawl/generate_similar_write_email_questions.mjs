import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outputPath = path.resolve(__dirname, '../src/modules/pte/_01_data/similar_write_email_questions.json')

const questions = [
  {
    title: 'Library Event',
    text: 'You are helping organize a reading event at your local library. Write an email to community members, inviting them to attend and volunteer.\n\nYour email must include the following themes:\n- event purpose\n- volunteer roles\n- registration details',
    bullets: ['event purpose', 'volunteer roles', 'registration details'],
    answer: 'Dear Community Members,\n\nI am writing to invite you to our upcoming reading event at the local library next Saturday. The event is designed to encourage children and families to enjoy reading together in a friendly community setting.\n\nWe are also looking for volunteers to assist with registration, guide visitors, and support activity stations during the event. If you would like to participate, please register by replying to this email before Thursday so we can confirm your role and schedule.\n\nKind regards,\nEvent Coordinator',
    templateHintId: 'we-request-action',
  },
  {
    title: 'Course Delay',
    text: 'You are a course coordinator. A training program has been delayed because the instructor is unavailable. Write an email to participants.\n\nYour email must include the following themes:\n- apology for the delay\n- new plan\n- request for confirmation',
    bullets: ['apology for the delay', 'new plan', 'request for confirmation'],
    answer: 'Dear Participants,\n\nI am sorry to inform you that the training program has been delayed because the instructor is unexpectedly unavailable. To resolve this, we have arranged a new session for next Wednesday at the same time.\n\nPlease let me know whether this revised schedule works for you so that we can confirm attendance and make any necessary adjustments.\n\nKind regards,\nCourse Coordinator',
    templateHintId: 'we-apology-follow-up',
  },
  {
    title: 'Product Demonstration',
    text: 'You are launching a new software tool for small businesses. Write an email to potential clients.\n\nYour email must include the following themes:\n- key benefits\n- demonstration meeting\n- contact details',
    bullets: ['key benefits', 'demonstration meeting', 'contact details'],
    answer: 'Dear Client,\n\nI am writing to introduce our new software tool, which helps small businesses manage tasks more efficiently, improve accuracy, and save time. We would be pleased to arrange a short demonstration meeting to show you how the platform can support your daily operations.\n\nPlease contact me by replying to this email if you would like to schedule a convenient time for the demonstration.\n\nKind regards,\nSales Consultant',
    templateHintId: 'we-request-action',
  },
  {
    title: 'Facility Maintenance',
    text: 'You manage an apartment building. Write an email to residents about planned maintenance.\n\nYour email must include the following themes:\n- maintenance schedule\n- expected inconvenience\n- support contact',
    bullets: ['maintenance schedule', 'expected inconvenience', 'support contact'],
    answer: 'Dear Residents,\n\nI am writing to inform you that maintenance work will take place this Friday from 9 a.m. to 3 p.m. During this period, there may be temporary interruptions to water access and some noise in common areas.\n\nIf you require assistance or have any concerns, please contact the building office by email or phone so we can support you promptly.\n\nKind regards,\nBuilding Manager',
    templateHintId: 'we-formal-core',
  },
  {
    title: 'Club Sponsorship',
    text: 'You are president of a student club. Write an email to a local business asking for sponsorship.\n\nYour email must include the following themes:\n- purpose of the club\n- sponsorship request\n- benefit to the business',
    bullets: ['purpose of the club', 'sponsorship request', 'benefit to the business'],
    answer: 'Dear Sir or Madam,\n\nI am writing on behalf of our student club, which organizes educational and cultural activities for young people on campus. We would like to request sponsorship support for our upcoming annual event.\n\nIn return, your business would receive promotion through event materials, announcements, and social media coverage, helping you reach a wider local audience.\n\nKind regards,\nClub President',
    templateHintId: 'we-request-action',
  },
  {
    title: 'Missed Delivery',
    text: 'You work in customer service. A package was delivered late and the customer complained. Write an email to the customer.\n\nYour email must include the following themes:\n- apology\n- explanation\n- solution offered',
    bullets: ['apology', 'explanation', 'solution offered'],
    answer: 'Dear Customer,\n\nI am sorry that your package was delivered later than expected. The delay was caused by an unexpected transport issue affecting our delivery schedule.\n\nTo resolve this, we would like to offer a delivery fee refund and priority support for your next order. Please let us know if this solution is acceptable.\n\nKind regards,\nCustomer Service Team',
    templateHintId: 'we-apology-follow-up',
  },
  {
    title: 'Training Invitation',
    text: 'You are organizing workplace communication training. Write an email to staff members.\n\nYour email must include the following themes:\n- training topic\n- participation benefit\n- registration deadline',
    bullets: ['training topic', 'participation benefit', 'registration deadline'],
    answer: 'Dear Staff Members,\n\nI am writing to invite you to a workplace communication training session next month. The program will focus on clearer teamwork, better client interaction, and stronger problem-solving communication.\n\nBy attending, you will gain practical skills that can improve daily collaboration. Please register by Friday so we can finalize attendance numbers.\n\nKind regards,\nHR Coordinator',
    templateHintId: 'we-formal-core',
  },
]

const output = questions.map((item, index) => ({
  id: index + 1,
  title: `Write Email Similar Practice ${index + 1}`,
  promptTitle: item.title,
  text: item.text,
  answer: item.answer,
  bulletPoints: item.bullets,
  source: 'UniLingo Similar Practice',
  sourceLabel: 'Similar Practice',
  difficulty: 1,
  difficultyLabel: 'Medium',
  answerTime: 540,
  minWords: 80,
  maxWords: 120,
  templateHintId: item.templateHintId,
}))

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8')
console.log(`Wrote ${output.length} similar Write Email questions to ${outputPath}`)
