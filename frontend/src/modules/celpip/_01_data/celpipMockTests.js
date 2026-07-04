import GENERATED_LISTENING from './celpip_listening_generated.json'
import GENERATED_READING from './celpip_reading_generated.json'
import GENERATED_SPEAKING from './celpip_speaking_crawled.json'

export const CELPIP_SECTIONS = [
  {
    id: 'listening',
    label: 'Listening',
    koLabel: '듣기',
    icon: 'headphones',
    color: '#0f766e',
    time: '46-55 min',
    officialParts: [
      'Problem Solving',
      'Daily Life Conversation',
      'Information',
      'News Item',
      'Discussion',
      'Viewpoints',
    ],
    goal: '캐나다 생활, 학교, 직장 상황의 핵심 정보와 화자의 의도를 빠르게 잡는 연습',
  },
  {
    id: 'reading',
    label: 'Reading',
    koLabel: '읽기',
    icon: 'menu_book',
    color: '#0f766e',
    time: '43-56 min',
    officialParts: [
      'Correspondence',
      'Apply a Diagram',
      'Information',
      'Viewpoints',
    ],
    goal: '메일, 공지, 도표, 의견 글에서 필요한 근거를 찾아 답하는 연습',
  },
  {
    id: 'writing',
    label: 'Writing',
    koLabel: '쓰기',
    icon: 'edit_note',
    color: '#0f766e',
    time: '53 min',
    officialParts: [
      'Writing an Email',
      'Responding to Survey Questions',
    ],
    goal: '목적, 독자, 톤에 맞춰 이메일과 설문형 의견문을 구성하는 연습',
  },
  {
    id: 'speaking',
    label: 'Speaking',
    koLabel: '말하기',
    icon: 'record_voice_over',
    color: '#0f766e',
    time: '15 min',
    officialParts: [
      'Giving Advice',
      'Personal Experience',
      'Describing a Scene',
      'Making Predictions',
      'Comparing and Persuading',
      'Difficult Situation',
      'Expressing Opinions',
      'Unusual Situation',
    ],
    goal: '짧은 준비 시간 안에 상황, 이유, 예시, 결론을 자연스럽게 말하는 연습',
  },
]

const LISTENING_FOCUS = {
  'Problem Solving': {
    en: 'Identify the issue, options, conditions, and final action',
    ko: '문제, 선택지, 조건, 최종 행동 파악',
    zh: '找出问题、选项、条件和最终行动',
    count: 8,
  },
  'Daily Life Conversation': {
    en: 'Follow schedule changes, preferences, and everyday details',
    ko: '일상 대화의 일정 변경, 선호, 세부 정보 파악',
    zh: '理解日常对话中的日程变化、偏好和细节',
    count: 5,
  },
  Information: {
    en: 'Catch requirements, deadlines, rules, and exceptions',
    ko: '요구사항, 마감일, 규칙, 예외 파악',
    zh: '抓住要求、截止日期、规则和例外',
    count: 6,
  },
  'News Item': {
    en: 'Understand the event, cause, impact, and exceptions',
    ko: '사건, 원인, 영향, 예외 이해',
    zh: '理解事件、原因、影响和例外',
    count: 5,
  },
  Discussion: {
    en: 'Track different speakers, opinions, reasons, and decisions',
    ko: '여러 화자, 의견, 이유, 결정 정리',
    zh: '追踪不同说话人、观点、理由和决定',
    count: 8,
  },
  Viewpoints: {
    en: 'Separate attitudes, arguments, and supporting reasons',
    ko: '태도, 주장, 근거 구분',
    zh: '区分态度、观点和支持理由',
    count: 6,
  },
}

// Build a listening question object whose answer sits in a varied position.
// Strategy text is provided by the view (getQuestionStrategy) per type, so it is omitted here.
function lq(prompt, answer, distractors, difficulty = 'medium') {
  const options = [answer, ...distractors]
  const offset = prompt.length % options.length
  return {
    prompt,
    answer,
    difficulty,
    options: [...options.slice(offset), ...options.slice(0, offset)],
  }
}

// Each listening mock is a real CELPIP-style conversation (—) or monologue with its
// own questions. Turn markers ( — ) separate speakers and are stripped before audio.
const LISTENING_MOCKS = [
  {
    id: 'ls-01',
    type: 'Problem Solving',
    title: 'Apartment Heating Issue',
    segments: [
      { q: 3, text: 'Hi, this is Daniel in apartment 304. The heat in my unit stopped working overnight, and it is freezing in here now. — I am sorry about that, Daniel. A part in the main boiler failed early this morning, so several units on your side of the building are affected. — The trouble is that I work from home and I have meetings all day, so I really cannot leave the apartment.' },
      { q: 3, text: 'I understand. For right now, I can bring up two portable electric heaters so you can keep at least one room warm. — That would help a lot, thank you. — A technician is scheduled to replace the part this afternoon, between two and four. You do not need to be home; one of our staff will let them in.' },
      { q: 2, text: 'Should I do anything before they arrive? — Just keep the space around the radiator clear. And if the heat is still off by five, call the office directly instead of the after-hours line, because that is much faster.' },
    ],
    questions: [
      lq('Why is Daniel calling the building manager?', 'The heat in his apartment has stopped working.', ['He wants to switch to a larger unit.', 'His water bill seems too high.', 'He locked himself out of his apartment.'], 'easy'),
      lq('What caused the heating problem?', 'A part in the main boiler failed.', ['Daniel left a window open all night.', 'The entire city lost electricity.', 'The radiator was never turned on.']),
      lq('Why does Daniel say he cannot leave the apartment?', 'He has work meetings at home all day.', ['He is waiting for an important delivery.', 'His car will not start.', 'He is recovering from an illness.']),
      lq('What does the manager offer to do right away?', 'Bring up two portable electric heaters.', ['Cancel his rent for the month.', 'Move him to a hotel for the night.', 'Give him a new apartment immediately.']),
      lq('When is the technician expected to come?', 'In the afternoon, between two and four.', ['Early the next morning.', 'Within the next thirty minutes.', 'Sometime the following week.']),
      lq('Does Daniel need to stay home for the repair?', 'No, a staff member will let the technician in.', ['Yes, or the repair will be cancelled.', 'Yes, he must sign a form in person.', 'No, but he must leave his key outside.']),
      lq('What should Daniel do before the technician arrives?', 'Keep the area around the radiator clear.', ['Turn off the power to his unit.', 'Move his furniture into the hallway.', 'Return the portable heaters.']),
      lq('What should Daniel do if the heat is still off by five?', 'Call the office directly instead of the after-hours line.', ['Wait until the next business day to report it.', 'Keep using only the portable heaters.', 'Send the technician a message himself.'], 'hard'),
    ],
  },
  {
    id: 'ls-02',
    type: 'Daily Life Conversation',
    title: 'Community Centre Schedule',
    transcript:
      'Did you see that the community centre changed some of its schedule for next month? — No, what changed? — Well, the yoga class moved from Tuesday to Thursday evenings. — Oh, Thursday actually works better for me. — Same here. Also, the cooking workshop now requires registration in advance, because it filled up so fast last time. — Good to know. I will sign up online tonight. — And one more thing, the gym is closing early on Friday, at four, for maintenance. — That is fine, I usually go in the mornings. — Me too. Should we still meet for the Thursday yoga class, then? — Definitely, let us go together.',
    questions: [
      lq('What are the two friends mainly discussing?', 'Changes to the community centre schedule.', ['A new gym they want to join.', 'A cooking competition.', 'A holiday vacation plan.'], 'easy'),
      lq('Which class changed its day?', 'The yoga class moved to Thursday.', ['The cooking workshop moved to Monday.', 'The gym class moved to the weekend.', 'The swimming class moved to Friday.']),
      lq('What now requires registration in advance?', 'The cooking workshop.', ['The yoga class.', 'The morning gym session.', 'The maintenance visit.']),
      lq('Why is the gym closing early on Friday?', 'For maintenance.', ['Because of a holiday.', 'For a private event.', 'Due to low attendance.']),
      lq('What do the friends decide to do?', 'Attend the Thursday yoga class together.', ['Cancel their gym memberships.', 'Skip the cooking workshop.', 'Meet on Friday morning.'], 'hard'),
    ],
  },
  {
    id: 'ls-03',
    type: 'Information',
    title: 'College Co-op Orientation',
    transcript:
      'Welcome to the co-op orientation. Before you can be matched with an employer, there are a few things you must complete. First, every student needs to upload a current resume to the co-op portal, and please make sure it is in PDF format. Second, you must attend at least one interview-skills workshop; we run them every Wednesday this month. Third, you will rank your workplace preferences online, and that list is due by Monday at noon. Keep in mind that late submissions go to the bottom of the matching list, so try to finish early. If you have questions, the co-op office is open until four each weekday, and you can also email us through the portal.',
    questions: [
      lq('What is the announcement mainly about?', 'Steps students must complete before being matched with an employer.', ['How to apply for a scholarship.', 'A change to the class timetable.', 'A campus job fair next week.'], 'easy'),
      lq('What document must students upload?', 'A current resume in PDF format.', ['A cover letter in Word format.', 'A copy of their transcript.', 'A reference letter.']),
      lq('How many interview-skills workshops must students attend?', 'At least one.', ['Exactly three.', 'None; they are optional.', 'One every single day.']),
      lq('When are the workplace preferences due?', 'Monday at noon.', ['Wednesday by four.', 'Friday at midnight.', 'The end of the month.']),
      lq('What happens if a student submits late?', 'Their preferences go to the bottom of the matching list.', ['They are removed from the co-op program.', 'They must pay a late fee.', 'They lose their resume upload.']),
      lq('How can students get help with questions?', 'Visit the co-op office until four or email through the portal.', ['Call the employer directly.', 'Wait for the next orientation.', 'Ask only during the workshop.'], 'hard'),
    ],
  },
  {
    id: 'ls-04',
    type: 'News Item',
    title: 'Transit Fare Update',
    transcript:
      'In local news, the city transit authority announced today that bus and train fares will rise by twenty-five cents starting next month. Officials say the additional revenue will be used to fund longer evening service, with buses running an extra hour on major routes. The increase applies to single-ride tickets and adult monthly passes. However, student and senior monthly passes will stay at their current prices. The transit authority says the change is part of a plan to make evening travel safer and more reliable. Riders can find the updated fare chart on the transit website starting this Friday.',
    questions: [
      lq('What is the news report about?', 'An increase in transit fares.', ['A new train line opening.', 'A transit workers strike.', 'Free transit for everyone.'], 'easy'),
      lq('How much will fares increase?', 'By twenty-five cents.', ['By one dollar.', 'By ten percent.', 'By fifty cents.']),
      lq('What will the extra revenue fund?', 'Longer evening service.', ['New ticket machines.', 'Lower fares for tourists.', 'More parking lots.']),
      lq('Which passes will not change in price?', 'Student and senior monthly passes.', ['Adult monthly passes.', 'Single-ride tickets.', 'All monthly passes.']),
      lq('Where can riders find the updated fares?', 'On the transit website starting Friday.', ['At every bus stop today.', 'In the local newspaper.', 'By calling the city.'], 'hard'),
    ],
  },
  {
    id: 'ls-05',
    type: 'Discussion',
    title: 'Workplace Remote Policy',
    transcript:
      'Thanks everyone for joining. We need to decide on our remote-work policy. — I think we should have two fixed days in the office each week, so the team still meets in person. — I see the value in that, but I would prefer fully flexible scheduling, where people choose their own days. — The concern with fully flexible is that we might never all be in on the same day. — That is true. Fixed days guarantee overlap. — But fixed days are hard for people with long commutes or childcare. — What if we try a middle option? — As the manager, here is what I propose: a three-month trial with two fixed office days, but the specific days can rotate by team, and we will collect feedback every month. — That sounds fair to me. — I can live with that, especially with the rotation. — Good. We will review the results before making it permanent.',
    questions: [
      lq('What are the speakers deciding?', 'A remote-work policy.', ['Where to hold a company party.', 'How to hire new staff.', 'Which office to rent.'], 'easy'),
      lq('What does the first employee prefer?', 'Two fixed office days each week.', ['Fully flexible scheduling.', 'Working from home only.', 'No remote work at all.']),
      lq('What does the second employee prefer?', 'Fully flexible scheduling.', ['Two fixed office days.', 'Coming in every day.', 'A four-day week.']),
      lq('What is the concern with fully flexible scheduling?', 'The team might never be in on the same day.', ['It costs the company more money.', 'It is against company rules.', 'It requires new software.']),
      lq('Why are fixed days hard for some people?', 'Because of long commutes or childcare.', ['Because of the office size.', 'Because of parking fees.', 'Because of internet problems.']),
      lq('What does the manager propose?', 'A three-month trial with two fixed days that rotate by team.', ['Permanent fixed days with no changes.', 'Ending remote work completely.', 'Letting each person decide forever.']),
      lq('How often will feedback be collected?', 'Every month.', ['Every week.', 'Once at the very end.', 'It will not be collected.']),
      lq('What will the team do before making the policy permanent?', 'Review the trial results.', ['Vote again immediately.', 'Ask another department to decide.', 'Hire a consultant.'], 'hard'),
    ],
  },
  {
    id: 'ls-06',
    type: 'Viewpoints',
    title: 'City Bike Lanes',
    transcript:
      'We asked listeners to share their views on the city new bike lanes, and the responses were mixed. Several supporters said the lanes make cycling much safer, especially for children riding to school. Others pointed out that more cycling could reduce car traffic during rush hour. On the other side, some critics were frustrated about losing on-street parking, saying it hurts local shops. A few callers raised a seasonal concern: they wondered who will clear snow from the bike lanes in winter, and whether that adds to the city maintenance costs. Overall, most callers agreed the lanes are a good idea, but they want the city to plan carefully for parking and winter upkeep.',
    questions: [
      lq('What issue are people giving opinions about?', 'The city new bike lanes.', ['A new parking garage.', 'A public transit fare.', 'A school bus route.'], 'easy'),
      lq('What benefit do supporters mention first?', 'The lanes make cycling safer, especially for children.', ['They make driving faster.', 'They lower city taxes.', 'They reduce street noise.']),
      lq('What other benefit is mentioned?', 'More cycling could reduce car traffic at rush hour.', ['More parking for shops.', 'Cheaper bus fares.', 'Quieter streets at night.']),
      lq('What concern do critics raise?', 'Losing on-street parking hurts local shops.', ['The lanes are too narrow.', 'Cyclists ride too fast.', 'The lanes look unattractive.']),
      lq('What winter concern is raised?', 'Who will clear snow from the lanes, and the added maintenance cost.', ['That cyclists will not ride in winter.', 'That the lanes freeze over for cars.', 'That snow removal is illegal.']),
      lq('What is the overall opinion of most callers?', 'The lanes are a good idea, but parking and winter upkeep need careful planning.', ['The lanes should be removed.', 'Everyone fully opposes the lanes.', 'No one had any concerns.'], 'hard'),
    ],
  },
  {
    id: 'ls-07',
    type: 'Problem Solving',
    title: 'Lost Delivery Package',
    segments: [
      { q: 3, text: 'Hello, I am calling because a package that was supposed to arrive yesterday is marked as delivered, but I never received it. — I can look into that for you. May I have your order or tracking number? — Yes, it is R B four four two nine. — Thank you. I see the driver uploaded a delivery photo, and it shows a door with a blue mat.' },
      { q: 3, text: 'That is strange, my mat is grey. It looks like they left it at the wrong entrance. — You may be right. It seems the driver used the side door of the building instead of the main lobby. — So what happens now? — I can do two things. I can send a replacement that would arrive in three business days, or I can process a full refund today. — I think I will take the replacement.' },
      { q: 2, text: 'Sure. One thing to note: please do not place a second order for the same item, because that can confuse the claim and delay everything. — Understood. — I will email you a confirmation with the new tracking number within the hour.' },
    ],
    questions: [
      lq('What is the customer calling about?', 'A package marked delivered that never arrived.', ['A product that arrived damaged.', 'A charge for a delivery she did not order.', 'A delivery sent to the wrong city.'], 'easy'),
      lq('What does the agent ask for first?', 'The order or tracking number.', ['The customer credit card number.', 'A photo of the missing package.', 'The customer address history.']),
      lq('What does the delivery photo show?', 'A door with a blue mat.', ['An empty hallway with no door.', 'A package on the customer grey mat.', 'A locked mailbox.']),
      lq('What most likely happened to the package?', 'The driver left it at the wrong entrance.', ['The package was never shipped.', 'A neighbour took it inside.', 'The driver returned it to the warehouse.']),
      lq('What two options does the agent offer?', 'A replacement shipment or a full refund.', ['A discount coupon or store credit.', 'A second delivery attempt or a complaint form.', 'A partial refund or a free upgrade.']),
      lq('Which option does the customer choose?', 'The replacement shipment.', ['The full refund.', 'Store credit for a future order.', 'To wait one more day.']),
      lq('What does the agent warn the customer not to do?', 'Place a second order for the same item.', ['Open the package before checking it.', 'Contact the driver directly.', 'Cancel her account.'], 'hard'),
      lq('How will the customer get the new tracking number?', 'By email within the hour.', ['By text message the next day.', 'By calling back later.', 'In a letter by mail.']),
    ],
  },
  {
    id: 'ls-08',
    type: 'Information',
    title: 'Library Renovation Notice',
    transcript:
      'Attention library visitors: starting next week, the second floor will be closed for renovations. During this time, the study rooms normally on the second floor will be relocated to the basement level. Please note that printing and photocopying services will be unavailable for the first two days of the renovation, while the machines are moved. Book pickup and returns will continue as usual at the main desk on the ground floor. We expect the work to take about three weeks. We apologize for any inconvenience and thank you for your patience. For updates, please check the notice board near the entrance.',
    questions: [
      lq('What is the announcement about?', 'Renovations to the library.', ['A new library membership program.', 'Extended opening hours.', 'A used book sale.'], 'easy'),
      lq('Which floor is being renovated?', 'The second floor.', ['The basement.', 'The ground floor.', 'The top floor.']),
      lq('Where will the study rooms be moved?', 'To the basement level.', ['To the ground floor.', 'To a nearby building.', 'They will be closed entirely.']),
      lq('What service will be unavailable for the first two days?', 'Printing and photocopying.', ['Book returns.', 'Wi-Fi access.', 'The reading area.']),
      lq('What service will continue as usual?', 'Book pickup and returns at the main desk.', ['Second-floor study rooms.', 'The printing service.', 'Group tours.']),
      lq('Where can visitors find updates?', 'On the notice board near the entrance.', ['By calling each morning.', 'On the second floor.', 'In a weekly email.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-01',
    type: 'Problem Solving',
    title: 'Parking Permit Confusion',
    segments: [
      { q: 3, text: 'Hi, I am trying to renew my residential parking permit online, but the system keeps rejecting my application. — Let me help. Can you tell me what message you are seeing? — It says the address does not match. — That usually means the address on your vehicle registration is different from the one on your permit application. — Oh. I did move within the same neighbourhood a couple of months ago.' },
      { q: 3, text: 'That would explain it. The two addresses have to match exactly before we can approve the permit. — What do I need to do? — Please upload a copy of your current lease or a utility bill that shows your new address. — Can I do that on the same website? — Yes, there is an upload section near the bottom of the application page.' },
      { q: 2, text: 'And how long does approval take? — Usually about two business days once we receive the documents. — Great, thank you. — Just make sure the document is recent, within the last three months, or the system will not accept it.' },
    ],
    questions: [
      lq('What problem is the caller having?', 'The online system keeps rejecting her parking permit application.', ['She lost her printed parking permit.', 'She was charged twice for a permit.', 'Her car was towed from her spot.'], 'easy'),
      lq('What error message does the caller see?', 'The address does not match.', ['The payment was declined.', 'The permit has already expired.', 'The vehicle is not registered.']),
      lq('Why does the address not match?', 'She moved to a new address in the same neighbourhood.', ['She entered her work address by mistake.', 'She used an old email account.', 'She registered a different vehicle.']),
      lq('What must match before the permit is approved?', 'The vehicle registration address and the application address.', ['Her driver licence and her passport.', 'Her name and her phone number.', 'Her bank details and her billing address.']),
      lq('What is the caller asked to upload?', 'A current lease or a utility bill showing the new address.', ['A photo of her licence plate.', 'A copy of her car insurance.', 'A signed letter from her landlord.']),
      lq('Where can she upload the document?', 'In an upload section near the bottom of the application page.', ['By emailing the parking office.', 'At the city hall front desk.', 'Through a separate mobile app.']),
      lq('How long does approval usually take?', 'About two business days after the documents are received.', ['Within one hour.', 'About three weeks.', 'The same day, automatically.']),
      lq('What does the clerk remind the caller about the document?', 'It must be recent, within the last three months.', ['It must be printed in colour.', 'It must be signed by a witness.', 'It must be mailed, not uploaded.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-02',
    type: 'Problem Solving',
    title: 'Damaged Laundry Card',
    segments: [
      { q: 4, text: 'Hi, I added twenty dollars to my laundry card this morning, but now the machines will not read it at all. — Sorry to hear that. Can you give me the card number on the back? — It is L C seven seven one. — Thanks. I can see the twenty dollars was added, so the balance is fine. The chip on the card itself may just be damaged. — That makes sense, it is pretty scratched.' },
      { q: 2, text: 'No problem. I can transfer your full balance onto a brand new card. — Do I have to pay for the new card? — No, the replacement is free in this case, since the card failed. — Where do I pick it up? — Come to the front desk after three this afternoon, and ask for me, Priya.' },
      { q: 2, text: 'Should I bring the old card? — Yes, please bring it so we can deactivate it. — Got it, thank you. — And just so you know, do not keep adding money to the old card, because that balance would be hard to recover.' },
    ],
    questions: [
      lq('Why is the student calling campus housing?', 'His laundry card stopped working after he added money.', ['He lost his laundry card.', 'A machine took his money without running.', 'He wants to cancel his laundry account.'], 'easy'),
      lq('What does the assistant ask for?', 'The card number on the back of the card.', ['His student ID number.', 'His room number.', 'The machine number.']),
      lq('What does the assistant confirm about the balance?', 'The twenty dollars was added and the balance is fine.', ['The balance was lost completely.', 'The card was never loaded.', 'The balance is on a different card.']),
      lq('What is the likely cause of the problem?', 'The chip on the card is damaged.', ['The machines are out of service.', 'The student used the wrong card.', 'The account was suspended.']),
      lq('What solution does the assistant offer?', 'Transfer the balance to a new card for free.', ['Refund the money in cash.', 'Repair the old card on site.', 'Send a new card by mail.']),
      lq('When and where can he pick up the new card?', 'At the front desk after three this afternoon.', ['At the laundry room immediately.', 'At the main office tomorrow morning.', 'From a locker any time.']),
      lq('What should he bring to the desk?', 'The old card, so it can be deactivated.', ['A photo ID and cash.', 'A receipt for the twenty dollars.', 'Nothing at all.']),
      lq('What does the assistant advise him not to do?', 'Keep adding money to the old card.', ['Use the machines on another floor.', 'Ask for Priya at the desk.', 'Wait until after three.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-03',
    type: 'Problem Solving',
    title: 'Changed Medical Appointment',
    segments: [
      { q: 3, text: 'Hello, I got a message that my appointment with the skin specialist was moved to Thursday at nine in the morning, but I cannot make that time because of work. — I understand. Let me see what else we have. The specialist had a cancellation, so there is actually an earlier slot this Wednesday at four in the afternoon. — Hmm, four is tight for me too.' },
      { q: 3, text: 'Alternatively, the doctor offers video appointments. There is one open next Tuesday at six in the evening. — A video appointment might be easier, since I would not have to leave work. — That is a good option for a follow-up like yours. I will book the Tuesday video visit. — Do I need to do anything to prepare? — Yes, please log in to the patient portal ten minutes early to test your camera and microphone.' },
      { q: 2, text: 'Will I get a reminder? — Yes, the system sends a link by email the day before. — One more thing: if you cannot attend, cancel at least twenty-four hours ahead, or there may be a missed-visit fee.' },
    ],
    questions: [
      lq('Why is the patient calling the clinic?', 'A new appointment time does not work with his schedule.', ['He wants to see a different doctor.', 'He needs to renew a prescription.', 'He forgot the clinic address.'], 'easy'),
      lq('What change was made to the original appointment?', 'It was moved to Thursday at nine in the morning.', ['The specialist went on vacation.', 'The clinic closed for repairs.', 'It was cancelled entirely.']),
      lq('What earlier in-person slot is available?', 'Wednesday at four in the afternoon.', ['Thursday at noon.', 'Monday at eight in the morning.', 'Friday at five.']),
      lq('What alternative does the receptionist suggest?', 'A video appointment next Tuesday evening.', ['A phone call with a nurse.', 'A walk-in visit any day.', 'A referral to another clinic.']),
      lq('Why does the patient prefer the video appointment?', 'He would not have to leave work.', ['It is cheaper than an in-person visit.', 'He does not like the specialist.', 'It can be rescheduled freely.']),
      lq('How should the patient prepare for the video visit?', 'Log in ten minutes early to test the camera and microphone.', ['Print and sign a consent form.', 'Arrive at the clinic in person.', 'Call the doctor beforehand.']),
      lq('How will the patient get the appointment link?', 'By email the day before.', ['By text message one hour before.', 'By mail within a week.', 'From the front desk on arrival.']),
      lq('What is the patient warned about cancelling?', 'He must cancel at least twenty-four hours ahead to avoid a fee.', ['He cannot cancel a video visit at all.', 'He must cancel in person.', 'Cancelling will remove him as a patient.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-04',
    type: 'Problem Solving',
    title: 'Incorrect Phone Bill',
    segments: [
      { q: 3, text: 'Hi, I am looking at my latest phone bill, and there is a forty dollar charge for international roaming, but I did not use my phone abroad this month. — Let me check your account. Can you confirm the last four digits of your number? — Sure, it is eight eight one two. — Thank you. I see here that a travel package was added to your line, but it looks like it started one day after your trip began.' },
      { q: 4, text: 'Yes, I left on the first, but I think the package only turned on the second. — That is exactly what happened, so you were charged regular roaming rates for that first day. — So the charge is partly a mistake? — It is a timing issue. As a courtesy, I can apply a partial credit for that first day of roaming. — That would be fair, thank you. — The credit will appear on your next bill, not this one.' },
      { q: 1, text: 'Okay. Is there anything I should do for next time? — Yes, activate any travel package at least one full day before you leave, to avoid this.' },
    ],
    questions: [
      lq('Why is the customer calling the phone company?', 'He was charged for international roaming he did not expect.', ['His phone was lost while travelling.', 'He wants to cancel his phone plan.', 'His bill never arrived.'], 'easy'),
      lq('What does the agent ask the customer to confirm?', 'The last four digits of his phone number.', ['His full credit card number.', 'His home address and postal code.', 'His passport number.']),
      lq('What does the agent find on the account?', 'A travel package started one day after the trip began.', ['The customer used data on two phones.', 'The package was never added.', 'The customer changed plans mid-month.']),
      lq('Why was the customer charged roaming for the first day?', 'The travel package was not active yet on that day.', ['He used too much data.', 'He called an international number.', 'The package only covered texts.']),
      lq('What does the agent offer?', 'A partial credit for the first day of roaming.', ['A full refund of the bill.', 'A free month of service.', 'A new travel package.']),
      lq('When will the credit appear?', 'On the next bill, not the current one.', ['Immediately, as cash back.', 'On this month bill.', 'Only after he travels again.']),
      lq('How does the customer react to the offer?', 'He agrees that it is fair.', ['He demands a full refund.', 'He decides to switch companies.', 'He refuses the credit.']),
      lq('What does the agent advise for next time?', 'Activate the travel package at least one full day before leaving.', ['Turn off the phone while abroad.', 'Buy a local SIM card instead.', 'Call the company from the airport.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-05',
    type: 'Daily Life Conversation',
    title: 'Weekend Hiking Plan',
    transcript:
      'So, are we still on for the hike this Saturday? — I want to, but I checked the forecast and it says rain in the morning. — Hmm. It is supposed to clear up by the afternoon, though, right? — Yes, sunny after one. So maybe we leave after lunch instead of early morning. — That works. Should we still do the long trail? — With the late start, let us take the shorter loop, so we finish before dark. — Good idea. I will bring extra socks in case the ground is muddy. — Smart. I will pack some snacks and water for both of us. — Perfect. Let us meet at my place at noon.',
    questions: [
      lq('What are the speakers planning?', 'A weekend hike.', ['A camping trip.', 'A cycling race.', 'A day at the beach.'], 'easy'),
      lq('Why do they change their start time?', 'Rain is expected in the morning.', ['One of them has to work.', 'The trail is closed early.', 'It will be too hot later.']),
      lq('When do they decide to leave?', 'After lunch.', ['Early in the morning.', 'In the evening.', 'At sunrise.']),
      lq('Which trail do they choose?', 'The shorter loop.', ['The long trail.', 'A new trail they have not tried.', 'The trail closest to the city.']),
      lq('What will one speaker bring because of the weather?', 'Extra socks, in case the ground is muddy.', ['An umbrella for the rain.', 'A full change of clothes.', 'A first-aid kit.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-06',
    type: 'Daily Life Conversation',
    title: 'Shared Grocery Run',
    transcript:
      'The long weekend is coming up, so should we do one big grocery run together? — Good idea, it is cheaper if we split a taxi back. — Agreed. What do you need? — I am making soup, so mostly vegetables: carrots, celery, onions. — I just need snacks and a few drinks for when people come over. — Okay. Do you want to go to the big store across town, or the one nearby? — The big one has better prices, but it is far. — That is exactly why splitting the taxi makes sense. — True. Let us go Friday afternoon, before it gets busy. — Works for me. I will check tonight if we need anything else.',
    questions: [
      lq('What do the roommates decide to do?', 'Do one big grocery run together.', ['Order groceries online.', 'Cook dinner for guests.', 'Go out to a restaurant.'], 'easy'),
      lq('Why does splitting a taxi make sense?', 'The big store has better prices but is far away.', ['Neither of them owns a car.', 'The buses are not running.', 'They are buying heavy furniture.']),
      lq('What does the first speaker need to buy?', 'Vegetables for soup.', ['Snacks and drinks.', 'Cleaning supplies.', 'Bread and milk.']),
      lq('What does the second speaker need?', 'Snacks and a few drinks.', ['Vegetables for soup.', 'A new set of dishes.', 'Paper plates.']),
      lq('When do they plan to go?', 'Friday afternoon, before it gets busy.', ['Saturday morning.', 'Sunday evening.', 'Right away tonight.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-07',
    type: 'Daily Life Conversation',
    title: 'Birthday Dinner Booking',
    transcript:
      'I tried to book that seafood place for your birthday, but they are fully booked all weekend. — Oh no. Is there anywhere else you like? — There is the Italian restaurant downtown. It has a nice patio with outdoor seating. — I love that place. Do they take reservations? — Yes, and they have a discount if we arrive before six. — Before six is a bit early, but the discount is worth it. — Agreed. Should I book a table for six people? — Make it seven, my cousin might come. — Okay, seven it is. I will request the patio. — Perfect. Thanks for organizing this.',
    questions: [
      lq('What is the couple planning?', 'A birthday dinner.', ['An anniversary trip.', 'A work celebration.', 'A family reunion.'], 'easy'),
      lq('Why can they not go to the seafood place?', 'It is fully booked all weekend.', ['It is too expensive.', 'It closed permanently.', 'It is too far away.']),
      lq('What do they like about the Italian restaurant?', 'It has a patio with outdoor seating.', ['It has live music.', 'It is open very late.', 'It allows pets.']),
      lq('How can they get a discount?', 'By arriving before six.', ['By booking online.', 'By ordering a set menu.', 'By paying in cash.']),
      lq('How many people will the reservation be for?', 'Seven, in case a cousin comes.', ['Six people.', 'Five people.', 'Just the two of them.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-08',
    type: 'Daily Life Conversation',
    title: 'Neighbourhood Garage Sale',
    transcript:
      'Are we still doing the garage sale this Saturday? — Yes. What time should we start? — Let us open at nine. Early shoppers always come for the good stuff. — Good. How should we price things? — Keep it simple. Small items at one dollar each, and we can negotiate on the bigger pieces. — Sounds easy. What about the old books? Nobody ever buys those. — Right. Whatever does not sell, let us just donate it to the library. — Good plan. I will make some signs to put up on the corner. — And I will get a box of coins for change. — Great, see you Saturday morning.',
    questions: [
      lq('What are the neighbours organizing?', 'A garage sale.', ['A book club.', 'A library fundraiser.', 'A street festival.'], 'easy'),
      lq('What time will they start?', 'At nine in the morning.', ['At noon.', 'At seven.', 'In the afternoon.']),
      lq('How will they price small items?', 'At one dollar each.', ['At five dollars each.', 'By weight.', 'For free.']),
      lq('What will they do with unsold books?', 'Donate them to the library.', ['Throw them away.', 'Keep them for next time.', 'Sell them online.']),
      lq('What will each neighbour prepare?', 'One will make signs and the other will get coins for change.', ['Both will make signs.', 'One will cook food and the other will clean.', 'They will rent tables and chairs.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-09',
    type: 'Information',
    title: 'Job Search Workshop',
    transcript:
      'Good afternoon. I want to tell you about our upcoming job-search workshop. The workshop covers three main areas: how to use keywords in your resume, how to practice for interviews, and how to build a professional online profile. It will be held next Thursday from two to four in room 210. Seats are limited to twenty people, so you must register in advance through the career centre website. Registration closes Wednesday at five. There is no fee, but if you sign up and cannot attend, please cancel so someone else can take your place. Bring a copy of your current resume if you have one, because we will review them in small groups.',
    questions: [
      lq('What is being announced?', 'A job-search workshop.', ['A new online course.', 'A career fair.', 'A resume-writing contest.'], 'easy'),
      lq('What three areas does the workshop cover?', 'Resume keywords, interview practice, and online profiles.', ['Salary negotiation, taxes, and benefits.', 'Cover letters, references, and dress code.', 'Networking, public speaking, and writing.']),
      lq('When and where is the workshop held?', 'Next Thursday from two to four in room 210.', ['Next Wednesday morning in the library.', 'This Friday afternoon online.', 'Monday evening in the main hall.']),
      lq('Why must students register in advance?', 'Seats are limited to twenty people.', ['There is an entry fee.', 'It is required for graduation.', 'The room changes each week.']),
      lq('When does registration close?', 'Wednesday at five.', ['Thursday at two.', 'The day of the workshop.', 'One week before.']),
      lq('What should students bring if they have one?', 'A copy of their current resume.', ['A laptop and charger.', 'A photo for their profile.', 'A registration fee.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-10',
    type: 'Information',
    title: 'Recycling Pickup Rules',
    transcript:
      'This is a reminder about the city recycling rules. All cardboard boxes must be flattened before pickup, otherwise the truck cannot collect them. Glass bottles and jars should go in the blue bin, not the green one. Please rinse any food containers before recycling them. Because of the statutory holiday next Monday, recycling pickup for that week will move one day later, so your usual Monday pickup will happen on Tuesday. Set your bins out by seven in the morning. If your recycling is not collected, please report it online within twenty-four hours, so we can arrange a return trip.',
    questions: [
      lq('What is this announcement about?', 'City recycling rules and a schedule change.', ['A new garbage fee.', 'A street cleaning event.', 'A composting program.'], 'easy'),
      lq('What must be done with cardboard boxes?', 'They must be flattened.', ['They must be tied with string.', 'They must be left whole.', 'They must go in the green bin.']),
      lq('Where should glass go?', 'In the blue bin.', ['In the green bin.', 'With the cardboard.', 'In a separate bag.']),
      lq('Why will pickup move one day later?', 'Because of a statutory holiday.', ['Because of a snowstorm.', 'Because of truck repairs.', 'Because of staff training.']),
      lq('When should bins be set out?', 'By seven in the morning.', ['By noon.', 'The night before only.', 'Any time on pickup day.']),
      lq('What should residents do if recycling is not collected?', 'Report it online within twenty-four hours.', ['Wait until the next week.', 'Call the mayor office.', 'Leave the bins out longer.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-11',
    type: 'Information',
    title: 'Bank Account Security',
    transcript:
      'Thank you for calling about account security. I would like to share a few important reminders. First, please update your online banking password regularly, and use a different password than the one you use for other websites. Second, our staff will never ask you for your full verification code, so never share that code with anyone, even someone claiming to be from the bank. Third, if you receive a suspicious text or email, do not click any links; instead, report it through the secure messaging tool inside our official app. Finally, you can turn on instant alerts, so you are notified of any transaction over a limit you set. These steps greatly reduce the risk of fraud.',
    questions: [
      lq('What is the main topic of the message?', 'How to keep your bank account secure.', ['How to open a new account.', 'How to apply for a loan.', 'How to increase a credit limit.'], 'easy'),
      lq('What is said about passwords?', 'Update them regularly and do not reuse them on other sites.', ['Share them only with bank staff.', 'Write them on the back of your card.', 'Use the same one everywhere.']),
      lq('What will bank staff never ask for?', 'Your full verification code.', ['Your account number.', 'Your home address.', 'Your date of birth.']),
      lq('What should you do with a suspicious email?', 'Report it through the secure tool in the official app, without clicking links.', ['Reply to confirm your details.', 'Forward it to friends.', 'Click the link to check it.']),
      lq('What feature can notify you of large transactions?', 'Instant alerts with a limit you set.', ['A monthly paper statement.', 'A weekly phone call.', 'A printed receipt.']),
      lq('What is the overall purpose of these steps?', 'To reduce the risk of fraud.', ['To raise account fees.', 'To close inactive accounts.', 'To speed up payments.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-12',
    type: 'Information',
    title: 'Community Pool Notice',
    transcript:
      'Attention pool users. Please note that lane swimming will be unavailable for the next two weeks, while we repair the filtration system in the main pool. However, family swim times and group swimming lessons will continue as scheduled in the smaller pool. Change rooms and showers remain open as usual. Members who only use the pool for lane swimming may request a two-week extension on their membership at the front desk. We expect the main pool to reopen on the fifteenth. Please watch for signs posted at the entrance, and thank you for your understanding during the repairs.',
    questions: [
      lq('What is the notice mainly about?', 'A temporary closure for pool repairs.', ['A new swimming class.', 'A membership price increase.', 'A pool opening celebration.'], 'easy'),
      lq('What will be unavailable for two weeks?', 'Lane swimming in the main pool.', ['The change rooms.', 'Swimming lessons.', 'The whole facility.']),
      lq('What will continue as scheduled?', 'Family swim times and group lessons in the smaller pool.', ['Lane swimming in the main pool.', 'Private coaching only.', 'Nothing during the repairs.']),
      lq('What can lane swimmers request?', 'A two-week membership extension.', ['A full refund.', 'A free guest pass.', 'A different sport class.']),
      lq('When is the main pool expected to reopen?', 'On the fifteenth.', ['Next Monday.', 'In one month.', 'The notice does not say.']),
      lq('Where should members look for updates?', 'Signs posted at the entrance.', ['The city newspaper.', 'A text message.', 'The lifeguard office.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-13',
    type: 'News Item',
    title: 'New Farmers Market',
    transcript:
      'A new farmers market is coming to the downtown square. Organizers announced that the market will open every Saturday morning, beginning in June. It will feature local farmers selling fresh produce, baked goods, and handmade crafts. Supporters say the market will help small farms reach new customers and bring more visitors to nearby shops and cafes. There is no fee to attend, though vendors must apply for a stall in advance. Organizers hope the market will become a weekly gathering place for the community. The first market day is scheduled for June seventh.',
    questions: [
      lq('What is the news item about?', 'A new farmers market opening downtown.', ['A new shopping mall.', 'A food festival contest.', 'A farm closing down.'], 'easy'),
      lq('How often will the market be held?', 'Every Saturday morning.', ['Every weekday.', 'Once a month.', 'Only on summer evenings.']),
      lq('What is expected to benefit from the market?', 'Small farms and nearby shops.', ['Large supermarkets.', 'Online delivery services.', 'The city transit system.']),
      lq('What must vendors do?', 'Apply for a stall in advance.', ['Pay a daily entry fee.', 'Bring their own tables only.', 'Register as visitors.']),
      lq('When is the first market day?', 'June seventh.', ['The first of May.', 'Every Sunday in July.', 'It has not been decided.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-14',
    type: 'News Item',
    title: 'Storm Cleanup Program',
    transcript:
      'After this week windstorm brought down many tree branches across the city, officials have announced a special cleanup program. Residents are asked to place fallen branches at the curb by next Friday, and city crews will collect them at no charge. The program is meant to help neighbourhoods recover quickly and reduce fire risk from dry wood. However, the city says it will not accept construction lumber or treated wood, only natural branches and yard debris. Crews will make just one pass through each neighbourhood, so residents are encouraged to have their branches out on time.',
    questions: [
      lq('What is the report mainly about?', 'A cleanup program after a windstorm.', ['A warning about a coming storm.', 'A new tree-planting project.', 'A ban on backyard fires.'], 'easy'),
      lq('What are residents asked to do?', 'Place fallen branches at the curb by next Friday.', ['Burn the branches themselves.', 'Take branches to a landfill.', 'Wait for crews to enter their yards.']),
      lq('How much does the collection cost residents?', 'Nothing; it is free.', ['A small per-bag fee.', 'A flat fee of twenty dollars.', 'It depends on the amount.']),
      lq('What will the city not accept?', 'Construction lumber or treated wood.', ['Natural tree branches.', 'Leaves and yard debris.', 'Small twigs.']),
      lq('Why should residents put branches out on time?', 'Crews will make only one pass through each neighbourhood.', ['The branches will be sold.', 'A fee applies after Friday.', 'Crews collect daily for a month.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-15',
    type: 'News Item',
    title: 'School Lunch Pilot',
    transcript:
      'A new school lunch program is being tested in three local schools this year. Under the pilot, students will receive a free, healthy lunch each day, regardless of their family income. Supporters say the program aims to reduce food insecurity and help students concentrate better in class. The program is funded by a one-year grant, and officials will review the results at the end of the semester before deciding whether to expand it. Early feedback from teachers has been positive, with several noting that fewer students come to afternoon classes hungry.',
    questions: [
      lq('What is the news item about?', 'A pilot free school lunch program.', ['A new school building.', 'A change to school hours.', 'A cooking class for students.'], 'easy'),
      lq('How many schools are in the pilot?', 'Three.', ['One.', 'Ten.', 'Every school in the city.']),
      lq('What is the program goal?', 'To reduce food insecurity and help students focus.', ['To teach students to cook.', 'To raise money for the school.', 'To replace the cafeteria staff.']),
      lq('How is the program funded?', 'By a one-year grant.', ['By student fees.', 'By a permanent city budget.', 'By parent donations.']),
      lq('When will the results be reviewed?', 'At the end of the semester.', ['After one week.', 'In five years.', 'Only if it fails.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-16',
    type: 'News Item',
    title: 'Library Technology Grant',
    transcript:
      'The city library has received a major technology grant, officials announced this morning. The funding will be used to buy new laptops for public use, offer free digital-literacy classes, and extend evening computer access on weekdays. Library staff say the goal is to help residents who do not have computers at home, including students and job seekers. The new laptops will be available to borrow within the library starting next month. The digital-literacy classes will begin in the fall, and registration will open in September. The library says all programs funded by the grant will be free to the public.',
    questions: [
      lq('What did the library receive?', 'A technology grant.', ['A new building.', 'A large book donation.', 'A staff award.'], 'easy'),
      lq('What will the grant be used for?', 'Laptops, digital-literacy classes, and extended evening access.', ['A new cafe and lounge.', 'More parking spaces.', 'Repairing the roof.']),
      lq('Who is the funding meant to help?', 'Residents without computers at home, such as students and job seekers.', ['Library staff only.', 'Visitors from other cities.', 'Local businesses.']),
      lq('When will the laptops be available?', 'Starting next month, to borrow within the library.', ['Immediately, to take home.', 'Next year.', 'Only during classes.']),
      lq('How much will the grant-funded programs cost the public?', 'They will be free.', ['A small membership fee.', 'Ten dollars per class.', 'Only the laptops are free.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-17',
    type: 'Discussion',
    title: 'Office Kitchen Rules',
    transcript:
      'We keep having problems with the office kitchen, so let us sort out some rules. — The biggest issue is the mess. I think we need a cleaning schedule with names and days. — A schedule could work, but people might still ignore it. — Then maybe we also label the shelves, so everyone has their own space for food. — Labelled shelves would help with the missing-lunch problem too. — Right, things keep disappearing from the fridge. — What about dishes left in the sink? — A simple rule: wash your own dishes before you leave for the day. — As the office manager, I suggest we try both the cleaning schedule and labelled shelves for one month. — That seems reasonable. — Agreed, a month is enough to see if it works. — Good. I will post the schedule on Monday, and we will check in after four weeks.',
    questions: [
      lq('What problem are the coworkers discussing?', 'Problems with the office kitchen.', ['A broken coffee machine.', 'Where to order lunch.', 'Office seating arrangements.'], 'easy'),
      lq('What does the first speaker suggest?', 'A cleaning schedule with names and days.', ['Hiring a cleaning service.', 'Closing the kitchen.', 'Banning food in the office.']),
      lq('What concern is raised about the schedule?', 'People might still ignore it.', ['It costs too much.', 'It takes too long to make.', 'Nobody can read it.']),
      lq('What is suggested to solve the missing-food problem?', 'Labelling the shelves so everyone has their own space.', ['Locking the fridge.', 'Removing the fridge.', 'Buying lunch for everyone.']),
      lq('What simple rule is proposed for dishes?', 'Wash your own dishes before leaving for the day.', ['Use only paper plates.', 'Hire someone to wash them.', 'Leave dishes for the morning.']),
      lq('What does the office manager propose?', 'Try the cleaning schedule and labelled shelves for one month.', ['Only the cleaning schedule.', 'Closing the kitchen for a month.', 'Doing nothing for now.']),
      lq('How long is the trial?', 'One month.', ['One week.', 'Three months.', 'Permanent, with no review.']),
      lq('What will happen after four weeks?', 'The team will check in to see if it works.', ['The rules become permanent automatically.', 'The kitchen will close.', 'They will hire a manager.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-18',
    type: 'Discussion',
    title: 'College Orientation Format',
    transcript:
      'Let us plan the format for new-student orientation. — I think it should be fully online, so students can join from anywhere before they arrive. — Online is convenient, but new students miss the chance to see the campus. — That is a fair point, especially for international students. — Maybe we do a hybrid: online sessions for information, plus an in-person campus day. — I like that. The online part covers the boring paperwork. — And the in-person day can focus on tours and meeting people. — We all seem to agree international students need at least one campus tour. — Definitely. Some of them have never been to the city before. — So, hybrid it is, with a required campus tour. — Let us draft the schedule and send it to the committee next week. — Agreed.',
    questions: [
      lq('What are the student leaders planning?', 'The format for new-student orientation.', ['A graduation ceremony.', 'A campus sports event.', 'A fundraising campaign.'], 'easy'),
      lq('What does the first speaker suggest?', 'A fully online orientation.', ['A fully in-person orientation.', 'Cancelling orientation.', 'A weekend retreat.']),
      lq('What is the drawback of a fully online orientation?', 'New students miss the chance to see the campus.', ['It is too expensive.', 'It takes too long.', 'It needs special software.']),
      lq('What hybrid idea is proposed?', 'Online sessions for information plus an in-person campus day.', ['Two full days online.', 'A campus day with no online part.', 'Mailing information to students.']),
      lq('What would the online part cover?', 'Paperwork and information.', ['Campus tours.', 'Sports tryouts.', 'Meeting classmates.']),
      lq('Who especially needs a campus tour?', 'International students.', ['Returning students.', 'Online-only students.', 'Staff members.']),
      lq('What format do they agree on?', 'Hybrid, with a required campus tour.', ['Fully online.', 'Fully in person.', 'No orientation at all.']),
      lq('What is the next step?', 'Draft the schedule and send it to the committee.', ['Start orientation immediately.', 'Vote again next month.', 'Cancel the meeting.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-19',
    type: 'Discussion',
    title: 'Apartment Security Cameras',
    transcript:
      'Tonight we are discussing whether to add security cameras in the building lobby. — I am in favour. A few packages have gone missing, and cameras would help. — I understand the concern, but I worry about privacy. — Cameras only in the lobby, though, not in hallways or units. — That makes me more comfortable, as long as it is just shared spaces. — We should also put up clear signs, so everyone knows they are being recorded. — Good point. Signage is important, and it might even be required by law. — Who would be able to view the footage? — I think only the building manager, and only if there is an incident. — That seems fair. — So we agree: cameras in the lobby only, with signs, and limited access to footage. — Let us put it to a full vote at the next tenant meeting.',
    questions: [
      lq('What are the tenants discussing?', 'Whether to add security cameras in the lobby.', ['Raising the rent.', 'Repainting the building.', 'Hiring a security guard.'], 'easy'),
      lq('Why does one tenant support cameras?', 'Packages have been going missing.', ['There was a fire.', 'The lobby is too dark.', 'To lower insurance costs.']),
      lq('What concern does another tenant raise?', 'Privacy.', ['Cost.', 'Noise.', 'Parking.']),
      lq('Where do they agree cameras should go?', 'In the lobby only, not hallways or units.', ['In every hallway.', 'Inside each apartment.', 'At the parking lot only.']),
      lq('What do they agree to put up?', 'Clear signs that recording is taking place.', ['A complaint box.', 'A visitor log.', 'New lighting.']),
      lq('Who would be able to view the footage?', 'Only the building manager, and only after an incident.', ['Any tenant at any time.', 'The police, daily.', 'All staff members.']),
      lq('What is their final agreement?', 'Lobby cameras with signs and limited access to footage.', ['Cameras everywhere with open access.', 'No cameras at all.', 'Cameras only at night.']),
      lq('What is the next step?', 'Put it to a full vote at the next tenant meeting.', ['Install the cameras tomorrow.', 'Cancel the idea.', 'Ask the city for permission.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-20',
    type: 'Discussion',
    title: 'Team Deadline Extension',
    transcript:
      'We need to decide whether to ask for an extension on the project. — Honestly, we are behind. I think we should ask for two extra days. — I worry that asking looks bad to the client. — But submitting incomplete work looks worse. — That is true. Two days would let us finish the testing properly. — If we ask, we should send a clear, revised task list, so they see we have a plan. — Good idea. It shows we are organized, not just late. — Who should send the request? — I think the team lead should email the client this afternoon. — And we should promise the new date firmly, not ask for more later. — Agreed. So: request two extra days, attach a revised task list, and commit to the new deadline. — I will draft the email now.',
    questions: [
      lq('What are the coworkers deciding?', 'Whether to ask for a project extension.', ['Whether to hire more staff.', 'Which client to take on.', 'Where to hold a meeting.'], 'easy'),
      lq('How many extra days do they want?', 'Two.', ['Five.', 'One week.', 'One month.']),
      lq('What is the concern about asking?', 'It might look bad to the client.', ['It will cost extra money.', 'It is against company policy.', 'The client will cancel.']),
      lq('Why is submitting incomplete work seen as worse?', 'It looks worse than asking for more time.', ['It breaks the contract.', 'It cannot be fixed later.', 'The client never reads it.']),
      lq('What will they send with the request?', 'A clear, revised task list.', ['An apology letter only.', 'A refund offer.', 'A new contract.']),
      lq('Who will send the request?', 'The team lead, by email this afternoon.', ['Each member individually.', 'The client assistant.', 'Nobody; they will call.']),
      lq('What do they decide about the new deadline?', 'To commit to it firmly and not ask for more later.', ['To leave it open.', 'To ask for weekly extensions.', 'To miss it if needed.']),
      lq('What is the final plan?', 'Request two days, attach a revised task list, and commit to the new deadline.', ['Submit now and apologize.', 'Ask for a week with no plan.', 'Cancel the project.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-21',
    type: 'Viewpoints',
    title: 'Four-day School Week',
    transcript:
      'On today call-in show, listeners debated the idea of a four-day school week. Supporters were enthusiastic. Many said an extra day off would give families more time together and cut transportation costs for both schools and parents. One teacher argued that a longer weekend could reduce student and staff burnout. Critics, however, were not convinced. Several parents worried about childcare on the extra day off, since they still have to work. Others were concerned that fewer school days could create learning gaps, especially for younger students. A few callers suggested a compromise: keep five days, but make them shorter. Opinions were clearly divided.',
    questions: [
      lq('What idea are listeners debating?', 'A four-day school week.', ['A longer school year.', 'Year-round school.', 'Online-only classes.'], 'easy'),
      lq('What benefit do supporters mention?', 'More family time and lower transportation costs.', ['Higher test scores.', 'More homework.', 'Smaller class sizes.']),
      lq('What does one teacher argue?', 'A longer weekend could reduce burnout.', ['Teachers should be paid more.', 'Students need more exams.', 'School should start later.']),
      lq('What childcare concern do parents raise?', 'They still have to work on the extra day off.', ['Childcare is too expensive in summer.', 'Schools provide no lunch.', 'Buses do not run on weekends.']),
      lq('What learning concern is mentioned?', 'Fewer school days could create learning gaps.', ['Classes would be too large.', 'Teachers would quit.', 'Students would have no homework.']),
      lq('What compromise do some callers suggest?', 'Keep five days but make them shorter.', ['Remove all weekends.', 'Add a sixth school day.', 'End school in March.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-22',
    type: 'Viewpoints',
    title: 'Reusable Cup Discount',
    transcript:
      'Listeners shared their thoughts on cafes offering a discount to customers who bring a reusable cup. Many supported the idea. They said even a small discount encourages people to build greener habits and cuts down on paper-cup waste. One caller, a cafe owner, said it also saves the shop money on supplies. But not everyone was impressed. Some felt the typical discount, around ten cents, is far too small to change anyone behaviour. A couple of callers said they would rather see cafes charge extra for disposable cups instead, arguing that a penalty works better than a tiny reward. The discussion showed real disagreement about the best approach.',
    questions: [
      lq('What are people giving opinions about?', 'Cafes offering a discount for reusable cups.', ['Banning coffee cups entirely.', 'A new coffee tax.', 'Free coffee on weekends.'], 'easy'),
      lq('Why do supporters like the discount?', 'It encourages greener habits and cuts paper-cup waste.', ['It makes coffee taste better.', 'It speeds up service.', 'It lowers coffee prices overall.']),
      lq('What does the cafe owner add?', 'It saves the shop money on supplies.', ['It attracts more tourists.', 'It is required by law.', 'It is hard to manage.']),
      lq('What complaint do some callers have?', 'The discount, about ten cents, is too small to change behaviour.', ['The discount is too expensive for cafes.', 'Reusable cups are unhygienic.', 'The cups are too heavy.']),
      lq('What alternative do a couple of callers suggest?', 'Charging extra for disposable cups instead.', ['Giving cups away for free.', 'Banning reusable cups.', 'Raising all coffee prices.']),
      lq('What does the discussion show overall?', 'Real disagreement about the best approach.', ['Complete agreement.', 'That no one cares.', 'That the idea has been cancelled.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-23',
    type: 'Viewpoints',
    title: 'Public Art Funding',
    transcript:
      'We invited residents to weigh in on city spending for public art, and feelings ran high. Supporters argued that murals and sculptures improve neighbourhood pride and can even attract tourists. One artist said public art gives local creators paid work and makes plain streets more welcoming. Opponents, though, questioned the priorities. Several said the money would be better spent on practical needs, like fixing roads or improving street lighting. One caller suggested a middle path: fund public art, but only with money from private sponsors rather than city taxes. As with many of these debates, residents did not reach a clear consensus.',
    questions: [
      lq('What is the debate about?', 'City spending on public art.', ['Building a new museum.', 'An art class for children.', 'Removing old statues.'], 'easy'),
      lq('What benefit do supporters mention?', 'Murals and sculptures improve neighbourhood pride and attract tourists.', ['They lower city taxes.', 'They reduce traffic.', 'They create more parking.']),
      lq('What does the artist add?', 'Public art gives local creators paid work.', ['Art should be free to make.', 'Tourists dislike murals.', 'Streets should stay plain.']),
      lq('What do opponents prefer to spend money on?', 'Practical needs like roads and street lighting.', ['More public art downtown.', 'A new sports arena.', 'Free transit.']),
      lq('What middle path does one caller suggest?', 'Fund art with private sponsors rather than city taxes.', ['Stop all public art.', 'Double the art budget.', 'Let artists pay the city.']),
      lq('What was the outcome of the debate?', 'Residents did not reach a clear consensus.', ['Everyone agreed to fund art.', 'The city cancelled the budget.', 'The mayor decided alone.'], 'hard'),
    ],
  },
  {
    id: 'ls-extra-24',
    type: 'Viewpoints',
    title: 'Quiet Cars on Trains',
    transcript:
      'Listeners called in about the new quiet cars on commuter trains, where talking and phone calls are discouraged. Many riders welcomed them. They said the quiet cars let them read, work, or simply relax after a long day, without background noise. One commuter said it was the best part of her ride. Others were less sure. A few callers doubted that the rule could be enforced, especially during busy rush-hour trips when the cars are packed. Some also felt that asking strangers to be quiet could lead to awkward conflicts. Overall, riders liked the idea but were uncertain whether it would work in practice.',
    questions: [
      lq('What are listeners discussing?', 'New quiet cars on commuter trains.', ['A new train line.', 'Higher train fares.', 'A train delay.'], 'easy'),
      lq('Why do many riders welcome the quiet cars?', 'They can read, work, or relax without noise.', ['They get cheaper tickets.', 'The cars are faster.', 'The cars have more seats.']),
      lq('What did one commuter say?', 'It was the best part of her ride.', ['She never uses the quiet car.', 'It made her trip longer.', 'She wants more announcements.']),
      lq('What doubt do some callers raise?', 'The rule may be hard to enforce during rush hour.', ['The cars are too small.', 'The fares are unfair.', 'The trains are too slow.']),
      lq('What social concern is mentioned?', 'Asking strangers to be quiet could cause awkward conflicts.', ['People will miss their stops.', 'Phones will not get signal.', 'Riders will fall asleep.']),
      lq('What is the overall view of riders?', 'They like the idea but are unsure it will work in practice.', ['They strongly oppose it.', 'They want it removed.', 'They are completely sure it works.'], 'hard'),
    ],
  },
]

function buildListeningMock(mock) {
  const focus = LISTENING_FOCUS[mock.type]
  // Problem Solving plays in segments; other types use one transcript.
  const transcript = mock.transcript
    || (mock.segments ? mock.segments.map((segment) => segment.text).join(' ') : '')
  return {
    ...mock,
    transcript,
    time: `${focus.count} questions`,
    focus: mock.focus || focus.en,
    focusKo: mock.focusKo || focus.ko,
    focusZh: mock.focusZh || focus.zh,
  }
}

export const CELPIP_MOCK_TESTS = {
  listening: [...LISTENING_MOCKS, ...GENERATED_LISTENING].map(buildListeningMock),
  reading: [
    {
      id: 'rd-01',
      type: 'Correspondence',
      title: 'Email From a Program Advisor',
      time: '11 questions',
      focus: '메일에서 요청사항, 이유, 다음 단계 찾기',
      passage:
        'Hello Mina, your final transcript has arrived, but your graduation letter is still pending. Please contact the registrar before Friday if you need the letter for a work permit application. Once the letter is issued, upload both documents to your account.',
      questions: [
        'Which document has arrived?',
        'Why should Mina contact the registrar?',
        'What should she upload later?',
      ],
    },
    {
      id: 'rd-02',
      type: 'Apply a Diagram',
      title: 'Fitness Centre Membership Chart',
      time: '8 questions',
      focus: '도표 조건 비교와 가장 적합한 옵션 선택',
      passage:
        'A chart compares Basic, Plus, and Premium memberships. Basic includes gym access only. Plus adds evening classes. Premium includes classes, pool access, and two guest passes per month.',
      questions: [
        'Which plan includes only gym access?',
        'Which plan adds evening classes?',
        'Who should choose Premium?',
      ],
    },
    {
      id: 'rd-03',
      type: 'Information',
      title: 'Winter Driving Notice',
      time: '9 questions',
      focus: '정보문에서 규칙, 예외, 권장 사항 구분',
      passage:
        'Drivers are advised to install winter tires before November 15. Mountain routes may require tire chains during storms. Emergency kits should include water, a flashlight, a blanket, and a phone charger.',
      questions: [
        'When should drivers install winter tires?',
        'Where may tire chains be required?',
        'Name two recommended emergency kit items.',
      ],
    },
    {
      id: 'rd-04',
      type: 'Viewpoints',
      title: 'Should Offices Be Dog-Friendly?',
      time: '10 questions',
      focus: '의견 글에서 주장, 반론, 근거 연결',
      passage:
        'Some employees believe dogs reduce stress and create a friendlier workplace. Others argue that allergies, noise, and cleanliness problems make dog-friendly offices difficult to manage.',
      questions: [
        'What benefit do supporters mention?',
        'What health concern do opponents mention?',
        'What management issue is implied?',
      ],
    },
    {
      id: 'rd-05',
      type: 'Correspondence',
      title: 'Landlord Repair Message',
      time: '11 questions',
      focus: '짧은 메시지에서 책임과 일정 파악',
      passage:
        'The landlord says the plumber will replace the kitchen faucet on Wednesday morning. The tenant should clear items under the sink. If nobody is home, building staff can provide access with written permission.',
      questions: [
        'What repair is scheduled?',
        'What should the tenant clear?',
        'What is needed if nobody is home?',
      ],
    },
    {
      id: 'rd-06',
      type: 'Information',
      title: 'Clinic Appointment Policy',
      time: '9 questions',
      focus: '정책문에서 수수료와 예외 조건 찾기',
      passage:
        'Patients must cancel appointments at least 24 hours in advance. Late cancellations may result in a $40 fee. The fee is waived for severe weather or documented emergencies.',
      questions: [
        'How early should patients cancel?',
        'What is the possible fee?',
        'When can the fee be waived?',
      ],
    },
    {
      id: 'rd-07',
      type: 'Apply a Diagram',
      title: 'Meal Kit Delivery Options',
      time: '8 questions',
      focus: '옵션별 포함 사항과 제한 비교',
      passage:
        'The weekly plan serves two people and includes three recipes. The family plan serves four people and includes four recipes. Vegetarian meals are available only on the weekly plan.',
      questions: [
        'Which plan serves four people?',
        'How many recipes are in the weekly plan?',
        'Which plan has vegetarian meals?',
      ],
    },
    {
      id: 'rd-08',
      type: 'Viewpoints',
      title: 'Public Wi-Fi in Parks',
      time: '10 questions',
      focus: '장단점과 필자의 균형 잡힌 결론 이해',
      passage:
        'Free park Wi-Fi could help students, tourists, and remote workers. However, some residents prefer parks to remain quiet spaces away from screens. A limited network near picnic areas may satisfy both sides.',
      questions: [
        'Who could benefit from Wi-Fi?',
        'Why do some residents object?',
        'What compromise is suggested?',
      ],
    },
  ],
  writing: [
    {
      id: 'wr-01',
      type: 'Email',
      title: 'Request a Graduation Letter',
      time: '27 min',
      focus: '공손한 요청, 목적 설명, 마감일 제시',
      prompt:
        'You need a graduation completion letter for your PGWP application, but it has not appeared in your student portal. Write an email to the registrar. Explain your situation, ask when the letter will be ready, and request urgent assistance.',
    },
    {
      id: 'wr-02',
      type: 'Survey',
      title: 'Campus Career Fair Format',
      time: '26 min',
      focus: '선호 선택 후 이유 두세 가지 전개',
      prompt:
        'Your college is deciding whether the next career fair should be online or in person. Choose one option and explain why it would be more useful for graduating students.',
    },
    {
      id: 'wr-03',
      type: 'Email',
      title: 'Complain About a Noisy Apartment',
      time: '27 min',
      focus: '문제 설명, 구체적 사례, 해결 요청',
      prompt:
        'Your neighbour has been making loud noise late at night for several weeks. Write an email to your building manager. Describe the problem, explain how it affects you, and suggest a solution.',
    },
    {
      id: 'wr-04',
      type: 'Survey',
      title: 'Part-Time Work Limit',
      time: '26 min',
      focus: '정책형 주제에서 장단점 균형 잡기',
      prompt:
        'A student association is asking whether international students should work more hours during school terms. State your opinion and support it with reasons and examples.',
    },
    {
      id: 'wr-05',
      type: 'Email',
      title: 'Ask an Employer to Reschedule',
      time: '27 min',
      focus: '사과, 사유, 대안 일정 제안',
      prompt:
        'You have a job interview, but your final exam was moved to the same time. Write an email to the employer. Apologize, explain the conflict, and suggest two alternative interview times.',
    },
    {
      id: 'wr-06',
      type: 'Survey',
      title: 'Public Transit Discount',
      time: '26 min',
      focus: '주장, 근거, 예상 효과 제시',
      prompt:
        'Your city is considering discounted transit passes for recent graduates looking for work. Do you support this idea? Explain your position.',
    },
    {
      id: 'wr-07',
      type: 'Email',
      title: 'Report a Missing Delivery',
      time: '27 min',
      focus: '주문 정보, 문제, 원하는 조치',
      prompt:
        'An important document delivery says it was completed, but you did not receive it. Write an email to the courier company. Provide details, explain why it is urgent, and ask for help.',
    },
    {
      id: 'wr-08',
      type: 'Survey',
      title: 'Library Opening Hours',
      time: '26 min',
      focus: '개인 경험을 근거로 설득하기',
      prompt:
        'Your local library may extend its opening hours during exam season. Do you think this is a good use of community funding? Give reasons.',
    },
  ],
  speaking: [
    {
      id: 'sp-01',
      type: 'Giving Advice',
      title: 'Friend Choosing Between Jobs',
      time: '30 sec prep / 90 sec speak',
      focus: '상황 공감 후 기준 2-3개로 조언',
      prompt:
        'Your friend has two job offers: one pays more but is far away, and the other pays less but is related to their career goal. Give your friend advice.',
    },
    {
      id: 'sp-02',
      type: 'Personal Experience',
      title: 'First Week in Canada',
      time: '30 sec prep / 60 sec speak',
      focus: '경험, 감정, 배운 점 순서로 말하기',
      prompt:
        'Talk about a memorable experience from your first week in a new city or country.',
    },
    {
      id: 'sp-03',
      type: 'Describing a Scene',
      title: 'Busy Coffee Shop',
      time: '30 sec prep / 60 sec speak',
      focus: '전체 장면, 사람, 동작, 분위기 묘사',
      prompt:
        'Describe a scene in a busy coffee shop where students are studying, staff are preparing drinks, and a line is forming near the counter.',
    },
    {
      id: 'sp-04',
      type: 'Making Predictions',
      title: 'Missed Bus Stop',
      time: '30 sec prep / 60 sec speak',
      focus: '현재 상황에서 다음에 일어날 일 예측',
      prompt:
        'A person on a bus suddenly realizes they missed their stop and has an appointment soon. What do you think will happen next?',
    },
    {
      id: 'sp-05',
      type: 'Comparing and Persuading',
      title: 'Laptop or Tablet',
      time: '60 sec prep / 60 sec speak',
      focus: '두 옵션 비교 후 하나를 설득',
      prompt:
        'Your classmate can buy either a lightweight tablet or a used laptop for school. Compare the two options and persuade your classmate to choose one.',
    },
    {
      id: 'sp-06',
      type: 'Difficult Situation',
      title: 'Group Project Conflict',
      time: '60 sec prep / 60 sec speak',
      focus: '문제 인정, 정중한 표현, 해결안',
      prompt:
        'One member of your group project has not completed their part. You need to talk to them without causing conflict. What would you say?',
    },
    {
      id: 'sp-07',
      type: 'Expressing Opinions',
      title: 'Work From Home',
      time: '30 sec prep / 90 sec speak',
      focus: '명확한 의견, 이유, 예시, 결론',
      prompt:
        'Do you think new graduates should be allowed to work from home when starting their first full-time job? Explain your opinion.',
    },
    {
      id: 'sp-08',
      type: 'Unusual Situation',
      title: 'Unexpected Item in a Rental Car',
      time: '30 sec prep / 60 sec speak',
      focus: '낯선 상황을 차분히 설명하고 대응',
      prompt:
        'You rented a car and found an expensive camera under the seat. Call the rental company and explain what happened.',
    },
  ],
}

const READING_FOCUS = {
  Correspondence: {
    en: 'Find purpose, requests, reasons, and next steps',
    ko: '목적, 요청, 이유, 다음 단계 찾기',
    zh: '找出目的、请求、原因和下一步',
    count: 11,
  },
  'Apply a Diagram': {
    en: 'Compare options, labels, limits, and conditions',
    ko: '옵션, 라벨, 제한, 조건 비교',
    zh: '比较选项、标签、限制和条件',
    count: 8,
  },
  Information: {
    en: 'Separate rules, recommendations, exceptions, and warnings',
    ko: '규칙, 권장사항, 예외, 주의사항 구분',
    zh: '区分规则、建议、例外和提醒',
    count: 9,
  },
  Viewpoints: {
    en: 'Connect opinions, counterarguments, evidence, and conclusions',
    ko: '의견, 반론, 근거, 결론 연결',
    zh: '连接观点、反方意见、证据和结论',
    count: 10,
  },
}

const READING_STRATEGY_COPY = {
  Correspondence: {
    en: 'Find the sender purpose, the requested action, and the exact deadline or condition.',
    ko: '보낸 목적, 요청 행동, 정확한 마감/조건을 함께 확인하세요.',
    zh: '找出发送目的、要求的行动，以及准确的截止时间或条件。',
  },
  'Apply a Diagram': {
    en: 'Compare each option against every condition in the question before choosing.',
    ko: '답을 고르기 전에 질문 조건을 선택지마다 하나씩 대조하세요.',
    zh: '选择前，把题目中的每个条件逐项对照选项。',
  },
  Information: {
    en: 'Watch rule words such as must, only, except, unless, and at least.',
    ko: 'must, only, except, unless, at least 같은 규칙 단어를 놓치지 마세요.',
    zh: '注意 must、only、except、unless、at least 等规则词。',
  },
  Viewpoints: {
    en: 'Connect each reason to the correct side and avoid answers that are too extreme.',
    ko: '각 근거가 어느 입장에 연결되는지 확인하고 지나치게 극단적인 답은 피하세요.',
    zh: '把每个理由连接到正确立场，并避免过于极端的答案。',
  },
}

const READING_DISTRACTORS = {
  Correspondence: [
    'The reader does not need to take any action.',
    'The message is only a general advertisement.',
    'The deadline has already been cancelled.',
  ],
  'Apply a Diagram': [
    'The most expensive option is always correct.',
    'All options include the same features.',
    'The diagram gives no useful comparison.',
  ],
  Information: [
    'The rule applies to everyone with no exceptions.',
    'The action is optional and has no time limit.',
    'The notice is only background information.',
  ],
  Viewpoints: [
    'Everyone in the text completely agrees.',
    'The writer gives no reasons for either side.',
    'The text announces a final official decision.',
  ],
}

function getReadingSentences(passage = '') {
  return passage
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function rotateReadingOptions(answer, distractors, seed) {
  const options = [answer, ...distractors].filter(Boolean).slice(0, 4)
  const offset = options.length ? seed % options.length : 0
  return [...options.slice(offset), ...options.slice(0, offset)]
}

function enrichReadingQuestion(mock, question, index) {
  const questionObject = typeof question === 'string' ? { prompt: question } : { ...(question || {}) }
  const sentences = getReadingSentences(mock.passage)
  const fallbackAnswer = sentences[index] || sentences[sentences.length - 1] || mock.title
  const answer = questionObject.answer || questionObject.correctAnswer || fallbackAnswer
  const distractors = questionObject.options?.length
    ? questionObject.options.filter((option) => {
      const text = typeof option === 'string' ? option : option.text
      return text && text !== answer
    })
    : READING_DISTRACTORS[mock.type] || READING_DISTRACTORS.Information
  const options = questionObject.options?.length
    ? questionObject.options
    : rotateReadingOptions(answer, distractors, `${mock.id}-${index}`.length + index)
  const strategyCopy = READING_STRATEGY_COPY[mock.type] || READING_STRATEGY_COPY.Information

  return {
    prompt: questionObject.prompt || questionObject.question || '',
    answer,
    difficulty: questionObject.difficulty || (index % 3 === 0 ? 'easy' : index % 3 === 1 ? 'medium' : 'hard'),
    strategy: questionObject.strategy || strategyCopy.en,
    strategyKo: questionObject.strategyKo || strategyCopy.ko,
    strategyZh: questionObject.strategyZh || strategyCopy.zh,
    options,
  }
}

function enrichReadingMock(mock) {
  const focus = READING_FOCUS[mock.type] || READING_FOCUS.Information
  return {
    ...mock,
    time: mock.time || `${focus.count} questions`,
    focus: mock.focus && !/[가-힣]/.test(mock.focus) ? mock.focus : focus.en,
    focusKo: mock.focusKo || (mock.focus && /[가-힣]/.test(mock.focus) ? mock.focus : focus.ko),
    focusZh: mock.focusZh || focus.zh,
    questions: Array.isArray(mock.questions)
      ? mock.questions.map((question, index) => enrichReadingQuestion(mock, question, index))
      : [],
  }
}

const WRITING_FOCUS = {
  Email: {
    en: 'Use clear purpose, polite tone, details, and a direct request',
    ko: '명확한 목적, 공손한 톤, 세부 정보, 직접 요청 구성',
    zh: '写清目的、礼貌语气、细节和明确请求',
  },
  Survey: {
    en: 'State a position and support it with reasons and examples',
    ko: '입장을 정하고 이유와 예시로 뒷받침',
    zh: '表明立场，并用理由和例子支持',
  },
}

const SPEAKING_FOCUS = {
  'Giving Advice': {
    en: 'Give practical advice with reasons and a clear next step',
    ko: '이유와 다음 행동이 있는 실용적 조언',
    zh: '给出有理由和下一步的实用建议',
  },
  'Personal Experience': {
    en: 'Tell a clear story with context, feeling, result, and lesson',
    ko: '배경, 감정, 결과, 배운 점이 있는 경험 말하기',
    zh: '讲述包含背景、感受、结果和收获的经历',
  },
  'Describing a Scene': {
    en: 'Describe the scene, people, actions, location, and mood',
    ko: '장면, 사람, 동작, 위치, 분위기 묘사',
    zh: '描述场景、人物、动作、位置和氛围',
  },
  'Making Predictions': {
    en: 'Predict likely next actions and explain why',
    ko: '다음 행동을 예측하고 이유 설명',
    zh: '预测接下来的行动并说明原因',
  },
  'Comparing and Persuading': {
    en: 'Compare two options and persuade with clear criteria',
    ko: '두 선택지를 비교하고 기준을 들어 설득',
    zh: '比较两个选项，并用明确标准说服',
  },
  'Difficult Situation': {
    en: 'Handle conflict politely with empathy and a solution',
    ko: '공감과 해결책으로 갈등 상황을 정중히 처리',
    zh: '用同理心和解决方案礼貌处理冲突',
  },
  'Expressing Opinions': {
    en: 'Give a clear opinion with reasons, examples, and a conclusion',
    ko: '명확한 의견, 이유, 예시, 결론 제시',
    zh: '给出明确观点、理由、例子和结论',
  },
  'Unusual Situation': {
    en: 'Explain an unexpected situation calmly and request action',
    ko: '예상 밖 상황을 차분히 설명하고 조치 요청',
    zh: '冷静说明异常情况并请求处理',
  },
}

const READING_EXTRA_TOPICS = [
  ['Correspondence', 'Email About a Scholarship Deadline', 'Dear Alex, your scholarship application is missing one reference letter. Please ask your instructor to submit it by 4 p.m. on Friday. If it arrives late, your file will be reviewed in the next round.'],
  ['Correspondence', 'Message From a Dentist Office', 'Hello Priya, your dental cleaning is booked for Tuesday at 10 a.m. Please arrive ten minutes early to update your insurance information. If you need to cancel, call at least 24 hours in advance.'],
  ['Correspondence', 'Condo Board Notice', 'The condo board reminds residents that balcony repairs begin next Monday. Furniture must be removed by Sunday evening. Residents on floors six to ten will be contacted first.'],
  ['Correspondence', 'Volunteer Shift Change', 'Thanks for volunteering at the food bank. Your Saturday sorting shift has moved from 8 a.m. to 10 a.m. because the delivery truck is delayed. Please reply if the new time works.'],
  ['Apply a Diagram', 'Community Class Schedule', 'A schedule lists beginner yoga on Monday evenings, pottery on Wednesday afternoons, and first-aid training on Saturday. Only first-aid training requires a materials fee.'],
  ['Apply a Diagram', 'Internet Plan Comparison', 'A chart compares three internet plans. Starter has the lowest price and basic speed, Family adds unlimited data, and Pro includes priority repair appointments.'],
  ['Apply a Diagram', 'Airport Shuttle Table', 'A table shows shuttle routes from the airport. Route A stops downtown, Route B serves hotels, and Route C runs only after 9 p.m.'],
  ['Apply a Diagram', 'Gym Trial Pass Options', 'A diagram compares trial passes. One-day passes include gym access only, weekly passes include classes, and monthly trials include pool access.'],
  ['Information', 'Tenant Fire Safety Guide', 'Tenants should test smoke alarms monthly, keep exits clear, and report damaged fire doors. Barbecues are not permitted on balconies in this building.'],
  ['Information', 'Pharmacy Refill Policy', 'Prescription refills should be requested three business days before medication runs out. Controlled medications require direct approval from a doctor.'],
  ['Information', 'Winter Parking Rules', 'Overnight parking is restricted during snow clearing. Vehicles left on priority routes may be ticketed or towed after midnight.'],
  ['Information', 'College Exam Room Rules', 'Students must bring photo ID, arrive 20 minutes early, and keep phones in their bags. Washroom breaks are recorded by the invigilator.'],
  ['Viewpoints', 'Should Stores Charge for Bags?', 'Some shoppers support bag fees because they reduce plastic waste. Others argue the fees are unfair for families who already face high grocery costs.'],
  ['Viewpoints', 'Remote Medical Appointments', 'Online appointments can save travel time and help rural patients. However, some people feel important symptoms are easier to explain in person.'],
  ['Viewpoints', 'Later School Start Times', 'Supporters say later starts improve sleep and concentration. Critics worry about after-school jobs, sports schedules, and parents work hours.'],
  ['Viewpoints', 'Community Gardens', 'Community gardens can provide fresh food and social connection. Some residents worry about water use, maintenance, and waiting lists.'],
]

const WRITING_EXTRA_TOPICS = [
  ['Email', 'Ask a Professor for a Reference Letter', 'You are applying for a job and need a reference letter from a professor. Write an email explaining the job, why you are applying, and what information the professor may need.'],
  ['Email', 'Request a Rent Receipt', 'Your landlord has not sent your rent receipt, but you need it for your records. Write an email requesting the receipt and explaining why it is urgent.'],
  ['Email', 'Report a Broken Bus Shelter', 'A bus shelter near your home has broken glass and no light at night. Write an email to the city describing the problem and asking for repair.'],
  ['Email', 'Thank a Workplace Supervisor', 'Your internship supervisor helped you learn important skills. Write an email thanking them and explaining how the experience helped your career plans.'],
  ['Email', 'Ask a College Office About Fees', 'You noticed an unexpected fee on your student account. Write an email asking what the fee is for and how it can be corrected if it is a mistake.'],
  ['Email', 'Request Time Off for a Family Event', 'You need one day off from your part-time job for an important family event. Write an email to your manager explaining the situation and offering a plan for your shift.'],
  ['Email', 'Complain About a Course Platform Issue', 'Your online course platform did not save your quiz answers. Write an email to technical support explaining what happened and asking for help.'],
  ['Email', 'Ask a Neighbour to Move a Vehicle', 'A neighbour has parked in your assigned spot several times. Write a polite message explaining the issue and asking them to move the vehicle.'],
  ['Survey', 'Should Colleges Offer More Evening Classes?', 'Your college is asking whether more evening classes should be offered. State your opinion and support it with reasons.'],
  ['Survey', 'Should Cities Build More Bike Lanes?', 'Your city is considering building more bike lanes instead of adding parking spaces. Which option do you support and why?'],
  ['Survey', 'Should Employers Provide Paid Training?', 'A business group asks whether employers should pay workers during required training. Give your opinion with reasons and examples.'],
  ['Survey', 'Should Libraries Remove Late Fees?', 'Your local library may remove late fees to encourage more people to borrow books. Do you support this idea?'],
  ['Survey', 'Should Students Take a Financial Literacy Course?', 'A school board is considering a required financial literacy course. Explain whether you agree or disagree.'],
  ['Survey', 'Should Public Parks Have More Cameras?', 'Your city is asking residents whether public parks need more security cameras. State your view and support it.'],
  ['Survey', 'Should Workplaces Allow Flexible Start Times?', 'A company is considering flexible start times for employees. Explain whether this would improve work life.'],
  ['Survey', 'Should New Graduates Receive Transit Support?', 'A local council wants to offer discounted transit passes to new graduates for six months. Do you think this is useful?'],
]

const SPEAKING_EXTRA_TOPICS = [
  ['Giving Advice', 'Cousin Moving to a New City', 'Your cousin is moving to a new city for school and feels nervous. Give advice about how to adjust and meet people.'],
  ['Giving Advice', 'Friend Buying a Used Car', 'Your friend wants to buy a used car for commuting. Give advice about what to check before buying it.'],
  ['Giving Advice', 'Coworker Taking Extra Shifts', 'Your coworker is taking too many shifts and feels exhausted. Give advice about balancing work and health.'],
  ['Giving Advice', 'Classmate Improving English', 'Your classmate wants to improve speaking confidence before a job interview. Give practical advice.'],
  ['Personal Experience', 'A Time You Solved a Problem', 'Talk about a time when you solved a problem at work, school, or home.'],
  ['Personal Experience', 'A Helpful Teacher or Mentor', 'Describe a teacher, supervisor, or mentor who helped you. Explain what you learned.'],
  ['Personal Experience', 'A Difficult Decision', 'Talk about a difficult decision you made and how it turned out.'],
  ['Personal Experience', 'Learning a New Skill', 'Talk about a time you learned a new skill. Explain why it was useful.'],
  ['Describing a Scene', 'Busy Train Station', 'Describe a busy train station with commuters, announcements, luggage, and people waiting near the platform.'],
  ['Describing a Scene', 'Community Picnic', 'Describe a community picnic in a park with families, food tables, games, and volunteers.'],
  ['Describing a Scene', 'College Library', 'Describe a college library where students are using computers, studying quietly, and asking staff for help.'],
  ['Describing a Scene', 'Winter Street', 'Describe a winter street after heavy snow with cars, pedestrians, snowbanks, and city workers.'],
  ['Making Predictions', 'Person Late for an Interview', 'A person is stuck in traffic and has a job interview in 20 minutes. What do you think will happen next?'],
  ['Making Predictions', 'Child Drops a Lunch Bag', 'A child drops a lunch bag near a school entrance while other students are arriving. What will probably happen next?'],
  ['Making Predictions', 'Shop Runs Out of an Item', 'A customer comes to buy a sale item, but the store shelf is empty. What do you think the customer and staff will do?'],
  ['Making Predictions', 'Power Goes Out During Class', 'The power goes out during an online class presentation. Predict what will happen next.'],
  ['Comparing and Persuading', 'Bus Pass or Bicycle', 'Your friend can buy a monthly bus pass or a bicycle for commuting. Compare the options and persuade your friend to choose one.'],
  ['Comparing and Persuading', 'Shared Apartment or Studio', 'A classmate is choosing between a shared apartment and a small studio. Compare both and recommend one.'],
  ['Comparing and Persuading', 'Online Course or In-person Course', 'Your coworker wants to take a course. Compare online and in-person options and persuade them to choose one.'],
  ['Comparing and Persuading', 'Part-time Job or Volunteer Role', 'A student can take a paid part-time job or a volunteer role related to their career. Compare and persuade.'],
  ['Difficult Situation', 'Roommate Not Cleaning', 'Your roommate often leaves the kitchen dirty. Talk to them politely and suggest a solution.'],
  ['Difficult Situation', 'Coworker Missing a Deadline', 'A coworker did not finish their part of a project. Speak to them and try to solve the problem.'],
  ['Difficult Situation', 'Friend Borrowed Money', 'A friend borrowed money and has not paid it back. Explain the situation politely and ask for a plan.'],
  ['Difficult Situation', 'Noisy Library Group', 'A group in the library is speaking loudly while you are studying. Speak to them politely.'],
  ['Expressing Opinions', 'Should Students Work During School?', 'Do you think students should work part-time while studying? Explain your opinion.'],
  ['Expressing Opinions', 'Is Public Transit Better Than Driving?', 'Do you think public transit is better than driving in large cities? Give reasons.'],
  ['Expressing Opinions', 'Should People Learn Cooking?', 'Do you think everyone should learn basic cooking skills? Explain your opinion.'],
  ['Expressing Opinions', 'Are Online Meetings Effective?', 'Do you think online meetings are as effective as in-person meetings? Give reasons.'],
  ['Unusual Situation', 'Wrong Package Delivered', 'You received an expensive package addressed to someone else. Call the delivery company and explain.'],
  ['Unusual Situation', 'Elevator Stops Between Floors', 'You are in an elevator that stops between floors. Call building security and explain the situation.'],
  ['Unusual Situation', 'Found a Wallet at a Bus Stop', 'You found a wallet at a bus stop. Call the transit office and explain what you found.'],
  ['Unusual Situation', 'Hotel Room Already Occupied', 'You open your assigned hotel room and see someone else belongings inside. Call the front desk and explain.'],
]

function createReadingMock([type, title, passage], index) {
  const focus = READING_FOCUS[type]
  return {
    id: `rd-extra-${String(index + 1).padStart(2, '0')}`,
    type,
    title,
    time: `${focus.count} questions`,
    focus: focus.en,
    focusKo: focus.ko,
    focusZh: focus.zh,
    passage,
    questions: [
      'What is the main purpose of this text?',
      'Which detail directly answers the question?',
      'What should the reader do or understand next?',
    ],
  }
}

function createWritingMock([type, title, prompt], index) {
  const focus = WRITING_FOCUS[type]
  return {
    id: `wr-extra-${String(index + 1).padStart(2, '0')}`,
    type,
    title,
    time: type === 'Email' ? '27 min' : '26 min',
    focus: focus.en,
    focusKo: focus.ko,
    focusZh: focus.zh,
    prompt,
  }
}

function getSpeakingTime(type) {
  return type === 'Comparing and Persuading' || type === 'Difficult Situation'
    ? '60 sec prep / 60 sec speak'
    : type === 'Giving Advice' || type === 'Expressing Opinions'
      ? '30 sec prep / 90 sec speak'
      : '30 sec prep / 60 sec speak'
}

function createSpeakingMock([type, title, prompt], index) {
  const focus = SPEAKING_FOCUS[type]
  return {
    id: `sp-extra-${String(index + 1).padStart(2, '0')}`,
    type,
    title,
    time: getSpeakingTime(type),
    focus: focus.en,
    focusKo: focus.ko,
    focusZh: focus.zh,
    prompt,
  }
}

function enrichSpeakingMock(mock) {
  const focus = SPEAKING_FOCUS[mock.type] || SPEAKING_FOCUS['Expressing Opinions']
  return {
    ...mock,
    time: mock.time || getSpeakingTime(mock.type),
    focus: mock.focus && !/[가-힣]/.test(mock.focus) ? mock.focus : focus.en,
    focusKo: mock.focusKo || focus.ko,
    focusZh: mock.focusZh || focus.zh,
  }
}

CELPIP_MOCK_TESTS.reading = [
  ...GENERATED_READING,
].map(enrichReadingMock)
CELPIP_MOCK_TESTS.writing.push(...WRITING_EXTRA_TOPICS.map(createWritingMock))
CELPIP_MOCK_TESTS.speaking = GENERATED_SPEAKING.map(enrichSpeakingMock)
