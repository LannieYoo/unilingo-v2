import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outputPath = path.resolve(__dirname, '../src/modules/pte/_01_data/similar_respond_situation_questions.json')

const politeScenarios = [
  ['Late Assignment Clarification', 'Your classmate asks whether you can explain the homework deadline because they missed the teacher’s announcement.', 'Hi there, thanks for your message. The homework is due this Friday, and I wanted to let you know so you can still finish it on time. Please check the course page as well, and let me know if you need any more details.'],
  ['Package Pickup Question', 'A customer wants to know whether their package can be collected after office hours.', 'Hi, thanks for asking. I am afraid pickup is only available during office hours, because the front desk closes in the evening. Please come before 5 p.m., or contact us if you need another arrangement.'],
  ['Volunteer Invitation', 'A school organizer asks whether you would like to join a weekend volunteer event.', 'Hello, thank you for inviting me. I would be happy to join the volunteer event because it sounds meaningful and well organized. Please send me the schedule and meeting point when you have time.'],
  ['Library Book Reminder', 'A librarian reminds you that a borrowed book is due tomorrow.', 'Hi, thanks for the reminder. I will return the book tomorrow because I do not want to miss the due date. Please let me know if I need to renew it instead.'],
  ['Room Access Request', 'A colleague asks whether they may use your meeting room for half an hour this afternoon.', 'Hi, thanks for checking with me. You can use the meeting room this afternoon because I do not have another booking during that time. Please make sure the room is free again after half an hour.'],
  ['Club Membership Question', 'A new student asks how they can join your campus club.', 'Hello, thanks for your interest. You can join the club by filling out the online form because that is how we register new members. Please let me know if you would like me to send you the link.'],
  ['Feedback Request', 'Your manager asks for your opinion about a new workplace policy.', 'Hi, thanks for asking for my opinion. I think the new policy is useful because it makes the process clearer for everyone. Please let me know if you would like more detailed feedback.'],
  ['Parking Space Inquiry', 'A visitor asks whether they can park near the main entrance.', 'Hello, thanks for your question. Yes, you can park near the main entrance because visitor parking is available there. Please follow the signs and use the visitor permit if required.'],
  ['Course Material Request', 'A student asks if you can share your lecture notes from yesterday’s class.', 'Hi, thanks for your message. I can share my lecture notes because I know you were absent yesterday. Please give me your email address, and I will send them to you today.'],
  ['Language Exchange Interest', 'Someone from your community group asks whether you are still interested in language exchange practice.', 'Hello, thank you for reaching out. Yes, I am still interested because regular practice would help me improve my speaking skills. Please let me know when you would like to meet.'],
  ['Invoice Confirmation', 'A client asks whether you have received their latest payment.', 'Hi, thanks for your message. Yes, I have received the payment, and I wanted to confirm that everything looks fine on our side. Please let me know if you need a receipt or any further confirmation.'],
  ['Team Lunch Invitation', 'A teammate invites you to a lunch gathering after work on Friday.', 'Hello, thanks for the invitation. I would like to join the lunch because it will be a good chance to spend time with the team. Please share the restaurant details when they are confirmed.'],
  ['Equipment Borrowing Request', 'A coworker asks if they can borrow your charger for one hour.', 'Hi, thanks for asking. Yes, you can borrow my charger for one hour because I will not need it until later. Please return it to me before the end of the meeting.'],
  ['Study Group Follow-up', 'A student asks whether the study group is still meeting tonight.', 'Hello, thanks for checking. Yes, the study group is still meeting tonight, and we plan to start at the usual time. Please come a few minutes early if you can.'],
  ['Document Submission Check', 'A staff member asks if you have already submitted the required form.', 'Hi, thanks for your message. Yes, I submitted the required form earlier today because I wanted to finish the process before the deadline. Please let me know if anything else is needed.'],
  ['Cafe Reservation Inquiry', 'A friend asks whether you booked a table for dinner tonight.', 'Hello, thanks for asking. Yes, I booked a table for tonight because the restaurant is usually busy in the evening. Please message me if your arrival time changes.'],
  ['Project Update Request', 'Your supervisor asks whether you can provide a short update on your current task.', 'Hi, thanks for checking in. I can provide a short update because the main part of the task is already in progress. Please let me know if you want the summary by email or in person.'],
  ['Printer Use Question', 'A visitor asks whether the printer in the lobby is available for public use.', 'Hello, thanks for your question. Yes, the printer in the lobby is available for public use, but there may be a small charge for each page. Please ask the front desk if you need help using it.'],
  ['Workshop Registration', 'An organizer asks whether you have completed the registration form for tomorrow’s workshop.', 'Hi, thanks for the reminder. Yes, I completed the registration form because I wanted to confirm my place early. Please let me know if I should bring anything special.'],
  ['Attendance Confirmation', 'Your teacher asks whether you will attend the extra review session this weekend.', 'Hello, thank you for asking. Yes, I will attend the review session because I want more practice before the exam. Please share the classroom details when available.'],
]

const problemScenarios = [
  ['Damaged Order', 'A customer says the product they received is damaged and asks what you can do about it.', 'I understand that the item arrived damaged, and I am sorry for the inconvenience. To solve this, I can arrange a replacement or a refund as soon as possible. Please confirm which option you prefer, and I will take action immediately.'],
  ['Late Delivery Complaint', 'A client complains that their order has not arrived by the promised date.', 'I understand that the delivery is late, and I am sorry for the inconvenience. To solve this, I can check the shipment status and arrange an urgent update for you. Please confirm your order number, and I will follow up right away.'],
  ['Wrong Booking Date', 'A customer says their appointment was booked for the wrong day.', 'I understand that the booking date is incorrect, and I am sorry about the mistake. To solve this, I can reschedule the appointment to the correct day as soon as possible. Please tell me your preferred date, and I will update the booking immediately.'],
  ['Missing Attachment', 'Your manager says the report you emailed did not include the attachment.', 'I understand that the attachment was missing, and I am sorry for the oversight. To solve this, I will resend the report with the correct file right away. Please let me know if you would also like me to send it in another format.'],
  ['Noisy Neighbor Complaint', 'A resident reports that their neighbor has been making loud noise late at night.', 'I understand that the noise has been disturbing you, and I am sorry for the situation. To solve this, I can contact the neighbor and remind them about the building rules. Please let me know if the problem continues after that.'],
  ['Incorrect Bill', 'A customer says they were charged twice on the same bill.', 'I understand that you were charged twice, and I am sorry for the billing problem. To solve this, I can review the transaction and arrange a refund if the charge is incorrect. Please send me the receipt details, and I will check it immediately.'],
  ['Cancelled Meeting Issue', 'A colleague is upset because a meeting was cancelled without notice.', 'I understand that the sudden cancellation caused inconvenience, and I am sorry about that. To solve this, I can help arrange a new meeting time as soon as possible. Please let me know your availability, and I will coordinate the next step.'],
  ['Website Login Error', 'A user reports that they cannot log in to their account after resetting their password.', 'I understand that you are having trouble logging in, and I am sorry for the inconvenience. To solve this, I can help reset the account again and check whether there is a system error. Please confirm your username, and I will investigate immediately.'],
  ['Classroom Change Problem', 'A student says they went to the old classroom because they did not receive the room change notice.', 'I understand that the room change notice did not reach you, and I am sorry for the confusion. To solve this, I can send you the updated classroom details and ask the teacher to remind the class again. Please let me know if you need the building directions as well.'],
  ['Broken Printer', 'An employee says the shared printer stopped working before an urgent deadline.', 'I understand that the printer stopped working at a difficult time, and I am sorry for the trouble. To solve this, I can contact support and suggest another printer nearby for now. Please let me know if you want help sending the file to the backup printer.'],
  ['Food Order Mistake', 'A customer says their meal order is missing one item.', 'I understand that one item is missing from your order, and I am sorry for the mistake. To solve this, I can arrange for the missing item to be prepared and sent out immediately. Please confirm the item name, and I will process it right away.'],
  ['Membership Access Issue', 'A gym member says their access card no longer opens the gate.', 'I understand that your access card is not working, and I am sorry for the inconvenience. To solve this, I can check the card status and reactivate it or issue a new one if necessary. Please stop by the front desk, and we will fix it as quickly as possible.'],
  ['Software Crash', 'A coworker says the new software keeps crashing while they are working.', 'I understand that the software keeps crashing, and I am sorry for the disruption. To solve this, I can report the issue to IT and help you use a temporary workaround. Please send me a screenshot of the error, and I will escalate it immediately.'],
  ['Lost Reservation', 'A guest says the hotel cannot find their reservation on arrival.', 'I understand that your reservation is not showing in the system, and I am sorry for the inconvenience. To solve this, I can double-check the booking details and arrange a room if availability allows. Please show me your confirmation email, and I will assist you right away.'],
  ['Incorrect Product Size', 'A shopper says the size they received does not match what they ordered online.', 'I understand that the size is incorrect, and I am sorry for the mistake. To solve this, I can arrange an exchange for the correct size or process a return. Please let me know which option you prefer, and I will help immediately.'],
  ['Missed Pickup', 'A customer says the courier did not arrive during the scheduled pickup window.', 'I understand that the pickup was missed, and I am sorry for the inconvenience. To solve this, I can contact the courier service and arrange a new pickup time. Please confirm your address again, and I will follow up today.'],
  ['Training Link Not Working', 'A new employee says the training link in the welcome email does not open.', 'I understand that the training link is not working, and I am sorry about the issue. To solve this, I can send you a new link and check whether the original one has expired. Please try the updated link and let me know if the problem continues.'],
  ['Parking Fine Dispute', 'A visitor says they received a parking fine even though they displayed a temporary permit.', 'I understand that you believe the fine was issued by mistake, and I am sorry for the frustration. To solve this, I can review the permit details and help you submit an appeal if needed. Please send me a photo of the permit, and I will check it.'],
  ['Air Conditioning Complaint', 'A tenant reports that the air conditioning in their room has stopped working.', 'I understand that the air conditioning is not working, and I am sorry for the inconvenience. To solve this, I can arrange a maintenance check as soon as possible. Please tell me when someone can access the room, and I will schedule the repair.'],
  ['Incorrect Certificate Name', 'A student says their certificate was printed with the wrong spelling of their name.', 'I understand that your name was printed incorrectly, and I am sorry for the mistake. To solve this, I can request a corrected certificate right away. Please send me the correct spelling, and I will start the replacement process immediately.'],
]

const schedulingScenarios = [
  ['Doctor Appointment Change', 'The clinic asks whether you can move your appointment from Monday morning to Monday afternoon.', 'Thank you for your message. I am available on Monday afternoon, but if needed, I can also come on Tuesday morning. Please let me know which time suits you best.'],
  ['Interview Reschedule', 'A company asks whether you can attend your interview one hour later than originally planned.', 'Thank you for letting me know. I am available one hour later, but if needed, I can also attend the following morning. Please let me know which option works best for the interview team.'],
  ['Meeting Conflict', 'Your coworker says they cannot join the project meeting at 2 p.m. and asks if another time is possible.', 'Thanks for your message. I am free after 3 p.m., but if needed, I can also join before lunch tomorrow. Please let me know which time is better for everyone.'],
  ['Class Presentation Time', 'Your teacher asks whether your group can present in the second half of the class instead of the first half.', 'Thank you for asking. We are available in the second half of the class, but if needed, we can also present at the start of next lesson. Please let me know what suits the class schedule best.'],
  ['Shift Swap Request', 'A colleague asks whether you can swap your evening shift for their morning shift next Friday.', 'Thanks for reaching out. I am available for the morning shift next Friday, but if needed, I can also help for part of the afternoon. Please let me know if the full swap is confirmed.'],
  ['Parent Meeting Time', 'A school office asks whether you can attend the parent meeting at 4 p.m. instead of 5 p.m.', 'Thank you for your message. I am available at 4 p.m., but if needed, I can also join online later in the evening. Please let me know which option is easier for the school.'],
  ['Delivery Slot Request', 'A courier asks whether someone will be home between 1 and 3 p.m. for delivery.', 'Thank you for checking. Someone will be home between 1 and 3 p.m., but if needed, delivery can also be made after 5 p.m. Please let me know which slot has been scheduled.'],
  ['Tutoring Session Time', 'Your tutor asks whether you want to keep the usual session time this week or move it to the weekend.', 'Thanks for your message. I am available at the usual time this week, but if needed, I can also move the session to Saturday afternoon. Please let me know which time you prefer.'],
  ['Airport Pickup Plan', 'A friend asks whether you can pick them up from the airport at 9 p.m. tonight.', 'Thank you for asking. I am available at 9 p.m. tonight, but if needed, I can also arrange pickup slightly later. Please let me know your exact arrival time.'],
  ['Online Demo Schedule', 'A client asks whether the product demo can be moved from Thursday to Friday.', 'Thanks for your message. I am available on Friday for the demo, but if needed, I can also offer a shorter session on Thursday afternoon. Please let me know which option suits your team best.'],
  ['Hair Salon Booking', 'The salon asks whether you can come thirty minutes earlier than your original appointment.', 'Thank you for the update. I am available thirty minutes earlier, but if needed, I can also keep the original appointment time. Please confirm the final booking for me.'],
  ['Campus Tour Time', 'An organizer asks whether you can lead the campus tour in the morning instead of the afternoon.', 'Thanks for checking with me. I am available in the morning, but if needed, I can also help in the afternoon as originally planned. Please let me know the final tour schedule.'],
  ['Exam Review Session', 'Your class representative asks whether the review session should be held on Wednesday evening or Thursday morning.', 'Thank you for asking. I am available on Wednesday evening, but if needed, I can also attend on Thursday morning. Please let me know which option is chosen for the group.'],
  ['Restaurant Booking Adjustment', 'The restaurant says your table may need to be moved from 7 p.m. to 7:30 p.m.', 'Thank you for the update. I am available at 7:30 p.m., but if needed, I can also arrive closer to 8 p.m. Please let me know the final reservation time.'],
  ['Maintenance Visit Time', 'Building management asks whether a technician can visit your apartment between 10 and 12 tomorrow.', 'Thanks for your message. I am available between 10 and 12 tomorrow, but if needed, I can also arrange access in the afternoon. Please confirm the technician’s arrival window.'],
  ['Conference Call Slot', 'A partner company asks whether the conference call can begin fifteen minutes later.', 'Thank you for checking. I am available fifteen minutes later, but if needed, I can also keep the original time. Please let me know the final call schedule.'],
  ['Training Session Date', 'HR asks whether you prefer to attend training next Monday or next Wednesday.', 'Thank you for the options. I am available next Monday, but if needed, I can also attend on Wednesday instead. Please let me know which date is confirmed for my registration.'],
  ['Sports Practice Change', 'Your coach asks whether you can attend practice on Saturday morning because Friday practice was cancelled.', 'Thanks for the update. I am available on Saturday morning, but if needed, I can also join an extra session next week. Please let me know the final training plan.'],
  ['Move-in Inspection Time', 'Your landlord asks whether the move-in inspection can be done an hour earlier than planned.', 'Thank you for your message. I am available an hour earlier, but if needed, I can also keep the original inspection time. Please confirm the final appointment when convenient.'],
  ['Group Project Call', 'Your teammates ask whether tonight’s group call can be shortened and moved later.', 'Thanks for your message. I am available for a later group call tonight, but if needed, I can also join briefly at the original time. Please let me know what works best for the team.'],
]

function makeQuestion(id, category, title, text, answer, templateHintId, difficulty) {
  return {
    id,
    title: `Respond to a Situation Similar Practice ${id}`,
    promptTitle: title,
    text,
    source: 'AI-Generated Similar Practice',
    sourceLabel: 'AI-Generated Similar Practice',
    answer,
    templateHintId,
    preparationTime: 20,
    answerTime: 40,
    difficulty,
    difficultyLabel: difficulty === 0 ? 'Easy' : difficulty === 1 ? 'Medium' : 'Hard',
    category,
  }
}

const all = [
  ...politeScenarios.map((item, index) => makeQuestion(index + 1, 'polite', item[0], item[1], item[2], 'rts-core-polite', index < 8 ? 0 : index < 15 ? 1 : 2)),
  ...problemScenarios.map((item, index) => makeQuestion(politeScenarios.length + index + 1, 'problem', item[0], item[1], item[2], 'rts-problem-solution', index < 6 ? 0 : index < 14 ? 1 : 2)),
  ...schedulingScenarios.map((item, index) => makeQuestion(politeScenarios.length + problemScenarios.length + index + 1, 'scheduling', item[0], item[1], item[2], 'rts-availability', index < 7 ? 0 : index < 15 ? 1 : 2)),
]

fs.writeFileSync(outputPath, JSON.stringify(all, null, 2) + '\n', 'utf8')
console.log(`Wrote ${all.length} similar RtS questions to ${outputPath}`)
