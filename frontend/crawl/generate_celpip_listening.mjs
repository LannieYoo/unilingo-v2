import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { extraSeeds } from './celpip_extra_seeds.mjs'
import { extraSeeds2 } from './celpip_extra_seeds_2.mjs'
import { generateMassiveSeeds } from './generate_massive_celpip_seeds.mjs'

// Generates additional CELPIP-style Listening mock sets (original "Similar Practice"
// content modelled on the real exam format — NOT copied from celpip.ca, whose test
// material is copyrighted). Mirrors the crawl/generate_similar_*.mjs pattern.
//
// Run: node crawl/generate_celpip_listening.mjs
// Output: src/modules/celpip/_01_data/celpip_listening_generated.json

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outputPath = path.resolve(__dirname, '../src/modules/celpip/_01_data/celpip_listening_generated.json')

// q tuple: [prompt, answer, [distractor, distractor, distractor], difficulty]
function buildQuestion([prompt, answer, distractors, difficulty = 'medium']) {
  const options = [answer, ...distractors]
  const offset = prompt.length % options.length
  return {
    prompt,
    answer,
    difficulty,
    options: [...options.slice(offset), ...options.slice(0, offset)],
  }
}

const SEEDS = [
  // ---------- Problem Solving (8 questions) ----------
  {
    type: 'Problem Solving',
    title: 'Wrong Gym Charge',
    transcript:
      'Hi, I noticed my gym membership was charged twice this month, and I only have one account. — I am sorry about that. Let me pull up your account. Can you give me the email you signed up with? — Sure, it is jordan dot lee at email dot com. — Thank you. I can see two charges of forty dollars on the same day. It looks like the payment was submitted twice when the system was slow. — That makes sense, the page did freeze when I paid. — I can refund one of the charges right away. The refund usually takes three to five business days to appear. — Okay, that works. — I will also add a note to your account so it does not happen again. — Is there anything I need to do? — No, just keep an eye on your statement. If the refund has not arrived in a week, call us back and ask for the billing team directly. — Got it, thanks.',
    q: [
      ['Why is the member calling the gym?', 'He was charged twice for one membership.', ['He wants to cancel his membership.', 'He forgot his gym password.', 'He wants to upgrade his plan.'], 'easy'],
      ['What does the staff member ask for?', 'The email he signed up with.', ['His home address.', 'His bank card number.', 'His membership card.']],
      ['What caused the double charge?', 'The payment was submitted twice when the system was slow.', ['He signed up for two accounts.', 'The price went up this month.', 'He paid at two locations.']],
      ['What does the staff member offer?', 'A refund of one of the charges.', ['A free month of membership.', 'A discount on next year.', 'A new membership card.']],
      ['How long does the refund take?', 'Three to five business days.', ['Up to one hour.', 'About a month.', 'Immediately.']],
      ['What will the staff member add to the account?', 'A note so it does not happen again.', ['A new payment method.', 'A monthly discount.', 'A second email.']],
      ['What does the member need to do now?', 'Watch his statement for the refund.', ['Visit the gym in person.', 'Cancel his card.', 'Pay the second charge.']],
      ['What should he do if the refund does not arrive in a week?', 'Call back and ask for the billing team directly.', ['Wait another month.', 'Dispute it with his bank only.', 'Sign up again.'], 'hard'],
    ],
  },
  {
    type: 'Problem Solving',
    title: 'Broken Washing Machine',
    transcript:
      'Hello, the shared washing machine on my floor stopped mid-cycle, and now my clothes are locked inside. — Sorry about that. Which floor and machine number? — Fourth floor, machine two. — Thank you. That machine reported an error this morning, so maintenance already knows about it. — But my clothes are stuck inside right now. — I understand. I can send the building technician up with a master key to open it within the next thirty minutes. — That would be great. — In the meantime, please do not try to force the door, because that can damage the lock. — Okay. Will I get my money back for the wash? — Yes, bring your receipt to the office and we will refund the four dollars. — And can I use another machine? — Yes, the machines on the third floor are all working.',
    q: [
      ['What is the problem?', 'The washing machine stopped and her clothes are locked inside.', ['She lost her laundry card.', 'The machine flooded her apartment.', 'She cannot find a free machine.'], 'easy'],
      ['What does the staff member ask first?', 'The floor and machine number.', ['Her apartment number.', 'Her phone number.', 'What she washed.']],
      ['What does the staff member already know?', 'That machine reported an error this morning.', ['The machine was unplugged.', 'The water was shut off.', 'The floor was being cleaned.']],
      ['What solution is offered?', 'A technician will open it with a master key within thirty minutes.', ['She must wait until tomorrow.', 'She should call a locksmith.', 'The door will open on its own.']],
      ['What is she told not to do?', 'Force the door open.', ['Use the third-floor machines.', 'Bring her receipt.', 'Call the office again.']],
      ['How can she get her money back?', 'Bring her receipt to the office for a refund.', ['Wait for an automatic refund.', 'Email a photo of the machine.', 'Ask the technician for cash.']],
      ['How much will she be refunded?', 'Four dollars.', ['Ten dollars.', 'A full month of rent.', 'Nothing.']],
      ['What can she do while she waits?', 'Use the working machines on the third floor.', ['Use machine two again.', 'Wash clothes by hand.', 'Move to another building.'], 'hard'],
    ],
  },
  {
    type: 'Problem Solving',
    title: 'Flight Booking Error',
    transcript:
      'Hi, I booked a flight online, but the confirmation shows the wrong date, a day earlier than I selected. — I can help. May I have your booking reference? — Yes, it is K T nine zero. — Thank you. I see the booking is for the fourteenth, but you wanted the fifteenth, is that right? — Exactly. — It looks like the date defaulted back when the payment page reloaded. — So can it be fixed? — Yes. Since it is within twenty-four hours of booking, I can change the date with no fee. — That is a relief. — I have moved it to the fifteenth. You will get a new confirmation by email shortly. — Should I do anything else? — Just check that the passenger name matches your passport exactly, and if not, contact us before check-in.',
    q: [
      ['What is wrong with the booking?', 'The confirmation shows the wrong date.', ['The flight was cancelled.', 'The price is too high.', 'The seat is missing.'], 'easy'],
      ['What does the agent ask for?', 'The booking reference.', ['The passport number.', 'The credit card.', 'The home address.']],
      ['What date did the customer actually want?', 'The fifteenth.', ['The fourteenth.', 'The thirteenth.', 'The sixteenth.']],
      ['What caused the error?', 'The date defaulted back when the payment page reloaded.', ['The customer typed it wrong.', 'The flight was rescheduled.', 'The agent made a mistake.']],
      ['Why can the date be changed with no fee?', 'It is within twenty-four hours of booking.', ['The customer has a member card.', 'The flight is domestic.', 'It is a holiday promotion.']],
      ['How will the customer get the updated booking?', 'By email shortly.', ['By text in a week.', 'At the airport counter.', 'By mail.']],
      ['What should the customer check?', 'That the passenger name matches the passport exactly.', ['That the meal is included.', 'That the seat is by the window.', 'That the gate is open.']],
      ['What should the customer do if the name does not match?', 'Contact the airline before check-in.', ['Fix it at the gate.', 'Book a new flight.', 'Ignore it.'], 'hard'],
    ],
  },
  // ---------- Daily Life Conversation (5 questions) ----------
  {
    type: 'Daily Life Conversation',
    title: 'Choosing a Study Group Time',
    transcript:
      'We need to pick a regular time for our study group. — I can do weekday evenings, but not Mondays. — Mondays are bad for me too. How about Wednesday at six? — Wednesday works, but the library closes at eight, so we would only get two hours. — That is enough if we start on time. — Should we meet somewhere else for longer sessions before exams? — Good idea. We can book a study room at the community centre for those. — I will reserve Wednesdays at the library for now. — Great. I will message everyone the plan.',
    q: [
      ['What are the speakers deciding?', 'A regular time for their study group.', ['Which course to take.', 'Where to eat dinner.', 'How to split a project.'], 'easy'],
      ['Which day do they avoid?', 'Monday.', ['Wednesday.', 'Friday.', 'Sunday.']],
      ['Why will the library sessions be limited to two hours?', 'The library closes at eight.', ['They start late.', 'The room is small.', 'It is too expensive.']],
      ['What will they do for longer sessions before exams?', 'Book a study room at the community centre.', ['Meet at a cafe.', 'Study online only.', 'Cancel the group.']],
      ['What will one speaker do next?', 'Message everyone the plan.', ['Reserve a hotel.', 'Buy textbooks.', 'Email the professor.'], 'hard'],
    ],
  },
  {
    type: 'Daily Life Conversation',
    title: 'Planning a Potluck',
    transcript:
      'Are we still having the potluck on Saturday? — Yes, my place at noon. What should everyone bring? — I will make a big salad. — I can bring drinks and some bread. — Could you also bring extra chairs? I only have four. — Sure, I have a few folding ones. — One of our friends cannot eat nuts, so let us label the dishes. — Good thinking. I will put out little cards. — Perfect. See you Saturday.',
    q: [
      ['What are they planning?', 'A potluck.', ['A birthday party.', 'A camping trip.', 'A study session.'], 'easy'],
      ['What will the first speaker make?', 'A big salad.', ['Drinks and bread.', 'A dessert.', 'Soup.']],
      ['What extra item is requested?', 'Extra chairs.', ['Extra plates.', 'A table.', 'Music speakers.']],
      ['Why will they label the dishes?', 'A friend cannot eat nuts.', ['To show who cooked what.', 'To sell the food.', 'To keep dishes warm.']],
      ['How will they label the dishes?', 'With little cards.', ['With stickers.', 'By writing on the plates.', 'They will not label them.'], 'hard'],
    ],
  },
  {
    type: 'Daily Life Conversation',
    title: 'Returning a Jacket',
    transcript:
      'I need to return this jacket; it is too small. — Do you have the receipt? — Yes, here it is. I bought it last week. — That is fine, our return window is thirty days. Would you like a refund or an exchange? — Can I exchange it for a larger size? — Let me check. We have it in medium, but only in black, not blue. — Black is okay. — Great. The price is the same, so there is no extra charge. — Thank you. — Just keep this exchange receipt in case there is any issue.',
    q: [
      ['Why is the customer returning the jacket?', 'It is too small.', ['It is the wrong colour.', 'It is damaged.', 'She does not like it.'], 'easy'],
      ['What does the clerk ask for?', 'The receipt.', ['Her credit card.', 'Her phone number.', 'A reason in writing.']],
      ['What does the customer choose?', 'An exchange for a larger size.', ['A full refund.', 'Store credit.', 'To keep the jacket.']],
      ['What is different about the available jacket?', 'It is black, not blue.', ['It is a different brand.', 'It costs more.', 'It is used.']],
      ['What should the customer keep?', 'The exchange receipt.', ['The original tag.', 'The old jacket.', 'A photo of the jacket.'], 'hard'],
    ],
  },
  // ---------- Information (6 questions) ----------
  {
    type: 'Information',
    title: 'New Student ID Cards',
    transcript:
      'This is an announcement about new student ID cards. Starting next week, all students must replace their old cards with the new tap-enabled version. To get one, bring your current card and a piece of photo identification to the student services desk. The new cards are free for the first replacement, but a lost card after that costs ten dollars. The old cards will stop working at the library and gym on the first of next month, so do not wait until the last day. Cards are printed on the spot, and the desk is open from nine to four on weekdays.',
    q: [
      ['What is the announcement about?', 'Replacing student ID cards with a new version.', ['A new library system.', 'A change to class times.', 'A campus tour.'], 'easy'],
      ['What must students bring?', 'Their current card and photo identification.', ['A passport photo only.', 'A class schedule.', 'Ten dollars in cash.']],
      ['How much does the first replacement cost?', 'It is free.', ['Ten dollars.', 'Five dollars.', 'Twenty dollars.']],
      ['When will the old cards stop working?', 'On the first of next month.', ['Next week.', 'At the end of the year.', 'Immediately.']],
      ['Where do students get the new card?', 'At the student services desk.', ['At the library.', 'Online.', 'By mail.']],
      ['Why should students not wait until the last day?', 'The old cards will stop working at the library and gym.', ['The desk will close permanently.', 'The cards will cost more.', 'The photo machine breaks often.'], 'hard'],
    ],
  },
  {
    type: 'Information',
    title: 'Park Cleanup Volunteer Day',
    transcript:
      'Thank you for your interest in our park cleanup day. The event takes place this Saturday from nine in the morning until noon. Volunteers should meet at the main park entrance, where we will hand out gloves and garbage bags. Please wear closed shoes and bring a water bottle. We will provide a light snack at the end. Children are welcome, but they must be supervised by an adult at all times. If it rains heavily, the event will move to the following Saturday, and we will post an update on the city website by eight that morning.',
    q: [
      ['What is the event?', 'A park cleanup day.', ['A tree-planting festival.', 'A sports day.', 'A picnic.'], 'easy'],
      ['Where should volunteers meet?', 'At the main park entrance.', ['At city hall.', 'At the parking lot.', 'At the playground.']],
      ['What will be handed out?', 'Gloves and garbage bags.', ['T-shirts and hats.', 'Maps and badges.', 'Snacks and water.']],
      ['What should volunteers bring or wear?', 'A water bottle and closed shoes.', ['Their own garbage bags.', 'A folding chair.', 'Gardening tools.']],
      ['What is the rule for children?', 'They must be supervised by an adult.', ['They are not allowed.', 'They get free gifts.', 'They must register early.']],
      ['What happens if it rains heavily?', 'The event moves to the following Saturday.', ['The event is cancelled.', 'It moves indoors.', 'It starts later the same day.'], 'hard'],
    ],
  },
  {
    type: 'Information',
    title: 'Workplace Parking Changes',
    transcript:
      'Please note some changes to staff parking starting Monday. The east lot will be closed for resurfacing for two weeks. During that time, staff with east-lot passes can use the overflow lot behind building C. Visitor parking is not affected. Because the overflow lot is smaller, we ask that staff who can take transit or carpool do so during this period. Parking passes do not need to be changed; your current pass will work in the overflow lot. If the work finishes early, we will email everyone to confirm the east lot has reopened.',
    q: [
      ['What is the announcement about?', 'Changes to staff parking.', ['A new office building.', 'A holiday schedule.', 'A transit fare increase.'], 'easy'],
      ['Why is the east lot closing?', 'For resurfacing.', ['For a private event.', 'To build a new building.', 'Due to flooding.']],
      ['Where can east-lot staff park instead?', 'The overflow lot behind building C.', ['The visitor parking.', 'On the street.', 'At another office.']],
      ['Who is not affected?', 'Visitors.', ['East-lot staff.', 'Carpoolers.', 'Delivery drivers.']],
      ['What are staff asked to do during this period?', 'Take transit or carpool if they can.', ['Pay a higher parking fee.', 'Arrive an hour earlier.', 'Change their parking pass.']],
      ['What happens if the work finishes early?', 'Everyone will be emailed that the east lot has reopened.', ['Nothing will change.', 'Passes will be reissued.', 'The overflow lot will close immediately.'], 'hard'],
    ],
  },
  // ---------- News Item (5 questions) ----------
  {
    type: 'News Item',
    title: 'City Adds Weekend Bus Route',
    transcript:
      'In transit news, the city has announced a new weekend bus route connecting the downtown core to the riverside park. The route will run every thirty minutes on Saturdays and Sundays, starting next month. Officials say the route is meant to give families easier access to the park without driving. The service will be free for the first two months to encourage people to try it. After that, regular fares will apply. The city says it will review ridership numbers in the fall to decide whether to continue the route through the winter.',
    q: [
      ['What is the news about?', 'A new weekend bus route.', ['A new park opening.', 'A bus fare increase.', 'A road closure.'], 'easy'],
      ['How often will the route run?', 'Every thirty minutes on weekends.', ['Every hour on weekdays.', 'Once a day.', 'Only on Sundays.']],
      ['What is the purpose of the route?', 'To give families easier access to the park.', ['To replace an old route.', 'To reduce downtown noise.', 'To serve the airport.']],
      ['What is special about the first two months?', 'The service will be free.', ['It runs all night.', 'It is for seniors only.', 'It includes a tour guide.']],
      ['What will the city do in the fall?', 'Review ridership to decide about winter service.', ['Cancel the route.', 'Add a second route.', 'Raise downtown fares.'], 'hard'],
    ],
  },
  {
    type: 'News Item',
    title: 'Local Bridge Repair',
    transcript:
      'A news update on the Maple Street bridge: the city will begin repairs next week to fix cracks found during a recent inspection. One lane will stay open in each direction, but drivers should expect delays during rush hour. Pedestrians and cyclists can still use the bridge on the north sidewalk. The work is expected to take about six weeks. Officials stress that the bridge is safe to use during the repairs, and they encourage drivers to use the Oak Avenue bridge as an alternative when possible.',
    q: [
      ['What is the news about?', 'Repairs to the Maple Street bridge.', ['A new bridge being built.', 'A bridge closing permanently.', 'A flood warning.'], 'easy'],
      ['Why are the repairs needed?', 'Cracks were found during an inspection.', ['A truck hit the bridge.', 'The bridge is too narrow.', 'A storm damaged it.']],
      ['What can drivers expect?', 'Delays during rush hour, with one lane open each way.', ['A full closure.', 'No changes at all.', 'A new toll.']],
      ['How can pedestrians and cyclists cross?', 'On the north sidewalk.', ['They cannot cross.', 'By taking a shuttle.', 'On the south lane.']],
      ['What alternative do officials suggest?', 'Using the Oak Avenue bridge.', ['Taking the train.', 'Avoiding travel entirely.', 'Driving at night only.'], 'hard'],
    ],
  },
  {
    type: 'News Item',
    title: 'Community Garden Expansion',
    transcript:
      'Local news: the community garden on Elm Street is expanding this spring. Thanks to a grant from the city, twenty new garden plots will be added, along with a small tool-sharing shed. The garden coordinator says the waiting list has been long, so the new plots will help more residents grow their own vegetables. Plots will be assigned by lottery to keep it fair, and applications open next Monday. Priority will be given to households that do not have a yard of their own.',
    q: [
      ['What is the news about?', 'A community garden expanding.', ['A new park.', 'A farmers market.', 'A grocery store opening.'], 'easy'],
      ['What is being added?', 'Twenty new plots and a tool-sharing shed.', ['A parking lot.', 'A greenhouse and a cafe.', 'A playground.']],
      ['Why is the expansion needed?', 'The waiting list has been long.', ['The old plots were closing.', 'The soil was poor.', 'Few people were using it.']],
      ['How will the new plots be assigned?', 'By lottery, to keep it fair.', ['First come, first served.', 'By auction.', 'By the coordinator choice.']],
      ['Who gets priority?', 'Households without a yard of their own.', ['Long-time residents.', 'Families with children.', 'People who donate money.'], 'hard'],
    ],
  },
  // ---------- Discussion (8 questions) ----------
  {
    type: 'Discussion',
    title: 'Choosing a Team Lunch Spot',
    transcript:
      'We need to pick a place for the team lunch on Friday. — I vote for the Thai place; it is close and quick. — It is good, but it gets really busy at noon, so we might wait. — What about the cafe on Second Street? They take reservations. — True, but their menu is small, and a couple of us are vegetarian. — The cafe does have a few vegetarian options, actually. — Does it? Then that could work. — As the team lead, I suggest we book the cafe for twelve thirty to avoid the rush. — That works for me. — Same here, and the reservation solves the waiting problem. — Good. I will call and book a table for eight.',
    q: [
      ['What are the coworkers deciding?', 'Where to have the team lunch.', ['What to order for delivery.', 'When to start a project.', 'Who will pay the bill.'], 'easy'],
      ['What is the first suggestion?', 'The Thai place, because it is close and quick.', ['The cafe on Second Street.', 'A food truck.', 'Eating in the office.']],
      ['What is the problem with the Thai place?', 'It gets very busy at noon.', ['It is too expensive.', 'It is far away.', 'It is closed on Fridays.']],
      ['Why is the cafe suggested?', 'It takes reservations.', ['It is the cheapest.', 'It has live music.', 'It is open late.']],
      ['What concern is raised about the cafe?', 'Its menu is small and some staff are vegetarian.', ['It is too loud.', 'It has no parking.', 'It is always full.']],
      ['How is that concern resolved?', 'The cafe does have vegetarian options.', ['They will skip lunch.', 'They will order Thai instead.', 'Everyone will bring food.']],
      ['What does the team lead suggest?', 'Booking the cafe for twelve thirty to avoid the rush.', ['Going at noon anyway.', 'Cancelling the lunch.', 'Splitting into two groups.']],
      ['What will the team lead do next?', 'Call and book a table for eight.', ['Email the menu.', 'Ask everyone to pay first.', 'Drive everyone there.'], 'hard'],
    ],
  },
  {
    type: 'Discussion',
    title: 'Student Council Event Budget',
    transcript:
      'Let us decide how to spend the leftover event budget. — I think we should put it toward better prizes for the talent show. — Bigger prizes are nice, but more students might come if we spend it on free food. — Free food does draw a crowd. — But food disappears fast, while a good prize gets people to actually perform. — What if we split it: some for a main prize and some for snacks? — That sounds balanced. — As treasurer, I suggest sixty percent for snacks and forty percent for one strong prize. — I can agree to that. — Me too, that covers both goals. — Good. I will write up the budget and send it to the advisor for approval.',
    q: [
      ['What are the speakers deciding?', 'How to spend the leftover event budget.', ['Which event to hold.', 'When the talent show is.', 'Who will perform.'], 'easy'],
      ['What does the first speaker want?', 'Better prizes for the talent show.', ['Free food.', 'New decorations.', 'A bigger venue.']],
      ['What does the second speaker prefer?', 'Spending it on free food.', ['Bigger prizes.', 'Saving the money.', 'A photo booth.']],
      ['What is the argument for a good prize?', 'It gets people to actually perform.', ['It is cheaper than food.', 'It lasts longer physically.', 'It is required by the school.']],
      ['What compromise is suggested?', 'Splitting the money between a prize and snacks.', ['Spending it all on food.', 'Saving it for next year.', 'Giving it to charity.']],
      ['What split does the treasurer propose?', 'Sixty percent snacks, forty percent one prize.', ['Fifty-fifty.', 'All on prizes.', 'Eighty percent food.']],
      ['How do the others respond?', 'They agree to the split.', ['They reject it.', 'They want another vote.', 'They leave the meeting.']],
      ['What will the treasurer do next?', 'Write up the budget and send it to the advisor for approval.', ['Buy the prizes immediately.', 'Cancel the talent show.', 'Ask students to vote.'], 'hard'],
    ],
  },
  {
    type: 'Discussion',
    title: 'Shared House Chores Plan',
    transcript:
      'We should sort out a chores plan for the house. — The kitchen is the main problem; it gets messy fast. — Agreed. Maybe we rotate kitchen duty each week. — A rotation is fair, but people forget whose turn it is. — We could put a chart on the fridge with names and weeks. — That helps. What about the bathroom? — Let us hire a cleaner once a month for the bathroom and floors, and split the cost. — I am fine paying a small share for that. — So weekly kitchen rotation, a fridge chart, and a monthly cleaner. — Sounds good. — Let us try it for two months and see how it goes. — I will make the chart tonight.',
    q: [
      ['What are the housemates discussing?', 'A plan for household chores.', ['Paying the rent.', 'Buying furniture.', 'Hosting a party.'], 'easy'],
      ['What is the main problem area?', 'The kitchen.', ['The garden.', 'The garage.', 'The hallway.']],
      ['What is suggested for the kitchen?', 'A weekly rotation of kitchen duty.', ['Hiring a full-time cleaner.', 'Closing the kitchen.', 'Eating out only.']],
      ['What concern is raised about the rotation?', 'People forget whose turn it is.', ['It costs too much.', 'It is unfair.', 'It takes too long.']],
      ['How will they track turns?', 'A chart on the fridge with names and weeks.', ['A group text each day.', 'A paid app.', 'A whiteboard in each room.']],
      ['What is the plan for the bathroom and floors?', 'Hire a cleaner once a month and split the cost.', ['Rotate those too.', 'Leave them undone.', 'One person does them.']],
      ['How long will they try the plan?', 'Two months.', ['One week.', 'One year.', 'Permanently with no review.']],
      ['What will one housemate do tonight?', 'Make the chart.', ['Hire the cleaner.', 'Buy cleaning supplies.', 'Pay the rent.'], 'hard'],
    ],
  },
  // ---------- Viewpoints (6 questions) ----------
  {
    type: 'Viewpoints',
    title: 'Phones in Classrooms',
    transcript:
      'Listeners shared their views on banning phones in high school classrooms. Many supported the idea. They said phones are a major distraction and that students focus better and talk to each other more without them. One teacher said test scores improved after her school introduced a no-phone rule. Others disagreed. Some pointed out that phones can be useful learning tools for research and quick questions. A few parents worried about not being able to reach their children in an emergency. Several callers suggested a middle ground: phones kept in bags during lessons but allowed at lunch and between classes.',
    q: [
      ['What is the issue?', 'Banning phones in high school classrooms.', ['Giving every student a laptop.', 'Longer lunch breaks.', 'Online classes.'], 'easy'],
      ['What do supporters say?', 'Phones are a distraction and students focus better without them.', ['Phones are too expensive.', 'Phones break easily.', 'Phones are out of date.']],
      ['What did one teacher report?', 'Test scores improved after a no-phone rule.', ['Attendance dropped.', 'Students complained more.', 'Nothing changed.']],
      ['What argument do opponents give?', 'Phones can be useful learning tools.', ['Phones are cheap.', 'Bans are illegal.', 'Teachers prefer them.']],
      ['What do some parents worry about?', 'Not being able to reach their children in an emergency.', ['Phones being stolen.', 'Higher phone bills.', 'Too much homework.']],
      ['What middle ground is suggested?', 'Phones in bags during lessons, allowed at lunch and between classes.', ['Banning phones everywhere on campus.', 'Allowing phones at all times.', 'Removing all school rules.'], 'hard'],
    ],
  },
  {
    type: 'Viewpoints',
    title: 'Paying for Plastic Bags',
    transcript:
      'We asked shoppers what they think about stores charging for plastic bags. Supporters were in favour. They said even a small fee makes people remember reusable bags and cuts down on plastic waste. One shopper said her family now keeps bags in the car and rarely pays the fee. Critics were less happy. Some felt the fee unfairly affects people who forget a bag during a quick stop. Others argued that the money should clearly go to environmental programs, not just to the store. Opinions were divided, but most agreed the fee does change shopping habits over time.',
    q: [
      ['What is the topic?', 'Stores charging for plastic bags.', ['Banning all shopping bags.', 'A new grocery tax.', 'Free home delivery.'], 'easy'],
      ['Why do supporters like the fee?', 'It reminds people to bring reusable bags and cuts plastic waste.', ['It lowers grocery prices.', 'It speeds up checkout.', 'It helps stores hire staff.']],
      ['What did one shopper say?', 'Her family keeps bags in the car and rarely pays.', ['She stopped shopping there.', 'She always pays the fee.', 'She uses paper bags.']],
      ['What concern do critics raise?', 'It unfairly affects people who forget a bag on a quick stop.', ['Bags are unsafe.', 'The fee is too high to afford.', 'Reusable bags are dirty.']],
      ['What do others argue about the money?', 'It should go to environmental programs, not just the store.', ['It should be refunded.', 'It should fund parking.', 'It should be removed.']],
      ['What do most callers agree on?', 'The fee changes shopping habits over time.', ['The fee should be banned.', 'Nobody changes their habits.', 'Bags should be free.'], 'hard'],
    ],
  },
  {
    type: 'Viewpoints',
    title: 'Open-plan Offices',
    transcript:
      'Today we discussed open-plan offices, where staff share one large space instead of separate rooms. Supporters said open layouts make it easier to ask questions, share ideas, and work as a team. One manager felt his staff collaborated more after the walls came down. But others were critical. Several workers said the noise makes it hard to concentrate on focused tasks. A few mentioned that it is difficult to take private calls. One caller suggested a balanced design: an open area for teamwork plus a few quiet rooms for calls and deep work. The group did not fully agree.',
    q: [
      ['What is being discussed?', 'Open-plan offices.', ['Working from home.', 'Office dress codes.', 'Shorter work weeks.'], 'easy'],
      ['What do supporters say?', 'Open layouts make it easier to share ideas and work as a team.', ['They are cheaper to heat.', 'They look more modern.', 'They have more desks.']],
      ['What did one manager feel?', 'His staff collaborated more after the walls came down.', ['His staff were less productive.', 'His staff wanted to leave.', 'Nothing changed.']],
      ['What is the main criticism?', 'Noise makes it hard to concentrate.', ['Desks are too small.', 'The rooms are too cold.', 'There is no parking.']],
      ['What other problem is mentioned?', 'It is hard to take private calls.', ['There is no internet.', 'The lighting is poor.', 'It is hard to find a desk.']],
      ['What balanced design is suggested?', 'An open area plus a few quiet rooms.', ['All private offices.', 'No offices at all.', 'More meeting rooms only.'], 'hard'],
    ],
  },

  // ===== Batch 2 =====
  // ---------- Problem Solving (8) ----------
  {
    type: 'Problem Solving',
    title: 'Home Internet Outage',
    transcript:
      'Hi, my home internet has been down since this morning, and I work from home, so I really need it back. — I am sorry about that. Can I get the phone number on your account? — Sure, it is five five five, two one zero zero. — Thank you. I can see there is a known outage in your area caused by damaged equipment. — Do you know when it will be fixed? — Our crews are on site now, and service should return by about two this afternoon. — That is a long time. Is there anything I can do in the meantime? — Yes, you can use your phone as a personal hotspot for urgent work. — Good idea. Will I be charged for the downtime? — We will automatically credit one day of service to your next bill, so you do not need to call back for that. — Okay. Anything else? — Just restart your modem once service returns; if it is still down after three, call us and mention this reference number.',
    q: [
      ['Why is the customer calling?', 'His home internet has been down since morning.', ['He wants a faster plan.', 'His bill is too high.', 'He is moving to a new home.'], 'easy'],
      ['What does the agent ask for?', 'The phone number on the account.', ['His modem serial number.', 'His email password.', 'His credit card.']],
      ['What is causing the outage?', 'Damaged equipment in his area.', ['An unpaid bill.', 'A storm warning.', 'His old modem.']],
      ['When should service return?', 'By about two in the afternoon.', ['Within the hour.', 'The next day.', 'By the weekend.']],
      ['What can he do in the meantime?', 'Use his phone as a personal hotspot.', ['Visit a repair shop.', 'Reset his account online.', 'Wait at the library for service.']],
      ['Will he be charged for the downtime?', 'No, one day will be credited automatically.', ['Yes, a small fee applies.', 'Only if he calls back.', 'He must request a refund form.']],
      ['What should he do when service returns?', 'Restart his modem.', ['Reinstall the software.', 'Call to confirm.', 'Change his password.']],
      ['What should he do if it is still down after three?', 'Call back and mention the reference number.', ['Wait until the next day.', 'Buy a new modem.', 'Cancel the service.'], 'hard'],
    ],
  },
  {
    type: 'Problem Solving',
    title: 'Course Registration Glitch',
    transcript:
      'Hi, I am trying to register for a required course, but the system says it is full, even though my advisor told me a spot was reserved for my program. — Let me check. Can you give me your student number? — Yes, it is two zero zero four. — Thank you. I see the reserved seats for your program were not released yet; that happens at noon today. — Oh, so it is not actually full? — Correct. The general seats are full, but your program seats open at noon. — Should I keep refreshing the page? — You can, but a safer option is to email me your course code and I will hold a seat manually. — That would be great. — Please send it within the next hour so I can process it before noon. — Will I get a confirmation? — Yes, you will see the course in your schedule, and I will reply to confirm.',
    q: [
      ['What problem is the student having?', 'A required course shows as full when registering.', ['She forgot her password.', 'She owes tuition.', 'The course was cancelled.'], 'easy'],
      ['What does the staff member ask for?', 'Her student number.', ['Her advisor name.', 'Her home address.', 'Her course grades.']],
      ['Why does the course appear full?', 'The reserved program seats have not been released yet.', ['The course is over capacity.', 'She is not in the program.', 'The system is broken.']],
      ['When do the program seats open?', 'At noon today.', ['Tomorrow morning.', 'Next week.', 'In one hour.']],
      ['What safer option does the staff member offer?', 'Email the course code so a seat is held manually.', ['Refresh the page repeatedly.', 'Switch to another course.', 'Visit the office in person.']],
      ['When should she send the email?', 'Within the next hour, before noon.', ['Any time this week.', 'After noon.', 'The next day.']],
      ['How will she know she is registered?', 'The course will appear in her schedule with a reply to confirm.', ['She will get a phone call.', 'A letter will be mailed.', 'Nothing will confirm it.']],
      ['What is the real status of the course?', 'It is not truly full; her program seats are pending.', ['It is permanently closed.', 'It was moved online.', 'It requires a waitlist fee.'], 'hard'],
    ],
  },
  {
    type: 'Problem Solving',
    title: 'Damaged Furniture Delivery',
    transcript:
      'Hello, the bookshelf I ordered arrived today, but one side panel is cracked. — I am sorry to hear that. Do you have your order number? — Yes, it is F N eight eight. — Thank you. Was the box damaged on the outside, or just the panel inside? — The box looked fine, so it may have been packed that way. — Understood. I can send a replacement panel, or a whole new bookshelf if you prefer. — Just the panel is fine; the rest is okay. — Good, that is faster. The panel will ship in two business days. — Do I need to send the broken one back? — No, please recycle it; there is no need to return it. — Should I keep the packaging? — Yes, keep the assembly hardware in case you need it for the new panel.',
    q: [
      ['What is the problem with the order?', 'One side panel of the bookshelf is cracked.', ['The wrong item was delivered.', 'The order never arrived.', 'It was the wrong colour.'], 'easy'],
      ['What does the agent ask for?', 'The order number.', ['A photo of the room.', 'The delivery driver name.', 'Her credit card.']],
      ['What does the customer say about the box?', 'It looked fine, so it may have been packed damaged.', ['It was soaked.', 'It was crushed.', 'It was open.']],
      ['What two options does the agent offer?', 'A replacement panel or a whole new bookshelf.', ['A refund or store credit.', 'A repair visit or a discount.', 'A coupon or an exchange.']],
      ['Which option does the customer choose?', 'Just the replacement panel.', ['A whole new bookshelf.', 'A full refund.', 'A repair technician.']],
      ['When will the panel ship?', 'In two business days.', ['The same day.', 'In one month.', 'After she returns the old one.']],
      ['Does she need to return the broken panel?', 'No, she should recycle it.', ['Yes, by mail.', 'Yes, to a store.', 'Only if asked later.']],
      ['What should she keep?', 'The assembly hardware.', ['The shipping box.', 'The broken panel.', 'The receipt only.'], 'hard'],
    ],
  },
  {
    type: 'Problem Solving',
    title: 'Locked Out of Online Banking',
    transcript:
      'Hi, I am locked out of my online banking after entering my password wrong a few times. — No problem, I can help you unlock it. For security, can you confirm your full name and date of birth? — Yes, it is Sam Carter, March third, nineteen ninety. — Thank you, that matches. Your account was locked automatically after five failed attempts. — I think I forgot my new password. — In that case, I will send a secure reset link to the email on file. — How long is the link valid? — It expires in thirty minutes, so please use it soon. — Okay. Is there anything else I should know? — Yes, never share that link or your code with anyone, even someone claiming to be from the bank. — Understood. — Once you reset it, you can log in right away.',
    q: [
      ['Why is the customer locked out?', 'He entered his password wrong several times.', ['His card expired.', 'He closed his account.', 'The bank is offline.'], 'easy'],
      ['What does the agent ask to confirm?', 'His full name and date of birth.', ['His full card number.', 'His mother address.', 'His account balance.']],
      ['Why was the account locked?', 'There were five failed login attempts.', ['A suspicious transfer.', 'An unpaid fee.', 'A system update.']],
      ['What does the agent send?', 'A secure reset link to the email on file.', ['A new debit card.', 'A temporary password by text.', 'A paper form.']],
      ['How long is the link valid?', 'Thirty minutes.', ['One hour.', 'One day.', 'One week.']],
      ['What does the agent warn about?', 'Never share the link or code with anyone.', ['Never log in on a phone.', 'Always change his name.', 'Never use email.']],
      ['When can he log in again?', 'Right after he resets the password.', ['After twenty-four hours.', 'After visiting a branch.', 'Only the next day.']],
      ['What is the cause of the lockout overall?', 'He forgot his new password and failed too many times.', ['Fraud on his account.', 'A bank error.', 'An expired card.'], 'hard'],
    ],
  },
  {
    type: 'Problem Solving',
    title: 'Hotel Room Mix-up',
    transcript:
      'Hi, I am checking in, but you have me in a single room; I booked a double for my family. — Let me look into that. May I see your reservation number? — Sure, it is H R four five. — Thank you. I see the booking, and you are right, it should be a double. It looks like the room type changed when the dates were updated. — We did change our dates last week. — That explains it. The good news is we have a double available on the fourth floor. — Is there any extra charge? — No, we will honour your original rate. — Great. When can we check in? — The room is ready now, so I will give you the new keys. — Anything else? — Breakfast is included with the double, served until ten, so keep your room card to enter.',
    q: [
      ['What is the problem at check-in?', 'He was given a single room but booked a double.', ['His reservation was cancelled.', 'The hotel is full.', 'He lost his booking.'], 'easy'],
      ['What does the clerk ask for?', 'The reservation number.', ['His passport.', 'His car licence plate.', 'A deposit.']],
      ['What caused the room-type change?', 'The room type changed when the dates were updated.', ['He booked the wrong room.', 'The hotel overbooked.', 'A computer crash.']],
      ['What does the clerk offer?', 'A double room on the fourth floor.', ['A refund.', 'A free upgrade to a suite.', 'A different hotel.']],
      ['Is there an extra charge?', 'No, the original rate is honoured.', ['Yes, a small fee.', 'Only for breakfast.', 'Yes, for the upgrade.']],
      ['When can the family check in?', 'Now; the room is ready.', ['After two hours.', 'The next morning.', 'After cleaning.']],
      ['What is included with the double?', 'Breakfast, served until ten.', ['Free parking.', 'A spa pass.', 'Airport pickup.']],
      ['Why should he keep his room card?', 'It is needed to enter breakfast.', ['To get a refund.', 'To unlock the pool.', 'To extend the stay.'], 'hard'],
    ],
  },
  // ---------- Daily Life Conversation (5) ----------
  {
    type: 'Daily Life Conversation',
    title: 'Weekend Road Trip',
    transcript:
      'Should we still drive to the lake this weekend? — I want to, but gas prices are high right now. — True. What if we carpool with Mia and split the cost? — Good idea. Her car is bigger anyway. — Should we leave Saturday morning or Friday night? — Saturday morning; Friday traffic is terrible. — Okay. I will pack snacks and a cooler. — I will check the weather and bring rain jackets just in case. — Do we need to book the campsite? — Yes, I will reserve it online tonight. — Perfect, this is going to be fun.',
    q: [
      ['What are they planning?', 'A weekend trip to the lake.', ['A move to a new city.', 'A birthday party.', 'A shopping trip.'], 'easy'],
      ['Why do they decide to carpool?', 'Gas prices are high, so they will split the cost.', ['Their car is broken.', 'Nobody can drive.', 'It is required.']],
      ['When will they leave?', 'Saturday morning.', ['Friday night.', 'Sunday afternoon.', 'Thursday evening.']],
      ['Why not leave Friday night?', 'Friday traffic is terrible.', ['The lake is closed.', 'It is too cold.', 'Mia is busy.']],
      ['What will one of them do tonight?', 'Reserve the campsite online.', ['Buy a new car.', 'Cancel the trip.', 'Pack the cooler.'], 'hard'],
    ],
  },
  {
    type: 'Daily Life Conversation',
    title: 'Deciding on a Gym Class',
    transcript:
      'I want to start a fitness class, but I cannot decide which one. — What are you choosing between? — A morning spin class or an evening yoga class. — Spin is a great workout, but it is at six a.m. — That is too early for me, honestly. — Then yoga might be better; it is at seven in the evening. — Yoga also helps with my back, so that is a plus. — And the evening class has more spots open. — True. I think I will sign up for yoga. — Good choice. You can try the first class for free before paying.',
    q: [
      ['What is the speaker trying to decide?', 'Which fitness class to take.', ['Which gym to join.', 'What to eat before exercise.', 'When to quit the gym.'], 'easy'],
      ['What are the two options?', 'A morning spin class or an evening yoga class.', ['Running or swimming.', 'Spin or boxing.', 'Yoga or dance.']],
      ['Why does she rule out spin?', 'It is too early at six a.m.', ['It is too expensive.', 'It hurts her knees.', 'It is full.']],
      ['What extra benefit does yoga have for her?', 'It helps with her back.', ['It is shorter.', 'It is outdoors.', 'It includes meals.']],
      ['What can she do before paying?', 'Try the first class for free.', ['Get a refund.', 'Bring a friend free.', 'Pause her membership.'], 'hard'],
    ],
  },
  {
    type: 'Daily Life Conversation',
    title: 'Splitting a Phone Plan',
    transcript:
      'Do you want to share a family phone plan with me? It is cheaper per line. — Maybe. How much would I pay? — About thirty dollars a month, instead of forty-five on my own. — That is a good saving. Do we share the data? — Yes, there is a shared pool, but we can set limits so neither of us runs out. — What if one of us uses too much? — The app sends an alert at eighty percent, so we can manage it. — Okay, who pays the bill? — One of us pays, and the other sends their share each month. — I can send mine by e-transfer. — Great, I will add you to the plan this week.',
    q: [
      ['What is being suggested?', 'Sharing a family phone plan.', ['Buying new phones.', 'Cancelling a plan.', 'Switching providers.'], 'easy'],
      ['How much would the listener pay?', 'About thirty dollars a month.', ['Forty-five dollars.', 'Sixty dollars.', 'Nothing.']],
      ['How will they avoid running out of data?', 'They will set limits on the shared pool.', ['They will buy extra data.', 'They will use Wi-Fi only.', 'They will not share data.']],
      ['What does the app do at eighty percent usage?', 'It sends an alert.', ['It cuts off service.', 'It adds a fee.', 'It pauses the line.']],
      ['How will the listener pay their share?', 'By e-transfer each month.', ['In cash weekly.', 'By cheque.', 'The other person covers it.'], 'hard'],
    ],
  },
  {
    type: 'Daily Life Conversation',
    title: 'Adopting a Pet',
    transcript:
      'I am thinking of adopting a pet from the shelter this weekend. — Exciting. Are you getting a dog or a cat? — I am leaning toward a cat, since I am at work all day. — That makes sense; cats are more independent. — The shelter has an older cat that is already litter-trained. — An older one is calmer too. — Right, and the adoption fee is lower for senior pets. — Do you need anything before bringing it home? — Just a litter box, food, and a carrier. — I can lend you my spare carrier. — Thanks. I will visit the shelter on Saturday to meet the cat first.',
    q: [
      ['What is the speaker planning to do?', 'Adopt a pet from the shelter.', ['Start a pet-sitting business.', 'Return a pet.', 'Buy a new aquarium.'], 'easy'],
      ['Why does she prefer a cat?', 'She is at work all day, and cats are more independent.', ['Cats are cheaper to feed.', 'She is allergic to dogs.', 'Her building bans dogs.']],
      ['What is good about the older cat?', 'It is already litter-trained and calmer.', ['It is very playful.', 'It is a kitten.', 'It needs no food.']],
      ['Why is the adoption fee lower?', 'It is reduced for senior pets.', ['It is a holiday sale.', 'She is a volunteer.', 'It is her first pet.']],
      ['What will the friend lend her?', 'A spare carrier.', ['A litter box.', 'Pet food.', 'Money for the fee.'], 'hard'],
    ],
  },
  {
    type: 'Daily Life Conversation',
    title: 'A Ride to the Airport',
    transcript:
      'My flight is early Monday, so I need to figure out how to get to the airport. — What time is your flight? — Six a.m., so I need to be there by four. — That is really early. The trains do not run that early. — I know. I was thinking of a taxi, but it is expensive. — I can drive you if you want; I am off Monday. — Are you sure? That is a big favour. — It is fine, I do not mind getting up early. — Thank you so much. I will buy you breakfast after. — Deal. Just text me your address the night before.',
    q: [
      ['What does the speaker need to arrange?', 'A ride to the airport.', ['A hotel near the airport.', 'A flight ticket.', 'A parking spot.'], 'easy'],
      ['What time does she need to arrive at the airport?', 'By four a.m.', ['By six a.m.', 'By noon.', 'By midnight.']],
      ['Why can she not take the train?', 'The trains do not run that early.', ['The station is closed.', 'It is too far.', 'She lost her pass.']],
      ['What does the friend offer?', 'To drive her, since he is off Monday.', ['To pay for a taxi.', 'To book a shuttle.', 'To lend his car.']],
      ['What should she do the night before?', 'Text him her address.', ['Pay him in advance.', 'Confirm the flight.', 'Pack his car.'], 'hard'],
    ],
  },
  // ---------- Information (6) ----------
  {
    type: 'Information',
    title: 'Campus Shuttle Schedule Change',
    transcript:
      'Attention students: the campus shuttle schedule is changing starting Monday. The shuttle will now run every fifteen minutes during peak hours, instead of every twenty. The first shuttle leaves the main gate at seven in the morning, and the last one departs at ten at night. Because of road work near the science building, the shuttle will skip that stop for two weeks and use the library stop instead. Please check the updated route map posted at each shelter. If the shuttle is full, another one follows shortly, so please do not crowd the doors.',
    q: [
      ['What is the announcement about?', 'A change to the campus shuttle schedule.', ['A new parking lot.', 'A bus fare increase.', 'A road closure for cars.'], 'easy'],
      ['How often will the shuttle run during peak hours?', 'Every fifteen minutes.', ['Every twenty minutes.', 'Every half hour.', 'Every five minutes.']],
      ['When does the last shuttle leave?', 'At ten at night.', ['At seven in the morning.', 'At midnight.', 'At five in the afternoon.']],
      ['Why will the shuttle skip the science building stop?', 'Because of road work.', ['Low ridership.', 'A broken shelter.', 'A holiday.']],
      ['Which stop will be used instead?', 'The library stop.', ['The main gate only.', 'The gym stop.', 'The parking lot.']],
      ['What should students do if a shuttle is full?', 'Wait for the next one, which follows shortly.', ['Crowd the doors.', 'Walk instead.', 'Call the office.'], 'hard'],
    ],
  },
  {
    type: 'Information',
    title: 'Flu Shot Clinic',
    transcript:
      'The health centre is hosting a free flu shot clinic next week. Clinics run Tuesday and Thursday from ten to four in the community hall. No appointment is needed, but bring your health card if you have one. The shot is recommended for everyone over six months old, though people who are feeling sick that day should wait and come another time. After your shot, please sit in the waiting area for fifteen minutes so staff can make sure you feel fine. Free parking is available behind the building.',
    q: [
      ['What is the announcement about?', 'A free flu shot clinic.', ['A blood donation drive.', 'A fitness class.', 'A health insurance change.'], 'easy'],
      ['When does the clinic run?', 'Tuesday and Thursday from ten to four.', ['Every day this week.', 'Only on Monday.', 'Weekends only.']],
      ['What should people bring?', 'Their health card if they have one.', ['An appointment letter.', 'A photo and fee.', 'A doctor note.']],
      ['Who should wait and come another time?', 'People who feel sick that day.', ['People over sixty-five.', 'First-time patients.', 'People with no health card.']],
      ['What should people do after the shot?', 'Sit in the waiting area for fifteen minutes.', ['Leave immediately.', 'Book a follow-up.', 'Pay at the desk.']],
      ['Where is parking available?', 'Behind the building, for free.', ['On the street only.', 'At a nearby mall.', 'There is no parking.'], 'hard'],
    ],
  },
  {
    type: 'Information',
    title: 'Move-out Cleaning Rules',
    transcript:
      'This is a reminder for tenants moving out this month. To receive your full deposit back, the apartment must be cleaned before you return the keys. This includes the oven, the fridge, and the bathroom. Please remove all personal items and take any furniture you are not leaving behind. Carpets should be vacuumed, but you do not need to shampoo them; the building handles that. Return all keys and fobs to the office by noon on your move-out day. If keys are returned late, a daily fee may be charged until they are received.',
    q: [
      ['Who is this reminder for?', 'Tenants moving out this month.', ['New tenants moving in.', 'Visitors to the building.', 'Maintenance staff.'], 'easy'],
      ['What must tenants do to get their full deposit back?', 'Clean the apartment before returning the keys.', ['Pay an extra month rent.', 'Repaint the walls.', 'Sign a new lease.']],
      ['What cleaning is the building responsible for?', 'Shampooing the carpets.', ['Cleaning the oven.', 'Cleaning the fridge.', 'Removing furniture.']],
      ['When must keys be returned?', 'By noon on the move-out day.', ['Within a week after.', 'Any time that month.', 'The night before.']],
      ['What happens if keys are returned late?', 'A daily fee may be charged.', ['The deposit doubles.', 'Nothing happens.', 'The lease continues.']],
      ['What should tenants do with furniture they are not leaving?', 'Take it with them.', ['Leave it for the next tenant.', 'Donate it to the office.', 'Store it in the hallway.'], 'hard'],
    ],
  },
  {
    type: 'Information',
    title: 'Online Banking Maintenance',
    transcript:
      'Please be aware of scheduled maintenance on our online banking system. The website and app will be unavailable this Sunday from one to five in the morning while we make security upgrades. During this time, you will not be able to log in, transfer money, or pay bills online. However, debit and credit cards will work as normal, and ATMs will stay open. We recommend completing any urgent transfers before Sunday. If you notice any unusual activity after the upgrade, contact us through the secure message centre right away.',
    q: [
      ['What is the notice about?', 'Scheduled maintenance on the online banking system.', ['A new mobile app.', 'A change to account fees.', 'A branch closure.'], 'easy'],
      ['When will the system be unavailable?', 'Sunday from one to five in the morning.', ['All day Saturday.', 'Monday evening.', 'For the whole weekend.']],
      ['What will customers be unable to do?', 'Log in, transfer money, or pay bills online.', ['Use their debit cards.', 'Withdraw from ATMs.', 'Make purchases.']],
      ['What will still work as normal?', 'Debit and credit cards, and ATMs.', ['Online transfers.', 'The mobile app.', 'Bill payments.']],
      ['What does the bank recommend?', 'Complete urgent transfers before Sunday.', ['Close the app permanently.', 'Visit a branch Sunday.', 'Change passwords first.']],
      ['What should customers do if they see unusual activity?', 'Contact the bank through the secure message centre.', ['Wait a week.', 'Reply to any email.', 'Withdraw all funds.'], 'hard'],
    ],
  },
  {
    type: 'Information',
    title: 'New Cafeteria Meal Plan',
    transcript:
      'The college is introducing a new cafeteria meal plan this term. Students can choose between two options: a flexible plan with a set dollar amount to spend anywhere on campus, or a fixed plan with a certain number of meals per week. The flexible plan is better for students with irregular schedules, while the fixed plan saves money for those who eat three meals a day. You must sign up by the end of the first week, and the plan cannot be changed until next term. Any unused flexible dollars carry over to the next term, but unused meals on the fixed plan do not.',
    q: [
      ['What is the announcement about?', 'A new cafeteria meal plan.', ['A new cafeteria building.', 'A change to class times.', 'A food safety rule.'], 'easy'],
      ['What are the two plan options?', 'A flexible dollar plan or a fixed meals-per-week plan.', ['A free plan or a paid plan.', 'A breakfast plan or a dinner plan.', 'A weekday or weekend plan.']],
      ['Who is the flexible plan better for?', 'Students with irregular schedules.', ['Students who eat three meals a day.', 'First-year students only.', 'Students who live off campus.']],
      ['By when must students sign up?', 'By the end of the first week.', ['By the end of the term.', 'Any time before exams.', 'On the first day only.']],
      ['Can the plan be changed during the term?', 'No, not until next term.', ['Yes, any time.', 'Only once a month.', 'Only with a fee.']],
      ['What is the difference in unused amounts?', 'Flexible dollars carry over, but fixed meals do not.', ['Both carry over.', 'Neither carries over.', 'Only meals carry over.'], 'hard'],
    ],
  },
  // ---------- News Item (5) ----------
  {
    type: 'News Item',
    title: 'New Recreation Centre Opening',
    transcript:
      'In local news, the city new recreation centre will open to the public next Saturday. The centre features an indoor pool, a gym, and several multipurpose rooms for community classes. Admission will be free on opening day, with tours running every hour. City officials say the centre was built to give the growing north end a closer place to exercise and gather. Memberships go on sale opening day, and residents who sign up in the first month will get a discounted rate. The centre will be open seven days a week.',
    q: [
      ['What is the news about?', 'A new recreation centre opening.', ['A pool closing.', 'A gym renovation.', 'A sports tournament.'], 'easy'],
      ['What does the centre include?', 'An indoor pool, a gym, and multipurpose rooms.', ['A library and a cafe.', 'A theatre and shops.', 'An ice rink only.']],
      ['What is special about opening day?', 'Admission is free, with hourly tours.', ['It is members only.', 'It opens at midnight.', 'Classes are cancelled.']],
      ['Why was the centre built?', 'To serve the growing north end.', ['To replace an old library.', 'To attract tourists.', 'To host competitions.']],
      ['What do residents who sign up in the first month get?', 'A discounted membership rate.', ['A free personal trainer.', 'Lifetime access.', 'A parking pass.'], 'hard'],
    ],
  },
  {
    type: 'News Item',
    title: 'Downtown Water Main Work',
    transcript:
      'A news update for downtown residents: crews will replace an aging water main on King Street starting Wednesday. During the work, water service will be shut off on King Street between First and Third Avenue from nine in the morning to three in the afternoon. Residents are advised to store some water for cooking and drinking during those hours. Businesses will stay open, but some may have reduced washroom access. The project is expected to last three days, and the city will deliver a flyer to each affected address with the exact schedule.',
    q: [
      ['What is the news about?', 'Replacing a water main on King Street.', ['A new water park.', 'A flood warning.', 'A road repaving.'], 'easy'],
      ['When will water be shut off?', 'From nine in the morning to three in the afternoon.', ['All day and night.', 'Only in the evening.', 'For the whole week.']],
      ['What are residents advised to do?', 'Store some water for cooking and drinking.', ['Boil their water.', 'Leave their homes.', 'Buy bottled water only.']],
      ['How will businesses be affected?', 'They stay open, but washroom access may be reduced.', ['They must all close.', 'They lose power.', 'They move locations.']],
      ['How will residents learn the exact schedule?', 'A flyer delivered to each affected address.', ['A phone call.', 'A radio broadcast.', 'A sign at city hall.'], 'hard'],
    ],
  },
  {
    type: 'News Item',
    title: 'City Tree-Planting Program',
    transcript:
      'Local news: the city is launching a tree-planting program to add five thousand trees over the next three years. The program aims to provide more shade, improve air quality, and help cool neighbourhoods in summer. Residents can request a free tree for the city-owned strip in front of their home by applying online. The city will plant and water the trees for the first two years, after which homeowners are asked to help with watering. Priority will go to streets with the fewest trees today.',
    q: [
      ['What is the news about?', 'A city tree-planting program.', ['A park closing.', 'A logging project.', 'A garden contest.'], 'easy'],
      ['How many trees will be added?', 'Five thousand over three years.', ['One hundred this year.', 'A million over a decade.', 'Five hundred this summer.']],
      ['What are the goals of the program?', 'More shade, better air quality, and cooler neighbourhoods.', ['More parking shade only.', 'Higher property taxes.', 'New bike lanes.']],
      ['How can residents get a free tree?', 'Apply online for the strip in front of their home.', ['Buy one at city hall.', 'Pick one up at a park.', 'Call a hotline.']],
      ['What are homeowners asked to do after two years?', 'Help with watering the trees.', ['Pay a yearly fee.', 'Trim the trees themselves.', 'Remove dead trees.'], 'hard'],
    ],
  },
  {
    type: 'News Item',
    title: 'Free Museum Sundays',
    transcript:
      'In community news, the city museum will offer free admission on the first Sunday of every month, starting next month. Officials hope the change will make the museum more accessible to families and students who cannot always afford the regular ticket price. On free Sundays, the museum expects to be busy, so visitors are encouraged to arrive early or book a time slot online. Special exhibitions that charge a separate fee are not included in the free admission. The museum cafe and gift shop will keep their normal prices.',
    q: [
      ['What is the news about?', 'Free museum admission on the first Sunday of each month.', ['A museum closing.', 'A new museum building.', 'A ticket price increase.'], 'easy'],
      ['Why is the museum offering this?', 'To make it more accessible to families and students.', ['To reduce crowds.', 'To attract tourists only.', 'To cover repair costs.']],
      ['What are visitors encouraged to do on free Sundays?', 'Arrive early or book a time slot online.', ['Bring their own food.', 'Come in the evening.', 'Visit on weekdays instead.']],
      ['What is not included in the free admission?', 'Special exhibitions with a separate fee.', ['The main galleries.', 'The whole museum.', 'The guided tours.']],
      ['What will keep normal prices?', 'The cafe and gift shop.', ['The special exhibitions only.', 'Everything in the museum.', 'The parking lot.'], 'hard'],
    ],
  },
  {
    type: 'News Item',
    title: 'New Bike-Share Program',
    transcript:
      'A new bike-share program is coming to the city this spring. Officials announced that two hundred bikes will be placed at stations across downtown and near the university. Users unlock a bike with a phone app and return it to any station. The first thirty minutes of each ride are free, and longer rides cost a small hourly fee. The program is meant to reduce short car trips and ease parking pressure. Helmets are not provided, so the city reminds riders to bring their own and follow traffic rules.',
    q: [
      ['What is the news about?', 'A new bike-share program.', ['A new bus route.', 'A car-free festival.', 'A bike race.'], 'easy'],
      ['How many bikes will there be?', 'Two hundred, across downtown and near the university.', ['Fifty, downtown only.', 'A thousand citywide.', 'Twenty, at the park.']],
      ['How do users unlock a bike?', 'With a phone app.', ['With a key from a station.', 'With a membership card only.', 'With cash at a kiosk.']],
      ['What is free with each ride?', 'The first thirty minutes.', ['The whole first day.', 'Rides under an hour.', 'Weekend rides.']],
      ['What does the city remind riders about?', 'To bring their own helmet and follow traffic rules.', ['To return bikes by night.', 'To pay a deposit.', 'To register in person.'], 'hard'],
    ],
  },
  // ---------- Discussion (8) ----------
  {
    type: 'Discussion',
    title: 'Choosing a Charity for a Fundraiser',
    transcript:
      'We need to choose a charity for this year office fundraiser. — I think we should support the local food bank; it helps people right here. — That is a strong choice. Demand there is high in winter. — I was thinking of the animal shelter, though; staff really love that cause. — Both are good. How do we decide? — Maybe we let staff vote between the two finalists. — A vote is fair, and it gets people involved. — As the organizer, I suggest we shortlist those two and open a vote next week. — That works for me. — Same here, voting will boost participation. — Good. I will set up the online poll and announce the winner on Friday.',
    q: [
      ['What are the coworkers deciding?', 'Which charity to support for the fundraiser.', ['How much to donate personally.', 'When to hold a party.', 'Who will lead the team.'], 'easy'],
      ['What does the first speaker suggest?', 'The local food bank.', ['The animal shelter.', 'A hospital.', 'A school.']],
      ['Why is the food bank a strong choice?', 'Demand there is high in winter.', ['It is the cheapest option.', 'It is far away.', 'It needs volunteers only.']],
      ['What does the second speaker prefer?', 'The animal shelter.', ['The food bank.', 'A library fund.', 'A sports club.']],
      ['How do they decide to choose?', 'Let staff vote between the two finalists.', ['The manager decides alone.', 'Flip a coin.', 'Choose both equally.']],
      ['Why is a vote a good idea?', 'It is fair and gets people involved.', ['It is faster than a meeting.', 'It avoids any cost.', 'It is required by policy.']],
      ['What does the organizer propose?', 'Shortlist the two and open a vote next week.', ['Donate to both now.', 'Cancel the fundraiser.', 'Pick the food bank without a vote.']],
      ['What will the organizer do next?', 'Set up an online poll and announce the winner Friday.', ['Collect cash donations.', 'Email both charities.', 'Book a venue.'], 'hard'],
    ],
  },
  {
    type: 'Discussion',
    title: 'Workplace Recycling Program',
    transcript:
      'Let us talk about starting a recycling program in the office. — The first step is putting clearly labelled bins in the kitchen and by the printers. — Good, but labels alone will not work if people are not sure what goes where. — Then we could add a short guide above each bin. — A guide helps. What about the coffee cups? — Most of ours are not recyclable, so maybe we switch to compostable ones. — That costs a bit more, but it is worth it. — As the office manager, I suggest we start with labelled bins and guides, then review the cup change next month. — Sounds reasonable. — Agreed, one step at a time. — Good. I will order the bins and draft the guides this week.',
    q: [
      ['What are the coworkers planning?', 'Starting an office recycling program.', ['Buying new printers.', 'Redesigning the kitchen.', 'Hiring cleaners.'], 'easy'],
      ['What is the first step suggested?', 'Putting clearly labelled bins in the kitchen and by the printers.', ['Banning paper.', 'Hiring a recycling company.', 'Removing the bins.']],
      ['What concern is raised about labels?', 'People may not be sure what goes where.', ['Labels are too expensive.', 'Labels fall off.', 'Nobody reads English.']],
      ['What is suggested to help with sorting?', 'A short guide above each bin.', ['A weekly email.', 'A staff meeting.', 'A fine for mistakes.']],
      ['What is the problem with the coffee cups?', 'Most are not recyclable.', ['They are too expensive.', 'They leak.', 'They are reused too often.']],
      ['What solution is suggested for cups?', 'Switch to compostable ones.', ['Stop serving coffee.', 'Charge for cups.', 'Use paper plates.']],
      ['What does the office manager propose?', 'Start with bins and guides, then review the cup change next month.', ['Do everything at once.', 'Only change the cups.', 'Wait until next year.']],
      ['What will the manager do this week?', 'Order the bins and draft the guides.', ['Buy compostable cups.', 'Survey all staff.', 'Hire a consultant.'], 'hard'],
    ],
  },
  {
    type: 'Discussion',
    title: 'Planning a Class Field Trip',
    transcript:
      'We need to plan the class field trip. — The science museum is a popular choice, and it fits the curriculum. — It does, but it is an hour away, so we would need a full day. — The aquarium is closer and also educational. — True, and it has a student discount. — How many chaperones do we need? — At least one adult for every ten students. — We should send permission forms home early so parents have time. — Good point. Let us pick the aquarium since it is closer and cheaper. — As the teacher, I will book the date and arrange the bus. — I will prepare the permission forms. — Great, let us aim for the third week of the month.',
    q: [
      ['What are the speakers planning?', 'A class field trip.', ['A parent meeting.', 'A school fair.', 'A sports day.'], 'easy'],
      ['Why is the science museum a concern?', 'It is an hour away and needs a full day.', ['It is too expensive.', 'It is closed.', 'It does not fit the curriculum.']],
      ['What is an advantage of the aquarium?', 'It is closer and has a student discount.', ['It is free.', 'It is open at night.', 'It allows pets.']],
      ['How many chaperones are needed?', 'One adult for every ten students.', ['One for the whole class.', 'Two per student.', 'None.']],
      ['Why send permission forms home early?', 'So parents have time to return them.', ['To collect money first.', 'To choose the date.', 'To advertise the trip.']],
      ['Which destination do they choose?', 'The aquarium, because it is closer and cheaper.', ['The science museum.', 'A local park.', 'The library.']],
      ['What will the teacher arrange?', 'The date and the bus.', ['The permission forms.', 'The lunch menu.', 'The chaperone list.']],
      ['When do they aim to go?', 'The third week of the month.', ['The first day of the month.', 'Next semester.', 'During the holidays.'], 'hard'],
    ],
  },
  {
    type: 'Discussion',
    title: 'Allowing Pets in the Office',
    transcript:
      'Today we are discussing whether to allow staff to bring pets to the office. — I love the idea; a calm dog can reduce stress. — I agree it sounds nice, but some people have allergies. — That is my worry too. — We could limit it to one designated pet-friendly area. — And require that pets be quiet and well-behaved. — What about people who are afraid of dogs? — They could avoid that area, and we would keep it away from the main desks. — As the manager, I suggest a one-month trial with a single pet-friendly zone and clear rules. — That seems fair. — Agreed, a trial lets us see if it works. — Good. I will write the guidelines and ask for feedback after the trial.',
    q: [
      ['What is being discussed?', 'Whether to allow pets in the office.', ['Buying office plants.', 'A new dress code.', 'Remote work.'], 'easy'],
      ['What benefit is mentioned?', 'A calm dog can reduce stress.', ['Pets save money.', 'Pets boost sales.', 'Pets clean the office.']],
      ['What is the main concern?', 'Some people have allergies.', ['Pets are expensive.', 'Pets need walking.', 'The office is small.']],
      ['What limit is suggested?', 'One designated pet-friendly area.', ['Only cats allowed.', 'Pets only on Fridays.', 'One pet per person.']],
      ['What rule is proposed for pets?', 'They must be quiet and well-behaved.', ['They must wear tags.', 'They must stay outside.', 'They must be small.']],
      ['What about people afraid of dogs?', 'They can avoid the area, kept away from main desks.', ['They must work from home.', 'They get headphones.', 'They choose the pets.']],
      ['What does the manager propose?', 'A one-month trial with a single pet-friendly zone and clear rules.', ['Allowing pets everywhere now.', 'Banning pets entirely.', 'A vote with no trial.']],
      ['What will the manager do?', 'Write the guidelines and ask for feedback after the trial.', ['Buy pet supplies.', 'Hire a pet sitter.', 'Remove the desks.'], 'hard'],
    ],
  },
  {
    type: 'Discussion',
    title: 'Choosing Team Software',
    transcript:
      'We need to choose a new tool to manage our projects. — I have used one that is simple and cheap, but it lacks reporting features. — Reporting matters for our monthly reviews. — There is another that has great reports, but it has a steep learning curve. — A hard tool could slow us down at first. — Maybe we pick the powerful one but plan a training session. — Training would help everyone start on the same page. — What about the cost? — It is higher, but the reporting saves us hours each month. — As team lead, I suggest the powerful tool plus a one-hour training for everyone. — That works for me. — Agreed, the time saved is worth it. — Good. I will start a free trial and book the training.',
    q: [
      ['What are the coworkers choosing?', 'A new tool to manage projects.', ['A new office.', 'A team name.', 'A meeting time.'], 'easy'],
      ['What is the drawback of the simple, cheap tool?', 'It lacks reporting features.', ['It is too expensive.', 'It is hard to learn.', 'It is slow.']],
      ['Why does reporting matter to them?', 'It is needed for monthly reviews.', ['It impresses clients.', 'It is required by law.', 'It saves storage.']],
      ['What is the downside of the powerful tool?', 'It has a steep learning curve.', ['It has no reports.', 'It is free but limited.', 'It is offline only.']],
      ['How do they plan to handle the learning curve?', 'Plan a training session.', ['Hire new staff.', 'Use both tools.', 'Skip the hard features.']],
      ['How is the higher cost justified?', 'The reporting saves hours each month.', ['It comes with free phones.', 'It is on sale.', 'It includes a laptop.']],
      ['What does the team lead suggest?', 'The powerful tool plus a one-hour training.', ['The cheap tool only.', 'No new tool.', 'Two tools at once.']],
      ['What will the team lead do next?', 'Start a free trial and book the training.', ['Buy the tool immediately.', 'Cancel the reviews.', 'Ask clients to choose.'], 'hard'],
    ],
  },
  // ---------- Viewpoints (6) ----------
  {
    type: 'Viewpoints',
    title: 'Self-Checkout Machines',
    transcript:
      'Shoppers shared their opinions on self-checkout machines in grocery stores. Supporters said the machines are faster for small baskets and reduce long lineups at busy times. One shopper liked being able to bag her own groceries at her own pace. Critics, however, had concerns. Some said the machines often have errors that need a staff member anyway. Others worried that self-checkouts reduce the number of cashier jobs. A few older shoppers said the screens are confusing and they prefer a friendly face. Several people suggested keeping a mix of both, so customers can choose.',
    q: [
      ['What is the topic?', 'Self-checkout machines in grocery stores.', ['Online grocery delivery.', 'A new store opening.', 'Higher food prices.'], 'easy'],
      ['What do supporters like?', 'They are faster for small baskets and reduce lineups.', ['They give discounts.', 'They never break.', 'They bag groceries automatically.']],
      ['What did one shopper enjoy?', 'Bagging her own groceries at her own pace.', ['Talking to the cashier.', 'Getting free samples.', 'Paying in cash.']],
      ['What problem do critics mention?', 'The machines often have errors that need staff.', ['They are too slow.', 'They only take cash.', 'They are too far apart.']],
      ['What job concern is raised?', 'Self-checkouts reduce cashier jobs.', ['They need more managers.', 'They lower wages.', 'They require training fees.']],
      ['What do several people suggest?', 'Keeping a mix of both so customers can choose.', ['Removing all machines.', 'Using machines only.', 'Charging to use them.'], 'hard'],
    ],
  },
  {
    type: 'Viewpoints',
    title: 'Four-Day Work Week',
    transcript:
      'Listeners debated the idea of a four-day work week, where staff work longer days but get an extra day off. Supporters were enthusiastic. They said a long weekend improves rest, family time, and overall happiness. One business owner reported that productivity stayed the same after the switch. Critics were not sure. Some worried that ten-hour days would be too tiring. Others said certain jobs, like customer service, need coverage five days a week. A few callers suggested it works for some roles but not all, and that companies should test it before committing.',
    q: [
      ['What is the topic?', 'A four-day work week.', ['A four-day school week.', 'Working from home.', 'Unpaid overtime.'], 'easy'],
      ['What do supporters say?', 'A long weekend improves rest, family time, and happiness.', ['It increases pay.', 'It cuts commuting costs only.', 'It adds more holidays.']],
      ['What did one business owner report?', 'Productivity stayed the same after the switch.', ['Sales doubled.', 'Staff quit.', 'Costs dropped sharply.']],
      ['What concern do critics raise about the days?', 'Ten-hour days could be too tiring.', ['Days would be too short.', 'Pay would fall.', 'Offices would close.']],
      ['What coverage problem is mentioned?', 'Some jobs need coverage five days a week.', ['Factories cannot run.', 'Schools would close.', 'Stores would lose stock.']],
      ['What do a few callers suggest?', 'It works for some roles, and companies should test it first.', ['It should be law for everyone.', 'It never works.', 'Only managers should try it.'], 'hard'],
    ],
  },
  {
    type: 'Viewpoints',
    title: 'Car-Free Downtown',
    transcript:
      'We asked residents about a plan to ban cars from the downtown core on weekends. Supporters welcomed it. They said car-free streets are safer for pedestrians, quieter, and good for outdoor cafes and markets. One shop owner said foot traffic and sales rose during a recent trial weekend. Critics were doubtful. Some worried that people with mobility issues would find it harder to reach shops. Others said delivery trucks still need access. A few suggested a compromise: close the streets to most cars but allow deliveries early in the morning and keep accessible parking nearby.',
    q: [
      ['What is the plan being discussed?', 'Banning cars from downtown on weekends.', ['Building a new highway.', 'Adding more parking.', 'A new car-share service.'], 'easy'],
      ['What do supporters say?', 'Car-free streets are safer, quieter, and good for cafes and markets.', ['They lower taxes.', 'They speed up traffic.', 'They add parking.']],
      ['What did one shop owner report?', 'Foot traffic and sales rose during a trial weekend.', ['Sales dropped sharply.', 'Nothing changed.', 'Rent went up.']],
      ['What accessibility concern is raised?', 'People with mobility issues may find it harder to reach shops.', ['Streets would be too narrow.', 'Cafes would close.', 'Bikes would crowd the area.']],
      ['What practical need is mentioned?', 'Delivery trucks still need access.', ['Taxis must be banned too.', 'Buses cannot run.', 'Shops need parking lots.']],
      ['What compromise is suggested?', 'Allow deliveries early and keep accessible parking nearby.', ['Ban all vehicles permanently.', 'Allow all cars as before.', 'Close downtown every day.'], 'hard'],
    ],
  },
  {
    type: 'Viewpoints',
    title: 'Tipping Culture',
    transcript:
      'Callers shared their views on tipping at restaurants. Some defended the practice, saying tips reward good service and help servers earn a fair income. One server said tips make up a large part of her pay. Others were critical. They argued that tipping should not replace fair wages, and that it puts pressure on customers. A few said suggested tip amounts on machines have crept too high. One caller proposed that restaurants raise menu prices slightly and pay staff more, removing the need to tip. Opinions varied, and there was no clear agreement.',
    q: [
      ['What is the topic?', 'Tipping at restaurants.', ['Restaurant health rules.', 'Menu prices only.', 'Online food orders.'], 'easy'],
      ['What do defenders say?', 'Tips reward good service and help servers earn a fair income.', ['Tips lower menu prices.', 'Tips are required by law.', 'Tips speed up service.']],
      ['What did one server say?', 'Tips make up a large part of her pay.', ['She prefers no tips.', 'Tips are taxed twice.', 'She splits tips equally.']],
      ['What do critics argue?', 'Tipping should not replace fair wages.', ['Tipping is illegal.', 'Servers earn too much.', 'Tips should be bigger.']],
      ['What complaint about machines is mentioned?', 'Suggested tip amounts have crept too high.', ['Machines are slow.', 'Machines hide the total.', 'Machines reject cash.']],
      ['What does one caller propose?', 'Raise menu prices slightly and pay staff more, removing tipping.', ['Ban tipping by law.', 'Double all tips.', 'Let owners keep tips.'], 'hard'],
    ],
  },
  {
    type: 'Viewpoints',
    title: 'Free Public Transit',
    transcript:
      'We invited listeners to weigh in on making public transit free for everyone. Supporters were enthusiastic. They said free transit would cut traffic, reduce pollution, and help people who cannot afford fares. One student said it would make getting to class much easier. Critics raised questions. Some asked how the city would pay for it without raising taxes. Others worried that buses would become too crowded. A few suggested a middle path: free transit for students and seniors first, then expand if the budget allows. The discussion showed both excitement and caution.',
    q: [
      ['What is the topic?', 'Making public transit free for everyone.', ['Raising transit fares.', 'Building a subway.', 'Banning cars.'], 'easy'],
      ['What benefits do supporters mention?', 'Less traffic, less pollution, and help for people who cannot afford fares.', ['Faster buses only.', 'More parking.', 'Higher wages.']],
      ['What did one student say?', 'It would make getting to class much easier.', ['It would be too crowded.', 'He prefers driving.', 'It would not help him.']],
      ['What funding question do critics raise?', 'How the city would pay for it without raising taxes.', ['Where buses would park.', 'Who would drive the buses.', 'How fast buses would go.']],
      ['What other worry is mentioned?', 'Buses would become too crowded.', ['Buses would be empty.', 'Routes would close.', 'Fares would rise.']],
      ['What middle path is suggested?', 'Free transit for students and seniors first, then expand.', ['Free transit for tourists only.', 'No free transit at all.', 'Free transit at night only.'], 'hard'],
    ],
  },
]

const ALL_SEEDS = [...SEEDS, ...extraSeeds, ...extraSeeds2, ...generateMassiveSeeds()]

const output = ALL_SEEDS.map((seed, index) => ({
  id: `ls-gen-${String(index + 1).padStart(2, '0')}`,
  type: seed.type,
  title: seed.title,
  transcript: seed.transcript,
  source: seed.source || 'Original CELPIP Format',
  questions: seed.q.map(buildQuestion),
}))

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8')
console.log(`Wrote ${output.length} generated CELPIP Listening mocks to ${outputPath}`)
